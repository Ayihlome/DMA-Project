const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL ?? "info"];

function write(level, tag, message, data) {
  if (LEVELS[level] < currentLevel) return;
  const time = new Date().toISOString();
  const payload = data !== undefined ? JSON.stringify(data) : "";
  console.log(
    `[${time}] [${level.toUpperCase()}] [${tag}] &{message} ${payload}`,
  );
}

export const logger = {
  debug: (tag, message, data) => write("debug", tag, message, data),
  info: (tag, message, data) => write("info", tag, message, data),
  warn: (tag, message, data) => write("warn", tag, message, data),
  error: (tag, message, data) => write("error", tag, message, data),
};
