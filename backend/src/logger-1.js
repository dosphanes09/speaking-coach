/**
 * Logs carry only an explicit allowlist of fields, so that nothing a user said
 * or recorded can leak into them by accident.
 *
 * `tokens` is on the list because token counts are the only way to see what a
 * request actually cost, and they describe the request rather than its content.
 */
function sanitizeMeta(meta = {}) {
  return {
    requestId: meta.requestId,
    status: meta.status,
    code: meta.code,
    method: meta.method,
    path: meta.path,
    tokens: meta.tokens
  };
}

function logInfo(message, meta) {
  console.info(JSON.stringify({ level: "info", message, ...sanitizeMeta(meta) }));
}

function logWarn(message, meta) {
  console.warn(JSON.stringify({ level: "warn", message, ...sanitizeMeta(meta) }));
}

function logError(message, meta) {
  console.error(JSON.stringify({ level: "error", message, ...sanitizeMeta(meta) }));
}

module.exports = {
  logInfo,
  logWarn,
  logError
};
