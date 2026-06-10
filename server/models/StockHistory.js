const mongoose = require('mongoose');

// Mongoose Schema 생성에 사용할 헬퍼
const { Schema } = mongoose;

// 재고 수량 변경 이력을 쌓는 스키마
const stockHistorySchema = new Schema(
  {
    // 이 이력이 속한 가구
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true,
    },
    // 어떤 아이템의 재고가 변경되었는지 (Item 컬렉션 참조)
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    // 변경 전 수량
    quantityBefore: { type: Number, required: true },
    // 변경 후 수량
    quantityAfter: { type: Number, required: true },
    // 언제 변경됐는지 (기본값: 현재 시각)
    changedAt: { type: Date, default: Date.now },
  },
  {
    // createdAt, updatedAt 은 굳이 쓰지 않기 때문에 비활성화
    timestamps: false,
  },
);

// StockHistory 컬렉션으로 등록
module.exports = mongoose.model('StockHistory', stockHistorySchema);

