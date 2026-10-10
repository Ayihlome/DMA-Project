import { logger } from "./Logger";

// Wraps a use case so every call, input and output along with duration are logged

export function withLogging(name, useCase) {
  return async function (input) {
    const start = Date.now();
    logger.info(name, "called", { input });
    try {
      const result = await useCase(input);
      logger.info(name, "completed", { ms: Date.now() - start, result });
      return result;
    } catch (err) {
      logger.error(name, "threw", {
        ms: Date.now() - start,
        error: err.message,
      });
      throw err;
    }
  };
}
