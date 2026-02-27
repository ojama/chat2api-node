import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as globals from '../utils/globals';
import * as configs from '../utils/configs';

const defaultImpersonateList = ['chrome119', 'chrome120', 'chrome123', 'edge99', 'edge101'];

export function getFp(reqToken: string): Record<string, any> {
  const fp = globals.fpMap ? globals.fpMap[reqToken] : null;

  if (fp && fp['user-agent'] && fp['impersonate']) {
    return { ...fp };
  }

  const impersonateList = configs.impersonateList || defaultImpersonateList;
  const randomChoice = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const newFp: Record<string, any> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
    'impersonate': randomChoice(impersonateList),
    'proxy_url': configs.proxyUrlList.length > 0 ? randomChoice(configs.proxyUrlList) : null,
    'oai-device-id': uuidv4(),
  };

  if (reqToken && globals.fpMap) {
    globals.fpMap[reqToken] = newFp;
    try {
      fs.writeFileSync(globals.FP_MAP_FILE, JSON.stringify(globals.fpMap, null, 2));
    } catch {}
  }

  return newFp;
}
