const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { protect, checkAccountAccess } = require('../middleware/authMiddleware');

// Lấy danh sách phiên livestream của một tài khoản - kiểm tra quyền truy cập tài khoản
router.get('/:accountId', protect, checkAccountAccess, sessionController.getAccountSessions);

// Lấy thông tin chi tiết của một phiên livestream - kiểm tra quyền truy cập tài khoản
router.get('/:accountId/:sessionId', protect, checkAccountAccess, sessionController.getSessionDetail);

module.exports = router; 