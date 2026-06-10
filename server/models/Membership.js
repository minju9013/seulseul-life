const mongoose = require('mongoose');

const { Schema } = mongoose;

// 사용자 ↔ 가구의 다대다 연결.
// 1단계에서는 사용자당 1개의 가구만 갖지만, 모델은 공유(여러 멤버)를 미리 지원한다.
const membershipSchema = new Schema(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
  },
  { timestamps: true },
);

// 같은 사용자가 같은 가구에 중복 가입되지 않도록
membershipSchema.index({ householdId: 1, userId: 1 }, { unique: true });
// 사용자별 소속 조회용
membershipSchema.index({ userId: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
