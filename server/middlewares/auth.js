// Supabase Auth 가 발급한 JWT 를 검증하고, 요청을 가구(household)에 연결하는 미들웨어.
// - 인증은 Supabase 가 담당하고, 데이터는 기존 MongoDB 에 그대로 둔다.
// - ES256 등 비대칭 키: JWKS 엔드포인트로 검증 (JWT Signing Keys 이전 프로젝트)
// - HS256: Legacy JWT Secret 으로 검증 (구 프로젝트 호환)
const jwt = require('jsonwebtoken');
const jose = require('jose');
const User = require('../models/User');
const Household = require('../models/Household');
const Membership = require('../models/Membership');

let remoteJwks = null;

function getSupabaseAuthConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return null;
  if (!remoteJwks) {
    remoteJwks = jose.createRemoteJWKSet(
      new URL(`${baseUrl}/auth/v1/.well-known/jwks.json`)
    );
  }
  return { jwks: remoteJwks, issuer: `${baseUrl}/auth/v1` };
}

function fillAuthFromPayload(req, payload) {
  const meta = payload.user_metadata || {};
  req.auth = {
    supabaseId: payload.sub,
    email: payload.email || meta.email || null,
    name: meta.name || meta.full_name || meta.nickname || payload.email || '사용자',
  };
}

async function verifySupabaseToken(token) {
  const { alg } = jose.decodeProtectedHeader(token);

  if (alg && alg.startsWith('HS')) {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET not configured');
    }
    return jwt.verify(token, secret, { audience: 'authenticated' });
  }

  const config = getSupabaseAuthConfig();
  if (!config) {
    throw new Error('SUPABASE_URL not configured');
  }

  const { payload } = await jose.jwtVerify(token, config.jwks, {
    issuer: config.issuer,
    audience: 'authenticated',
  });
  return payload;
}

// Authorization: Bearer <token> 헤더의 토큰을 검증해 req.auth 를 채운다.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  const hasJwks = Boolean(process.env.SUPABASE_URL);
  const hasLegacySecret = Boolean(process.env.SUPABASE_JWT_SECRET);
  if (!hasJwks && !hasLegacySecret) {
    // eslint-disable-next-line no-console
    console.error('SUPABASE_URL 또는 SUPABASE_JWT_SECRET 환경변수가 필요합니다.');
    return res.status(500).json({ message: '서버 인증 설정이 누락되었습니다.' });
  }

  try {
    const payload = await verifySupabaseToken(token);
    fillAuthFromPayload(req, payload);
    return next();
  } catch (err) {
    return res.status(401).json({ message: '유효하지 않은 인증 토큰입니다.' });
  }
}

// req.auth 를 바탕으로 User/Household 를 보장(없으면 생성)하고
// req.user, req.householdId 를 채운다. requireAuth 다음에 사용한다.
async function attachHousehold(req, res, next) {
  try {
    let user = await User.findOne({ supabaseId: req.auth.supabaseId });
    if (!user) {
      user = await User.create({
        supabaseId: req.auth.supabaseId,
        email: req.auth.email,
        name: req.auth.name,
      });
    }

    let membership = await Membership.findOne({ userId: user._id });
    if (!membership) {
      const household = await Household.create({
        name: `${req.auth.name || '우리'}의 집`,
        ownerId: user._id,
      });
      membership = await Membership.create({
        householdId: household._id,
        userId: user._id,
        role: 'owner',
      });
    }

    req.user = user;
    req.householdId = membership.householdId;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireAuth,
  attachHousehold,
};
