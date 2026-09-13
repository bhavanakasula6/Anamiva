const Notification = require('../models/notification');

exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    try {
      const { getIO } = require('../sockets/socket');
      getIO().to(`user_${data.userId.toString()}`).emit('notification-created', notification);
    } catch (socketError) {
      console.warn('Notification socket emit failed:', socketError.message);
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
