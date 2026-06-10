const UserPreferences = require('../models/UserPreferences');

// GET /api/preferences
// 현재 가구의 카테고리 설정을 반환 (없으면 빈 기본값)
async function getPreferences(req, res, next) {
  try {
    const doc = await UserPreferences.findOne({ householdId: req.householdId }).lean();
    if (!doc) {
      return res.json({
        customCategories: [],
        overrides: {},
        categoryOrder: [],
      });
    }
    return res.json({
      customCategories: Array.isArray(doc.customCategories) ? doc.customCategories : [],
      overrides: doc.overrides && typeof doc.overrides === 'object' ? doc.overrides : {},
      categoryOrder: Array.isArray(doc.categoryOrder) ? doc.categoryOrder : [],
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    return next(err);
  }
}

// PUT /api/preferences
// 현재 가구의 카테고리 설정을 저장 (없으면 생성)
async function putPreferences(req, res, next) {
  try {
    const { customCategories, overrides, categoryOrder } = req.body;

    const doc = await UserPreferences.findOneAndUpdate(
      { householdId: req.householdId },
      {
        $set: {
          customCategories: Array.isArray(customCategories) ? customCategories : [],
          overrides: overrides && typeof overrides === 'object' ? overrides : {},
          categoryOrder: Array.isArray(categoryOrder) ? categoryOrder : [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getPreferences,
  putPreferences,
};
