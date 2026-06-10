const mongoose = require('mongoose');

// Mongoose Schema 생성에 사용할 헬퍼
const { Schema } = mongoose;

// 재고로 관리할 "물건(아이템)" 기본 정보 스키마
const itemSchema = new Schema(
  {
    // 이 품목이 속한 가구
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true,
    },
    // 아이템 이름 (예: 샴푸, 키친타월)
    name: { type: String, required: true, trim: true },
    // 내장 id 또는 custom_* 커스텀 카테고리 id (컨트롤러에서 검증)
    categoryId: {
      type: String,
      required: true,
      trim: true,
    },
    // 아이템 이미지 URL (Cloudinary secure_url)
    image: { type: String },
    // 이미지 삭제용 Cloudinary public_id
    imagePublicId: { type: String },
    // 단위 (예: '개', 'ml', 'g')
    unit: { type: String, default: '개' },
    // 이 수량 이하이면 '부족'으로 표시 (기본 1 → 수량 2부터 넉넉)
    lowStockThreshold: { type: Number, default: 1, min: 1, max: 99 },
    // 사용자 메모 (선택)
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    // 리스트 정렬용 임의 순서 값
    order: { type: Number },
  },
  {
    // createdAt, updatedAt 자동 관리
    timestamps: true,
  },
);

// 같은 가구 + 같은 카테고리 내 동일 이름의 품목 중복 등록 방지
// (가구별로 격리되므로 다른 가구는 같은 이름을 가질 수 있다)
itemSchema.index({ householdId: 1, categoryId: 1, name: 1 }, { unique: true });

// Item 컬렉션으로 등록
module.exports = mongoose.model('Item', itemSchema);
