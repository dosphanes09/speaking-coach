function sanitizeMeta(meta = {}) {
  return {
    requestId: meta.requestId,
    status: meta.status,
    code: meta.code,
    method: meta.method,
    path: meta.path
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
