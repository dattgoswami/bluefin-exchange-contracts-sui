import { pino } from "pino";

/**
 * log - will be used with following methods to record the events
 ** trace - all of the steps during the application execution
 ** debug - most of the steps
 ** info - for each completed functional transaction/task.
 ** warn - out of regular events but not an error.
 ** error - when logic is broken, but it does not affect the whole application
 ** fatal - when the application is halted
 */
const pinoLogger = pino({
  enabled: !(typeof global.it === "function"),
  base: undefined,
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

export const log = pinoLogger;