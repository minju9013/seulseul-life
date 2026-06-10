// Item + Stock 문서를 클라이언트가 다루기 쉬운 평탄한 형태로 정규화한다.
// - id 는 _id 의 문자열 표현 (Mongo ObjectId)
// - quantity, status 등 재고 정보는 Stock 에서 끌어와 한 객체로 합친다.
const { getStatus } = require('./getStatus');

function toPlain(doc) {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

function serializeItem(itemDoc, stockDoc) {
  const item = toPlain(itemDoc);
  if (!item) return null;
  const stock = toPlain(stockDoc);

  const th = item.lowStockThreshold ?? 1;

  return {
    id: String(item._id),
    name: item.name,
    categoryId: item.categoryId,
    image: item.image || null,
    imagePublicId: item.imagePublicId || null,
    unit: item.unit || '개',
    lowStockThreshold: th,
    notes: item.notes || '',
    order: item.order ?? null,
    quantity: stock?.quantity ?? 0,
    status: stock?.status ?? getStatus(0, th),
    consumptionRate: stock?.consumptionRate ?? null,
    estimatedRunOut: stock?.estimatedRunOut ?? null,
    lastUpdated: stock?.lastUpdated ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

module.exports = { serializeItem };
