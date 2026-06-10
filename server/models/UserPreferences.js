const mongoose = require('mongoose');

const { Schema } = mongoose;

// 가구별 카테고리 설정(커스텀 카테고리/내장 카테고리 override/정렬 순서).
// 가구당 1개의 문서를 가진다.
const userPreferencesSchema = new Schema(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      unique: true,
      index: true,
    },
    customCategories: { type: Schema.Types.Mixed, default: [] },
    overrides: { type: Schema.Types.Mixed, default: {} },
    categoryOrder: { type: [String], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
