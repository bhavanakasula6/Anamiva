const Notification = require('../models/notification');
const User = require('../models/user');

const DEFAULT_PREFERENCES = {
  notifications: true,
  appointmentNotifications: true,
  medicalRecordNotifications: true,
  emergencyNotifications: true,
};

/* =========================
   GET NOTIFICATIONS (with unread count)
========================= */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   MARK SINGLE AS READ
========================= */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   MARK ALL AS READ
========================= */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    res.json({ success: true, preferences: { ...DEFAULT_PREFERENCES, ...(user?.notificationPreferences || {}) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const preferences = {};
    Object.keys(DEFAULT_PREFERENCES).forEach((key) => {
      if (typeof req.body?.[key] === 'boolean') preferences[key] = req.body[key];
    });
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { notificationPreferences: preferences } },
      { new: true, runValidators: true }
    ).select('notificationPreferences');
    res.json({ success: true, preferences: { ...DEFAULT_PREFERENCES, ...(user?.notificationPreferences || {}) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Push token is required' });
    }
    await User.updateMany({ 'pushTokens.token': token }, { $pull: { pushTokens: { token } } });
    await User.findByIdAndUpdate(req.user.id, {
      $push: { pushTokens: { token, platform, updatedAt: new Date() } },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removePushToken = async (req, res) => {
  try {
    const token = req.body?.token;
    if (token) await User.findByIdAndUpdate(req.user.id, { $pull: { pushTokens: { token } } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
