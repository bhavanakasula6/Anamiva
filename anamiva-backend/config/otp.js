const crypto = require("crypto");
const redis = require("redis");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const {
  REDIS_URL,
  OTP_EXPIRES_IN,
  OTP_LENGTH,
  AWS_REGION,
  AWS_SES_FROM_EMAIL,
  AWS_SES_CONFIGURATION_SET,
} = require("./env");

const client = redis.createClient({ url: REDIS_URL });
client.on("error", err => console.error("Redis Error:", err.message));
const redisReady = client.connect()
  .then(() => console.log("Redis connected"))
  .catch((error) => {
    console.error("Redis connection failed:", error.message);
    throw error;
  });

const ensureRedis = async () => {
  await redisReady;
  if (!client.isReady) throw new Error("OTP service is temporarily unavailable");
};

const ses = new SESv2Client({ region: AWS_REGION });
const OTP_TTL = Number(OTP_EXPIRES_IN) || 300;
const OTP_DIGITS = Number(OTP_LENGTH) || 6;
const normalizeEmail = email => String(email || "").trim().toLowerCase();
const emailKey = email => normalizeEmail(email).replace(/[^a-z0-9]/g, "_");
const hashOtp = otp => crypto.createHash("sha256").update(String(otp)).digest("hex");

const makeOtp = () => {
  const minimum = 10 ** (OTP_DIGITS - 1);
  const maximum = 10 ** OTP_DIGITS;
  return String(crypto.randomInt(minimum, maximum));
};

const sendEmailOtp = async (email, otp) => {
  if (!AWS_SES_FROM_EMAIL) {
    const error = new Error("AWS_SES_FROM_EMAIL is required");
    error.statusCode = 500;
    throw error;
  }

  const command = new SendEmailCommand({
    FromEmailAddress: AWS_SES_FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    ConfigurationSetName: AWS_SES_CONFIGURATION_SET || undefined,
    Content: {
      Simple: {
        Subject: { Data: "Your Anamiva verification code", Charset: "UTF-8" },
        Body: {
          Text: {
            Data: `Your Anamiva verification code is ${otp}. It expires in ${Math.ceil(OTP_TTL / 60)} minutes.`,
            Charset: "UTF-8",
          },
          Html: {
            Data: `<p>Your Anamiva verification code is <strong>${otp}</strong>.</p><p>It expires in ${Math.ceil(OTP_TTL / 60)} minutes.</p>`,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  return ses.send(command);
};

const sendOTP = async email => {
  await ensureRedis();
  const normalized = normalizeEmail(email);
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    const error = new Error("Enter a valid email address");
    error.statusCode = 400;
    throw error;
  }

  const key = emailKey(normalized);
  const lockKey = `otp_inflight:${key}`;
  const lockAcquired = await client.set(lockKey, "1", { NX: true, EX: 10 });
  if (!lockAcquired) {
    const error = new Error("An OTP is already being sent. Please wait a moment and try again.");
    error.statusCode = 429;
    throw error;
  }

  try {
    const rateKey = `otp_rate:${key}`;
    const requestCount = Number(await client.get(rateKey)) || 0;
    if (requestCount >= 3) {
      const error = new Error("Too many OTP requests. Please try again later.");
      error.statusCode = 429;
      throw error;
    }

    const otp = makeOtp();
    await client.set(`otp:${key}`, hashOtp(otp), { EX: OTP_TTL });
    try {
      await sendEmailOtp(normalized, otp);
    } catch (error) {
      console.error("AWS SES OTP send failed:", {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
      });
      throw error;
    }
    const newCount = await client.incr(rateKey);
    if (newCount === 1) await client.expire(rateKey, 3600);
    console.log(`Email OTP sent successfully to ${normalized}`);
    return true;
  } finally {
    await client.del(lockKey);
  }
};

const verifyOTP = async (email, otp) => {
  await ensureRedis();
  const normalized = normalizeEmail(email);
  if (!normalized || !otp) return false;

  const key = `otp:${emailKey(normalized)}`;
  const storedHash = await client.get(key);
  if (!storedHash || storedHash !== hashOtp(String(otp).trim())) return false;

  await client.del(key);
  return true;
};

module.exports = { sendOTP, verifyOTP };
