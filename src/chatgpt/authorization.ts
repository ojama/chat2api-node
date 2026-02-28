import * as globals from '../utils/globals';
import * as configs from '../utils/configs';
import { rt2ac } from './refreshToken';
import { logger } from '../utils/logger';
import * as fs from 'fs';

export function getReqToken(originToken: string, seed?: string): string {
  if (configs.autoSeed) {
    const availableTokens = globals.tokenList.filter(t => !globals.errorTokenList.includes(t));
    const length = availableTokens.length;

    if (seed && length > 0) {
      if (!globals.seedMap[seed]) {
        globals.seedMap[seed] = {
          token: availableTokens[Math.floor(Math.random() * length)],
          conversations: [],
        };
        try {
          fs.writeFileSync(globals.SEED_MAP_FILE, JSON.stringify(globals.seedMap, null, 4));
        } catch {}
      }
      return globals.seedMap[seed].token;
    }

    if (configs.authorizationList.includes(originToken)) {
      if (length > 0) {
        if (configs.randomToken) {
          return availableTokens[Math.floor(Math.random() * length)];
        } else {
          globals.setCount((globals.count + 1) % length);
          return availableTokens[globals.count];
        }
      }
      return '';
    }
    return originToken;
  } else {
    if (!globals.seedMap[originToken]) {
      throw Object.assign(new Error('Invalid Seed'), { statusCode: 401 });
    }
    return globals.seedMap[originToken].token;
  }
}

export async function verifyToken(reqToken: string): Promise<string | null> {
  if (!reqToken) {
    if (configs.authorizationList.length > 0) {
      logger.error('Unauthorized with empty token.');
      throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    }
    return null;
  }

  if (reqToken.startsWith('eyJhbGciOi') || reqToken.startsWith('fk-')) {
    return reqToken;
  } else if (reqToken.length === 45) {
    if (globals.errorTokenList.includes(reqToken)) {
      throw Object.assign(new Error('Error RefreshToken'), { statusCode: 401 });
    }
    return await rt2ac(reqToken, false);
  }
  return reqToken;
}

export async function refreshAllTokens(forceRefresh = false): Promise<void> {
  const tokens = globals.tokenList.filter(t => !globals.errorTokenList.includes(t));
  for (const token of tokens) {
    if (token.length === 45) {
      try {
        await new Promise(r => setTimeout(r, 500));
        await rt2ac(token, forceRefresh);
      } catch {}
    }
  }
  logger.info('All tokens refreshed.');
}
