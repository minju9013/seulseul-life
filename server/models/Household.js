const mongoose = require('mongoose');

const { Schema } = mongoose;

// "가구(집)" 단위. 품목/재고/카테고리 설정이 모두 이 가구에 소속된다.
// 한 가구에는 여러 사용자가 속할 수 있다(2단계 공유 기능에서 활용).
const householdSchema = new Schema(
  {
    name: { type: String, trim: true, default: '우리 집' },
    // 가구를 만든 사용자
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // 초대 코드 (2단계 공유 기능에서 사용). 없을 수 있어 sparse unique.
    inviteCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Household', householdSchema);
