import * as dotenv from 'dotenv';
dotenv.config();
import { logger } from './logger';
import * as fs from 'fs';

function isTrue(x: any): boolean {
  if (typeof x === 'boolean') return x;
  if (typeof x === 'string') return ['true', '1', 't', 'y', 'yes'].includes(x.toLowerCase());
  if (typeof x === 'number') return x === 1;
  return false;
}

export const apiPrefix = process.env.API_PREFIX || null;
export const authorization = (process.env.AUTHORIZATION || '').replace(/ /g, '');
export const chatgptBaseUrl = (process.env.CHATGPT_BASE_URL || 'https://chatgpt.com').replace(/ /g, '');
export const authKey = process.env.AUTH_KEY || null;
export const proxyUrl = (process.env.PROXY_URL || '').replace(/ /g, '');
export const exportProxyUrl = process.env.EXPORT_PROXY_URL || null;
export const historyDisabled = isTrue(process.env.HISTORY_DISABLED ?? 'true');
export const powDifficulty = process.env.POW_DIFFICULTY || '000032';
export const retryTimes = parseInt(process.env.RETRY_TIMES || '3');
export const conversationOnly = isTrue(process.env.CONVERSATION_ONLY ?? 'false');
export const enableLimit = isTrue(process.env.ENABLE_LIMIT ?? 'true');
export const uploadByUrl = isTrue(process.env.UPLOAD_BY_URL ?? 'false');
export const scheduledRefresh = isTrue(process.env.SCHEDULED_REFRESH ?? 'false');
export const randomToken = isTrue(process.env.RANDOM_TOKEN ?? 'true');
export const oaiLanguage = process.env.OAI_LANGUAGE || 'zh-CN';
export const enableGateway = isTrue(process.env.ENABLE_GATEWAY ?? 'false');
export const autoSeed = isTrue(process.env.AUTO_SEED ?? 'true');
export const port = parseInt(process.env.PORT || '5005');

export const authorizationList = authorization ? authorization.split(',') : [];
export const chatgptBaseUrlList = chatgptBaseUrl ? chatgptBaseUrl.split(',') : ['https://chatgpt.com'];
export const proxyUrlList = proxyUrl ? proxyUrl.split(',') : [];
export const impersonateList: string[] = ['chrome119', 'chrome120', 'chrome123', 'edge99', 'edge101'];

let version = '1.0.0';
try {
  version = fs.readFileSync('version.txt', 'utf-8').trim();
} catch (e) {}

logger.info('-'.repeat(60));
logger.info(`Chat2Api ${version} | https://github.com/ojama/chat2api-node`);
logger.info('-'.repeat(60));
logger.info('Environment variables:');
logger.info('API_PREFIX:        ' + apiPrefix);
logger.info('AUTHORIZATION:     ' + JSON.stringify(authorizationList));
logger.info('CHATGPT_BASE_URL:  ' + JSON.stringify(chatgptBaseUrlList));
logger.info('PROXY_URL:         ' + JSON.stringify(proxyUrlList));
logger.info('HISTORY_DISABLED:  ' + historyDisabled);
logger.info('POW_DIFFICULTY:    ' + powDifficulty);
logger.info('RETRY_TIMES:       ' + retryTimes);
logger.info('RANDOM_TOKEN:      ' + randomToken);
logger.info('ENABLE_GATEWAY:    ' + enableGateway);
logger.info('-'.repeat(60));
