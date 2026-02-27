import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as globals from '../utils/globals';
import { proxyUrlList } from '../utils/configs';
import { logger } from '../utils/logger';

export async function rt2ac(refreshToken: string, forceRefresh = false): Promise<string> {
  if (!forceRefresh && globals.refreshMap[refreshToken]) {
    const cached = globals.refreshMap[refreshToken];
    if (Date.now() / 1000 - cached.timestamp < 5 * 24 * 60 * 60) {
      return cached.token;
    }
  }

  const accessToken = await chatRefresh(refreshToken);
  globals.refreshMap[refreshToken] = { token: accessToken, timestamp: Math.floor(Date.now() / 1000) };
  try {
    fs.writeFileSync(globals.REFRESH_MAP_FILE, JSON.stringify(globals.refreshMap, null, 4));
  } catch {}
  logger.info(`refresh_token -> access_token: ${accessToken.substring(0, 20)}...`);
  return accessToken;
}

async function chatRefresh(refreshToken: string): Promise<string> {
  const data = {
    client_id: 'pdlLIX2Y72MIl2rhLhTE9VV9bN905kBh',
    grant_type: 'refresh_token',
    redirect_uri: 'com.openai.chat://auth0.openai.com/ios/com.openai.chat/callback',
    refresh_token: refreshToken,
  };

  const sessionId = crypto.createHash('md5').update(refreshToken).digest('hex');
  const proxyEntry = proxyUrlList.length > 0
    ? proxyUrlList[Math.floor(Math.random() * proxyUrlList.length)].replace('{}', sessionId)
    : null;

  const config: any = { timeout: 15000 };
  if (proxyEntry) {
    const agent = proxyEntry.startsWith('https')
      ? new HttpsProxyAgent(proxyEntry)
      : new HttpProxyAgent(proxyEntry);
    config.httpsAgent = agent;
  }

  try {
    const r = await axios.post('https://auth0.openai.com/oauth/token', data, config);
    return r.data.access_token;
  } catch (e: any) {
    const text = e.response?.data ? JSON.stringify(e.response.data) : String(e);
    if (text.includes('invalid_grant') || text.includes('access_denied')) {
      if (!globals.errorTokenList.includes(refreshToken)) {
        globals.errorTokenList.push(refreshToken);
        fs.appendFileSync(globals.ERROR_TOKENS_FILE, refreshToken + '\n');
      }
    }
    logger.error(`Failed to refresh access_token: ${text.substring(0, 300)}`);
    throw Object.assign(new Error('Failed to refresh access_token'), { statusCode: 500 });
  }
}
