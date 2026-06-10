const mongoose = require('mongoose');
const { getStatus } = require('../utils/getStatus');

// Mongoose Schema 생성에 사용할 헬퍼
const { Schema } = mongoose;

// 아이템별 현재 재고 상태를 저장하는 스키마
const stockSchema = new Schema(
  {
    // 어떤 아이템의 재고인지 (Item 컬렉션 참조)
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    // 현재 남아 있는 수량 (0 이상, 기본값 0)
    quantity: { type: Number, default: 0, min: 0 },
    // Item 과 동기화되는 부족 기준 (재계산 시 사용)
    lowStockThreshold: { type: Number, default: 1, min: 1, max: 99 },
    // 재고 상태: 충분 / 부족 / 소진 (getStatus 로 자동 계산)
    status: {
      type: String,
      enum: ['충분', '부족', '소진'],
    },
    // 하루 평균 소진량 (수량 변경 이력으로부터 자동 계산)
    consumptionRate: { type: Number },
    // 현재 수량과 소진 속도로 계산한 예상 소진일
    estimatedRunOut: { type: Date },
    // 마지막으로 재고 수량이 갱신된 시각
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    // createdAt, updatedAt 자동 관리
    timestamps: true,
  },
);

// 저장 직전에 상태(status)와 마지막 갱신 시각(lastUpdated)을 자동으로 맞춘다.
// consumptionRate / estimatedRunOut 같은 소진 예측은 utils/stockService 가
// 최근 이력 기준으로 일괄 계산하므로 여기서는 다루지 않는다.
stockSchema.pre('save', function preSave(next) {
  const th = this.lowStockThreshold ?? 1;
  this.status = getStatus(this.quantity ?? 0, th);
  this.lastUpdated = new Date();
  return next();
});

// Stock 컬렉션으로 등록
module.exports = mongoose.model('Stock', stockSchema);

