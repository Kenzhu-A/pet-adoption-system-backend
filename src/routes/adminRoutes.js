const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/stats', adminController.getDashboardStats);
router.get('/announcements', adminController.getAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);
router.get('/posts', adminController.getAllSystemPosts);
router.delete('/posts/:id', adminController.deleteSystemPost);
router.get('/logs', adminController.getActivityLogs);
router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/lost-and-found', adminController.getAllLostFoundReports);
router.delete('/lost-and-found/:id', adminController.deleteLostFoundReport);

module.exports = router;