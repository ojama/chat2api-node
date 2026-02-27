export const logger = {
  info: (msg: string) => console.log(`${new Date().toISOString()} | INFO | ${msg}`),
  error: (msg: string) => console.error(`${new Date().toISOString()} | ERROR | ${msg}`),
  warn: (msg: string) => console.warn(`${new Date().toISOString()} | WARN | ${msg}`),
  debug: (msg: string) => console.debug(`${new Date().toISOString()} | DEBUG | ${msg}`),
};
