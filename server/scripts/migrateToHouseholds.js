// 기존 전역 데이터(가구 개념이 없던 시절의 Item/Stock/StockHistory/UserPreferences)를
// "첫 가구"로 이관하는 1회성 마이그레이션 스크립트.
//
// 사용 전제:
//   1) 대상 사용자가 앱에서 카카오로 "한 번 로그인"해야 한다.
//      (그래야 해당 사용자의 User/Household/Membership 이 생성된다)
//   2) 그 사용자의 이메일을 OWNER_EMAIL 로 넘겨 실행한다.
//
// 실행 예:
//   cd server
//   OWNER_EMAIL=me@example.com node scripts/migrateToHouseholds.js
//
// 안전성: householdId 가 없는 문서에만 값을 채우므로 여러 번 실행해도 안전(idempotent).

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Household = require('../models/Household');
const Membership = require('../models/Membership');
const Item = require('../models/Item');
const Stock = require('../models/Stock');
const StockHistory = require('../models/StockHistory');
const UserPreferences = require('../models/UserPreferences');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vibe_db';

async function resolveTargetHouseholdId() {
  // 1) 명시적으로 가구 ID 를 넘긴 경우 우선 사용
  if (process.env.TARGET_HOUSEHOLD_ID) {
    return new mongoose.Types.ObjectId(process.env.TARGET_HOUSEHOLD_ID);
  }

  // 2) OWNER_EMAIL 로 사용자를 찾아 그 사용자의 가구를 사용
  const email = process.env.OWNER_EMAIL;
  if (!email) {
    throw new Error(
      'OWNER_EMAIL 또는 TARGET_HOUSEHOLD_ID 환경변수가 필요합니다. (대상 사용자가 먼저 한 번 로그인해야 합니다)',
    );
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(
      `이메일 "${email}" 사용자를 찾을 수 없습니다. 앱에서 해당 계정으로 먼저 로그인했는지 확인하세요.`,
    );
  }

  const membership = await Membership.findOne({ userId: user._id });
  if (!membership) {
    // 멤버십이 없으면 가구를 새로 만들어 연결
    const household = await Household.create({
      name: `${user.name || '우리'}의 집`,
      ownerId: user._id,
    });
    await Membership.create({
      householdId: household._id,
      userId: user._id,
      role: 'owner',
    });
    return household._id;
  }

  return membership.householdId;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  // eslint-disable-next-line no-console
  console.log('MongoDB 연결 성공');

  const householdId = await resolveTargetHouseholdId();
  // eslint-disable-next-line no-console
  console.log(`대상 가구 ID: ${householdId}`);

  const filter = { householdId: { $exists: false } };

  const itemRes = await Item.updateMany(filter, { $set: { householdId } });
  const stockRes = await Stock.updateMany(filter, { $set: { householdId } });
  const historyRes = await StockHistory.updateMany(filter, {
    $set: { householdId },
  });

  // UserPreferences 는 과거 { key: 'singleton' } 단일 문서였다.
  // householdId 를 채우고 더 이상 쓰지 않는 key 필드를 제거한다.
  const prefsCol = UserPreferences.collection;
  const prefsRes = await prefsCol.updateMany(
    { householdId: { $exists: false } },
    { $set: { householdId }, $unset: { key: '' } },
  );

  // 과거 인덱스 정리 후 현재 스키마 인덱스로 동기화
  await Item.collection.dropIndex('categoryId_1_name_1').catch(() => {});
  await UserPreferences.collection.dropIndex('key_1').catch(() => {});
  await Item.syncIndexes();
  await UserPreferences.syncIndexes();

  // eslint-disable-next-line no-console
  console.log('이관 완료:', {
    items: itemRes.modifiedCount,
    stocks: stockRes.modifiedCount,
    histories: historyRes.modifiedCount,
    preferences: prefsRes.modifiedCount,
  });

  await mongoose.disconnect();
  // eslint-disable-next-line no-console
  console.log('완료');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});
