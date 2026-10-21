const Notification = require('../models/notification');
const User = require('../models/user');

const preferenceForType = {
  appointment: 'appointmentNotifications',
  emergency: 'emergencyNotifications',
  medication: 'medicalRecordNotifications',
  'medical-record': 'medicalRecordNotifications',
  prescription: 'medicalRecordNotifications',
};

const sendExpoPushNotifications = async (user, notification) => {
  const preferences = user?.notificationPreferences || {};
  const preferenceKey = preferenceForType[notification.type];
  if (preferences.notifications === false || (preferenceKey && preferences[preferenceKey] === false)) return;

  const tokens = (user?.pushTokens || []).map((entry) => entry.token).filter(Boolean);
  if (!tokens.length || typeof fetch !== 'function') return;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: notification.title,
    body: notification.message,
    data: notification.data || {},
    channelId: 'default',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo push request failed with status ${response.status}`);
};

exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    const notificationData = {
      ...(notification.data || {}),
      notificationId: notification._id.toString(),
      type: notification.type,
    };
    if (Object.keys(notificationData).length) {
      notification.data = notificationData;
      await notification.save();
    }
    try {
      const { getIO } = require('../sockets/socket');
      getIO().to(`user_${data.userId.toString()}`).emit('notification-created', notification);
    } catch (socketError) {
      console.warn('Notification socket emit failed:', socketError.message);
    }
    try {
      const user = await User.findById(data.userId).select('notificationPreferences pushTokens');
      await sendExpoPushNotifications(user, notification);
    } catch (pushError) {
      console.warn('Expo push notification failed:', pushError.message);
    }
    return notification;
  } catch (error) {
    console.error('Create notification failed:', error.message);
    return null;
  }
};

exports.getUserNotifications = async (userId) => {
  return Notification.find({ userId });
};

exports.markAsRead = async (id) => {
  return Notification.findByIdAndUpdate(id, { read: true });
};
