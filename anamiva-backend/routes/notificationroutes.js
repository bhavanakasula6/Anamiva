const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationcontroller');
const protect = require('../middlewares/authmiddleware');

// GET /api/notifications - List notifications (with unread count)
router.get('/', protect, notificationController.getNotifications);
router.get('/preferences', protect, notificationController.getPreferences);
router.patch('/preferences', protect, notificationController.updatePreferences);
router.post('/push-token', protect, notificationController.registerPushToken);
router.delete('/push-token', protect, notificationController.removePushToken);

// PATCH /api/notifications/:notificationId/read - Mark as read
router.patch('/:id/read', protect, notificationController.markAsRead);

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', protect, notificationController.markAllAsRead);

module.exports = router;
