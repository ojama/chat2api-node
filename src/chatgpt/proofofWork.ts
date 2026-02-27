import { sha3_512 } from 'js-sha3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { conversationOnly } from '../utils/configs';

const cores = [8, 16, 24, 32];

export const navigatorKey = [
  'registerProtocolHandler−function registerProtocolHandler() { [native code] }',
  'storage−[object StorageManager]',
  'locks−[object LockManager]',
  'appCodeName−Mozilla',
  'appName−Netscape',
  'appVersion−5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'platform−Win32',
  'product−Gecko',
  'productSub−20030107',
  'vendor−Google Inc.',
  'vendorSub−',
  'oscpu−undefined',
  'language−en-US',
  'onLine−true',
  'cookieEnabled−true',
  'globalPrivacyControl−undefined',
];

export const windowKey = [
  '0',
  'window',
  'self',
  'document',
  'name',
  'location',
  'customElements',
  'history',
  'navigation',
  'locationbar',
  'menubar',
  'personalbar',
  'scrollbars',
  'statusbar',
  'toolbar',
  'status',
  'closed',
  'frames',
  'length',
  'top',
  'opener',
  'parent',
  'frameElement',
  'navigator',
  'origin',
  'external',
  'screen',
  'innerWidth',
  'innerHeight',
  'scrollX',
  'pageXOffset',
  'scrollY',
  'pageYOffset',
  'visualViewport',
  'screenX',
  'screenY',
  'outerWidth',
  'outerHeight',
  'devicePixelRatio',
  'clientInformation',
  'screenLeft',
  'screenTop',
  'defaultStatus',
  'defaultstatus',
  'styleMedia',
  'onsearch',
  'isSecureContext',
  'performance',
  'onappinstalled',
  'onbeforeinstallprompt',
  'crypto',
  'indexedDB',
  'sessionStorage',
  'localStorage',
  'onbeforexrselect',
  'onabort',
  'onbeforeinput',
  'onblur',
  'oncancel',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'onclose',
  'oncontextlost',
  'oncontextmenu',
  'oncontextrestored',
  'oncuechange',
  'ondblclick',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onended',
  'onerror',
  'onfocus',
  'onformdata',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onpause',
  'onplay',
  'onplaying',
  'onprogress',
  'onratechange',
  'onreset',
  'onresize',
  'onscroll',
  'onsecuritypolicyviolation',
  'onseeked',
  'onseeking',
  'onselect',
  'onslotchange',
  'onstalled',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'onvolumechange',
  'onwaiting',
  'onwebkitanimationend',
  'onwebkitanimationiteration',
  'onwebkitanimationstart',
  'onwebkittransitionend',
  'onwheel',
  'onauxclick',
  'ongotpointercapture',
  'onlostpointercapture',
  'onpointerdown',
  'onpointermove',
  'onpointerrawupdate',
  'onpointerup',
  'onpointercancel',
  'onpointerover',
  'onpointerout',
  'onpointerenter',
  'onpointerleave',
  'onselectstart',
  'onselectionchange',
  'onanimationend',
  'onanimationiteration',
  'onanimationstart',
  'ontransitionrun',
  'ontransitionstart',
  'ontransitionend',
  'ontransitioncancel',
  'onafterprint',
  'onbeforeprint',
  'onbeforeunload',
  'onhashchange',
  'onlanguagechange',
  'onmessage',
  'onmessageerror',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onpopstate',
  'onrejectionhandled',
  'onstorage',
  'onunhandledrejection',
  'onunload',
  'crossOriginIsolated',
  'scheduler',
  'alert',
  'atob',
  'blur',
  'btoa',
  'cancelAnimationFrame',
  'cancelIdleCallback',
  'captureEvents',
  'clearInterval',
  'clearTimeout',
  'close',
  'confirm',
  'createImageBitmap',
  'fetch',
  'find',
  'focus',
  'getComputedStyle',
  'getSelection',
  'matchMedia',
  'moveBy',
  'moveTo',
  'open',
  'postMessage',
  'print',
  'prompt',
  'queueMicrotask',
  'releaseEvents',
  'reportError',
  'requestAnimationFrame',
  'requestIdleCallback',
  'resizeBy',
  'resizeTo',
  'scroll',
  'scrollBy',
  'scrollTo',
  'setInterval',
  'setTimeout',
  'stop',
  'structuredClone',
  'webkitCancelAnimationFrame',
  'webkitRequestAnimationFrame',
  'Atomics',
  'Function',
  'undefined',
];

export const documentKey = [
  '_reactListeningo743lnnpvdg',
  'location',
  'createElement',
  'createTextNode',
  'createDocumentFragment',
  'getElementById',
  'getElementsByClassName',
  'getElementsByTagName',
  'querySelector',
  'querySelectorAll',
];

let cachedScripts: string[] = [];
let cachedDpl = '';
let cachedTime = 0;

function getParseTime(): string {
  // Uses a fixed EST offset (UTC-5). Note: this does not account for EDT (UTC-4)
  // during Daylight Saving Time, matching the behaviour of the original Python project.
  const offsetMs = 5 * 60 * 60 * 1000;
  const now = new Date(Date.now() - offsetMs);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[now.getUTCDay()];
  const monthName = months[now.getUTCMonth()];
  const day = String(now.getUTCDate()).padStart(2, ' ');
  const year = now.getUTCFullYear();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${dayName} ${monthName} ${day} ${year} ${hours}:${minutes}:${seconds} GMT-0500 (Eastern Standard Time)`;
}

export function getConfig(userAgent: string): any[] {
  const randomChoice = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  return [
    randomChoice([1920 + 1080, 2560 + 1440, 1920 + 1200]),
    getParseTime(),
    4294705152,
    0,
    userAgent,
    cachedScripts.length > 0 ? randomChoice(cachedScripts) : '',
    cachedDpl,
    'en-US',
    'en-US,es-US,en,es',
    0,
    randomChoice(navigatorKey),
    randomChoice(documentKey),
    randomChoice(windowKey),
    performance.now(),
    uuidv4(),
    '',
    randomChoice(cores),
    Date.now() - performance.now(),
  ];
}

export async function getDpl(service: any): Promise<boolean> {
  if (Date.now() / 1000 - cachedTime < 15 * 60) return true;

  if (conversationOnly) return true;

  try {
    const r = await service.s.get(`${service.hostUrl}/`, { timeout: 5000 });
    const html = r.data as string;

    cachedScripts = [];
    cachedDpl = '';
    const scriptMatches = html.matchAll(/src="([^"]+)"/g);
    for (const match of scriptMatches) {
      cachedScripts.push(match[1]);
      const dplMatch = match[1].match(/c\/[^/]*\/_/);
      if (dplMatch) {
        cachedDpl = dplMatch[0];
        cachedTime = Date.now() / 1000;
      }
    }

    if (!cachedDpl) {
      const dataBuildMatch = html.match(/data-build="([^"]*)"/);
      if (dataBuildMatch) {
        cachedDpl = dataBuildMatch[1];
        cachedTime = Date.now() / 1000;
      }
    }

    return !!cachedDpl;
  } catch (e) {
    logger.info(`Failed to get dpl: ${e}`);
    cachedDpl = '';
    cachedTime = Date.now() / 1000;
    return false;
  }
}

export function generateAnswer(seed: string, diff: string, config: any[]): [string, boolean] {
  const diffLen = diff.length / 2;
  const targetDiff = Buffer.from(diff, 'hex');

  const configPart1 = JSON.stringify(config.slice(0, 3)).slice(0, -1) + ',';
  const configPart2 = ',' + JSON.stringify(config.slice(4, 9)).slice(1, -1) + ',';
  const configPart3 = ',' + JSON.stringify(config.slice(10)).slice(1);

  for (let i = 0; i < 500000; i++) {
    const finalJson = configPart1 + i + configPart2 + Math.floor(i / 2) + configPart3;
    const baseEncode = Buffer.from(finalJson).toString('base64');
    const hash = Buffer.from(sha3_512.arrayBuffer(seed + baseEncode));

    if (hash.slice(0, diffLen).compare(targetDiff) <= 0) {
      return [baseEncode, true];
    }
  }

  const fallback = 'wQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D' + Buffer.from(`"${seed}"`).toString('base64');
  return [fallback, false];
}

export function getAnswerToken(seed: string, diff: string, config: any[]): [string, boolean] {
  const start = Date.now();
  const [answer, solved] = generateAnswer(seed, diff, config);
  const elapsed = Date.now() - start;
  logger.info(`diff: ${diff}, time: ${elapsed}ms, solved: ${solved}`);
  return ['gAAAAAB' + answer, solved];
}

export function getRequirementsToken(config: any[]): string {
  const [require] = generateAnswer(String(Math.random()), '0fffff', config);
  return 'gAAAAAC' + require;
}
