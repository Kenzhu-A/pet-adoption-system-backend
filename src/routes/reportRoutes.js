// [REPORTS] content report routes
const express = require('express');
const router = express.Router();
const { createReport, getAllReports, dismissReport, deleteReportedContent } = require('../controllers/reportController');

router.post('/', createReport);                       // submit a report
router.get('/', getAllReports);                       // admin: list all reports
router.delete('/:id', dismissReport);                // admin: dismiss report only
router.delete('/:id/content', deleteReportedContent); // admin: delete reported content + report

module.exports = router;
