const express = require('express');
const router = express.Router();
const multer = require('multer');
const lostAndFoundController = require('../controllers/lostAndFoundController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/create', lostAndFoundController.createReport);
router.get('/', lostAndFoundController.getReports);
router.put('/resolve/:reportId', lostAndFoundController.resolveReport);
router.post('/image', upload.single('report_image'), lostAndFoundController.uploadReportImage);

module.exports = router;