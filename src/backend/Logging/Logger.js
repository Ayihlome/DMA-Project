const fallback = typeof __DEV__ !== "undefined" && __DEV__ ? "info" : "warn";
const currentLevel =
  LEVELS[
    process.env.EXPO_PUBLIC_LOG_LEVEL ?? process.env.LOG_LEVEL ?? fallback
  ] ?? LEVELS.warn;

function write(level, tag, message, data) {
  if (LEVELS[level] < currentLevel) return;
  const time = new Date().toISOString();
  const payload = data !== undefined ? JSON.stringify(data) : "";
  console.log(
    `[${time}] [${level.toUpperCase()}] [${tag}] ${message} ${payload}`,
  );
}

export const logger = {
  debug: (tag, message, data) => write("debug", tag, message, data),
  info: (tag, message, data) => write("info", tag, message, data),
  warn: (tag, message, data) => write("warn", tag, message, data),
  error: (tag, message, data) => write("error", tag, message, data),
};
