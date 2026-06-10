const express = require('express');
const { getMe } = require('../controllers/authController');

// 인증 관련 라우터 (requireAuth + attachHousehold 는 app.js 에서 적용)
const router = express.Router();

// GET /api/auth/me
router.get('/me', getMe);

module.exports = router;
