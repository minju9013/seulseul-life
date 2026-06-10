// 인증/가구 관련 조회
const Household = require('../models/Household');

// GET /api/auth/me
// - requireAuth + attachHousehold 를 거치면서 사용자/가구가 보장된다.
// - 현재 로그인한 사용자와 소속 가구 정보를 반환한다.
async function getMe(req, res, next) {
  try {
    const household = await Household.findById(req.householdId).lean();
    res.json({
      user: {
        id: String(req.user._id),
        email: req.user.email || null,
        name: req.user.name || null,
      },
      household: household
        ? { id: String(household._id), name: household.name }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
};
