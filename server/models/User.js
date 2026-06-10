const mongoose = require('mongoose');

const { Schema } = mongoose;

// Supabase Auth 로 인증된 사용자. 실제 인증/비밀번호는 Supabase 가 관리하고,
// 여기서는 앱 도메인 데이터(가구 소속 등)를 잇기 위한 최소 정보만 보관한다.
const userSchema = new Schema(
  {
    // Supabase user id (JWT 의 sub)
    supabaseId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true },
    name: { type: String, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
