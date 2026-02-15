let installed = false;

function safeMessage(err) {
  if (err?.stack) return err.stack;
  if (err?.message) return err.message;
  return String(err);
}

export function installProcessSafety(serviceName, logger) {
  if (installed) return;
  installed = true;

  const svc = String(serviceName || "service");
  const log = logger || console;

  process.on("unhandledRejection", (reason) => {
    log.error?.({ service: svc, reason: safeMessage(reason) }, "[process] unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    log.error?.({ service: svc, error: safeMessage(err) }, "[process] uncaughtException");
  });

  process.on("warning", (warning) => {
    log.warn?.({ service: svc, warning: safeMessage(warning) }, "[process] warning");
  });
}

