const fs = require('fs');
const path = require('path');
const { env } = require('../../config/env');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'execution.log');

fs.mkdirSync(LOG_DIR, { recursive: true });

/**
 * Structured logger: a readable line on the console and one JSON object per line in
 * logs/execution.log, so a failed run can be traced step by step afterwards.
 */
function write(level, message, context = {}) {
  if (LEVELS[level] < LEVELS[env.logLevel]) return;
  const entry = { time: new Date().toISOString(), level, message, ...context };
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
  const details = Object.keys(context).length ? ` ${JSON.stringify(context)}` : '';
  console.log(`[${entry.time}] ${level.toUpperCase().padEnd(5)} ${message}${details}`);
}

const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
};

module.exports = { logger, LOG_FILE };
