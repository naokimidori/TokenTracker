// 单机本地模式：纯存根，不向云端发送账户请求
class AccountAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AccountAuthError";
    this.code = code;
  }
}

const USAGE_TO_ACCOUNT_SLUG = Object.freeze({
  "tokentracker-usage-summary": "tokentracker-account-usage-summary",
  "tokentracker-usage-hourly": "tokentracker-account-usage-hourly",
});

const PAYLOAD_TTL_MS = 60_000;

function accountSlugFor(usageSlug) {
  return USAGE_TO_ACCOUNT_SLUG[usageSlug] || null;
}

function accessTokenFromRefreshPayload() {
  return null;
}

function refreshTokenFromRefreshPayload() {
  return null;
}

function decodeJwtExpMs() {
  return null;
}

function decodeJwtSub() {
  return null;
}

async function mintAccessToken() {
  return null;
}

async function fetchAccountFunction() {
  return null;
}

async function fetchAccountUsage() {
  return null;
}

function __resetCloudAccountCacheForTests() {}

module.exports = {
  AccountAuthError,
  USAGE_TO_ACCOUNT_SLUG,
  PAYLOAD_TTL_MS,
  accountSlugFor,
  accessTokenFromRefreshPayload,
  refreshTokenFromRefreshPayload,
  decodeJwtExpMs,
  decodeJwtSub,
  mintAccessToken,
  fetchAccountFunction,
  fetchAccountUsage,
  __resetCloudAccountCacheForTests,
};
