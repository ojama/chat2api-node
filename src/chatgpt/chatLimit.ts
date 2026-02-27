import { logger } from '../utils/logger';

interface LimitInfo {
  [model: string]: number;
}

const limitDetails: Record<string, LimitInfo> = {};

export function checkIsLimit(detail: any, token: string, model: string): void {
  if (token && typeof detail === 'object' && detail?.clears_in) {
    const clearTime = Math.floor(Date.now() / 1000) + detail.clears_in;
    if (!limitDetails[token]) limitDetails[token] = {};
    limitDetails[token][model] = clearTime;
    logger.info(
      `${token.substring(0, 40)}: Reached ${model} limit, will clear at ${new Date(clearTime * 1000).toISOString()}`,
    );
  }
}

export async function handleRequestLimit(token: string, model: string): Promise<string | null> {
  try {
    if (limitDetails[token]?.[model]) {
      const limitTime = limitDetails[token][model];
      if (limitTime > Date.now() / 1000) {
        const clearDate = new Date(limitTime * 1000).toISOString();
        const result = `Request limit exceeded. You can continue with the default model now, or try again after ${clearDate}`;
        logger.info(result);
        return result;
      } else {
        delete limitDetails[token][model];
      }
    }
  } catch (e: any) {
    logger.error(`Error in handleRequestLimit: ${e}`);
  }
  return null;
}
