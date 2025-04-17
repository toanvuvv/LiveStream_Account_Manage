const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// Lấy danh sách báo cáo từ cache - yêu cầu đăng nhập
router.get('/', protect, reportController.getReports);

// Fetch dữ liệu báo cáo mới từ API - yêu cầu đăng nhập
router.post('/fetch', protect, reportController.fetchReports);

// Lấy kết quả fetch từ hàng đợi - yêu cầu đăng nhập
router.get('/fetch-results', protect, reportController.getFetchResults);

// Xuất báo cáo ra Excel - yêu cầu đăng nhập
router.get('/export', protect, reportController.exportReports);

// Lấy danh sách kênh - yêu cầu đăng nhập
router.get('/channels', protect, reportController.getChannels);

// Lấy dữ liệu chuyển đổi từ API v3/report/list - yêu cầu đăng nhập
router.post('/conversion', protect, reportController.fetchConversionData);

// Lấy dữ liệu đối soát từ API billing_list - yêu cầu đăng nhập
router.post('/settlement', protect, reportController.fetchSettlementData);

// Lấy trạng thái fetch dữ liệu - yêu cầu đăng nhập
router.get('/fetch-status', protect, reportController.getFetchStatus);

// Thêm route mới cho API fetchValidSettlementPeriods
router.post('/settlement-periods', reportController.fetchValidSettlementPeriods);

module.exports = router; 