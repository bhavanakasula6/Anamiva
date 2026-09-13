require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const User = require("./models/user");
const app = require("./app");
const { initSocket } = require("./sockets/socket");

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("🚀 MedApp Backend Running Successfully");
});
/* =========================
   DATABASE CONNECTION
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .then(async () => {
    await User.collection.updateMany(
      { phoneNumber: null },
      { $unset: { phoneNumber: "" } }
    );

    const indexes = await User.collection.indexes();
    const phoneIndex = indexes.find(index => index.name === "phoneNumber_1");
    if (phoneIndex && !phoneIndex.sparse) {
      await User.collection.dropIndex("phoneNumber_1");
    }

    await User.collection.createIndex(
      { phoneNumber: 1 },
      { name: "phoneNumber_1", unique: true, sparse: true }
    );
    console.log("User phone index ready");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

/* =========================
   HTTP + SOCKET SERVER
========================= */
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

/* =========================
   START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`🚀 MedApp server running on port ${PORT}`);
});
  
