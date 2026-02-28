import 'dotenv/config';
import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as cron from 'node-cron';
import rateLimit from 'express-rate-limit';
import { apiPrefix, scheduledRefresh, port, retryTimes } from './utils/configs';
import { logger } from './utils/logger';
import * as globals from './utils/globals';
import { ChatService } from './chatgpt/ChatService';
import { refreshAllTokens } from './chatgpt/authorization';

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (_req.method === 'OPTIONS') return res.status(200).send();
  next();
});

function getAuthToken(req: Request): string {
  const authHeader = req.headers.authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7);
  return authHeader;
}

async function process(requestData: any, reqToken: string): Promise<[ChatService, any]> {
  const chatService = new ChatService(reqToken);
  try {
    await chatService.setDynamicData(requestData);
    await chatService.getChatRequirements();
    await chatService.prepareSendConversation();
    const result = await chatService.sendConversation();
    return [chatService, result];
  } catch (e: any) {
    chatService.closeClient();
    throw e;
  }
}

async function asyncRetry(requestData: any, reqToken: string): Promise<[ChatService, any]> {
  let lastError: any;
  for (let attempt = 0; attempt <= retryTimes; attempt++) {
    try {
      return await process(requestData, reqToken);
    } catch (e: any) {
      lastError = e;
      if (attempt < retryTimes) {
        logger.info(`Retry ${attempt + 1}, status: ${e.statusCode || 500}, ${e.message}`);
      }
    }
  }
  throw lastError;
}

// Chat completions endpoint
const chatPath = apiPrefix ? `/${apiPrefix}/v1/chat/completions` : '/v1/chat/completions';

app.post(chatPath, async (req: Request, res: Response) => {
  const reqToken = getAuthToken(req);

  try {
    const requestData = req.body;
    if (!requestData) {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    const [chatService, result] = await asyncRetry(requestData, reqToken);

    if (result && typeof result[Symbol.asyncIterator] === 'function') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of result) {
          res.write(chunk);
        }
      } finally {
        res.end();
        chatService.closeClient();
      }
    } else {
      chatService.closeClient();
      res.json(result);
    }
  } catch (e: any) {
    const status = e.statusCode || 500;
    const detail = e.message || 'Server error';
    logger.error(`Error: ${status} ${detail}`);
    res.status(status).json({ error: detail });
  }
});

// Models endpoint
const modelsPath = apiPrefix ? `/${apiPrefix}/v1/models` : '/v1/models';

app.get(modelsPath, (_req: Request, res: Response) => {
  const modelIds = [
    'gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini',
    'o1', 'o1-mini', 'o3-mini', 'o3-mini-high',
  ];
  const models = modelIds.map(id => ({
    id,
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
  }));
  res.json({ object: 'list', data: models });
});

// Tokens management
const tokensPath = apiPrefix ? `/${apiPrefix}/tokens` : '/tokens';

// Rate-limit administrative token endpoints to 20 req/min per IP
const tokensMgmtLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

app.get(tokensPath, tokensMgmtLimiter, (_req: Request, res: Response) => {
  const activeTokens = globals.tokenList.filter(t => !globals.errorTokenList.includes(t));
  const tokensCount = new Set(activeTokens).size;
  const html = `<!DOCTYPE html>
<html>
<head><title>Tokens Management</title></head>
<body>
<h1>Tokens Management</h1>
<p>Active tokens: ${tokensCount}</p>
<h2>Upload Tokens</h2>
<form method="POST" action="${tokensPath}/upload">
  <textarea name="text" rows="10" cols="50" placeholder="One token per line"></textarea><br>
  <button type="submit">Upload</button>
</form>
<form method="POST" action="${tokensPath}/clear">
  <button type="submit">Clear All Tokens</button>
</form>
</body>
</html>`;
  res.send(html);
});

app.post(`${tokensPath}/upload`, tokensMgmtLimiter, express.urlencoded({ extended: true }), (req: Request, res: Response) => {
  const text: string = req.body.text || '';
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      globals.tokenList.push(t);
      fs.appendFileSync(globals.TOKENS_FILE, t + '\n');
    }
  }
  const tokensCount = new Set(globals.tokenList.filter(t => !globals.errorTokenList.includes(t))).size;
  res.json({ status: 'success', tokens_count: tokensCount });
});

app.post(`${tokensPath}/clear`, tokensMgmtLimiter, (_req: Request, res: Response) => {
  globals.tokenList.length = 0;
  globals.errorTokenList.length = 0;
  fs.writeFileSync(globals.TOKENS_FILE, '');
  fs.writeFileSync(globals.ERROR_TOKENS_FILE, '');
  res.json({ status: 'success', tokens_count: 0 });
});

app.post(`${tokensPath}/error`, tokensMgmtLimiter, (_req: Request, res: Response) => {
  const errorTokens = [...new Set(globals.errorTokenList)];
  res.json({ status: 'success', error_tokens: errorTokens });
});

app.get(`${tokensPath}/add/:token`, tokensMgmtLimiter, (req: Request, res: Response) => {
  const token = req.params.token;
  if (token && !token.startsWith('#')) {
    globals.tokenList.push(token);
    fs.appendFileSync(globals.TOKENS_FILE, token + '\n');
  }
  const tokensCount = new Set(globals.tokenList.filter(t => !globals.errorTokenList.includes(t))).size;
  res.json({ status: 'success', tokens_count: tokensCount });
});

// Startup: scheduled token refresh
if (scheduledRefresh) {
  refreshAllTokens(false).catch(e => logger.error(`Initial token refresh failed: ${e}`));
  cron.schedule('0 3 */2 * *', () => {
    refreshAllTokens(true).catch(e => logger.error(`Scheduled token refresh failed: ${e}`));
  });
}

app.listen(port, '0.0.0.0', () => {
  logger.info(`Server started on port ${port}`);
});

export default app;
