import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { Client } from '../utils/client';
import * as configs from '../utils/configs';
import { getReqToken, verifyToken } from './authorization';
import { getFp } from './fp';
import { apiMessagesToChatMessages, streamResponse, formatNotStreamResponse } from './chatFormat';
import { getConfig, getDpl, getAnswerToken } from './proofofWork';
import { handleRequestLimit } from './chatLimit';
import { getImageSize, getFileExtension, determineFileUseCase } from '../api/files';

export class ChatService {
  reqToken: string;
  accessToken: string | null = null;
  accountId: string | null = null;
  s: Client | null = null;
  ss: Client | null = null;

  data: any = null;
  respModel = '';
  reqModel = '';
  hostUrl = '';
  baseUrl = '';
  userAgent = '';
  proxyUrl: string | null = null;

  chatHeaders: any = null;
  chatRequest: any = null;
  baseHeaders: any = {};
  promptTokens = 0;
  maxTokens = 2147483647;
  historyDisabled = true;
  apiMessages: any[] = [];
  parentMessageId: string | null = null;
  conversationId: string | null = null;

  constructor(originToken: string) {
    this.reqToken = getReqToken(originToken);
  }

  async setDynamicData(data: any): Promise<void> {
    if (this.reqToken) {
      const parts = this.reqToken.split(',');
      if (parts.length === 1) {
        this.accessToken = await verifyToken(this.reqToken);
        this.accountId = null;
      } else {
        this.accessToken = await verifyToken(parts[0]);
        this.accountId = parts[1];
      }
    } else {
      logger.info('Request token is empty, use no-auth 3.5');
      this.accessToken = null;
      this.accountId = null;
    }

    const fp = getFp(this.reqToken);
    this.proxyUrl = fp.proxy_url || null;
    this.userAgent =
      fp['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

    logger.info(`Request token: ${this.reqToken}`);
    logger.info(`Request proxy: ${this.proxyUrl}`);

    this.data = data;
    await this.setModel();

    if (configs.enableLimit && this.reqToken) {
      const limitResponse = await handleRequestLimit(this.reqToken, this.reqModel);
      if (limitResponse) {
        throw Object.assign(new Error(limitResponse), { statusCode: 429 });
      }
    }

    this.accountId = data['Chatgpt-Account-Id'] || this.accountId;
    this.parentMessageId = data.parent_message_id || null;
    this.conversationId = data.conversation_id || null;
    this.historyDisabled = data.history_disabled ?? configs.historyDisabled;
    this.apiMessages = data.messages || [];
    this.promptTokens = 0;
    this.maxTokens = typeof data.max_tokens === 'number' ? data.max_tokens : 2147483647;

    this.hostUrl =
      configs.chatgptBaseUrlList.length > 0
        ? configs.chatgptBaseUrlList[Math.floor(Math.random() * configs.chatgptBaseUrlList.length)]
        : 'https://chatgpt.com';

    const sessionId = this.reqToken
      ? crypto.createHash('md5').update(this.reqToken).digest('hex')
      : 'default';
    const proxyUrl = this.proxyUrl ? this.proxyUrl.replace('{}', sessionId) : null;
    this.s = new Client({ proxy: proxyUrl });
    this.ss = this.s;

    this.baseHeaders = {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'oai-language': configs.oaiLanguage,
      origin: this.hostUrl,
      priority: 'u=1, i',
      referer: `${this.hostUrl}/`,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': this.userAgent,
    };

    if (fp['oai-device-id']) this.baseHeaders['oai-device-id'] = fp['oai-device-id'];

    if (this.accessToken) {
      this.baseUrl = this.hostUrl + '/backend-api';
      this.baseHeaders['authorization'] = `Bearer ${this.accessToken}`;
    } else {
      this.baseUrl = this.hostUrl + '/backend-anon';
    }

    if (this.accountId) {
      this.baseHeaders['Chatgpt-Account-ID'] = this.accountId;
    }
  }

  async setModel(): Promise<void> {
    this.reqModel = this.data.model || 'gpt-3.5-turbo';

    if (this.reqModel.includes('gpt-4o-mini')) {
      this.respModel = 'gpt-4o-mini';
    } else if (this.reqModel.includes('gpt-4o')) {
      this.respModel = 'gpt-4o';
    } else if (this.reqModel.includes('gpt-4')) {
      this.respModel = 'gpt-4';
    } else if (this.reqModel.includes('o3-mini-high')) {
      this.respModel = 'o3-mini-high';
    } else if (this.reqModel.includes('o3-mini')) {
      this.respModel = 'o3-mini';
    } else if (this.reqModel.includes('o1-mini')) {
      this.respModel = 'o1-mini';
    } else if (this.reqModel.includes('o1-pro')) {
      this.respModel = 'o1-pro';
    } else if (this.reqModel.includes('o1')) {
      this.respModel = 'o1';
    } else {
      this.respModel = 'text-davinci-002-render-sha';
    }

    logger.info(`Request model: ${this.reqModel}, Response model: ${this.respModel}`);
  }

  async getChatRequirements(): Promise<void> {
    await getDpl(this);

    if (configs.conversationOnly) {
      logger.info('Conversation only mode, skip requirements');
      return;
    }

    const url = `${this.baseUrl}/sentinel/chat-requirements`;
    const headers = { ...this.baseHeaders };

    try {
      const r = await this.ss!.post(url, {}, { headers, timeout: 10000 });
      if (r.status === 200) {
        const data = r.data;
        const proofofwork = data.proofofwork;
        if (proofofwork?.required) {
          const seed = proofofwork.seed;
          const diff = proofofwork.difficulty;
          const config = getConfig(this.userAgent);
          const [token, solved] = getAnswerToken(seed, diff, config);
          this.baseHeaders['openai-sentinel-proof-token'] = token;
          logger.info(`PoW solved: ${solved}`);
        }
        const turnstile = data.turnstile;
        if (turnstile?.required) {
          logger.info('Turnstile required but not supported in this implementation');
        }
        if (data['chat-requirements-token']) {
          this.baseHeaders['openai-sentinel-chat-requirements-token'] = data['chat-requirements-token'];
        }
      } else {
        logger.error(`Failed to get chat requirements: ${r.status}`);
      }
    } catch (e) {
      logger.error(`Failed to get chat requirements: ${e}`);
    }
  }

  async prepareSendConversation(): Promise<void> {
    const [chatMessages, promptTokens] = await apiMessagesToChatMessages(
      this,
      this.apiMessages,
      configs.uploadByUrl,
    );
    this.promptTokens = promptTokens;

    const parentMessageId = this.parentMessageId || uuidv4();

    this.chatRequest = {
      action: 'next',
      messages: chatMessages,
      parent_message_id: parentMessageId,
      model: this.respModel,
      history_and_training_disabled: this.historyDisabled,
      ...(this.conversationId ? { conversation_id: this.conversationId } : {}),
    };

    if (this.historyDisabled) {
      this.chatRequest.timezone_offset_min = -480;
    }

    this.chatHeaders = {
      ...this.baseHeaders,
      accept: 'text/event-stream',
    };

    logger.info(`Chat request model: ${this.respModel}`);
  }

  async sendConversation(): Promise<any> {
    const url = `${this.baseUrl}/conversation`;
    const isStream = this.data.stream !== false;

    try {
      const response = await this.s!.postStream(url, this.chatRequest, { headers: this.chatHeaders });

      if (isStream) {
        return streamResponse(this, response.data, this.respModel, this.maxTokens);
      } else {
        const gen = streamResponse(this, response.data, this.respModel, this.maxTokens);
        return formatNotStreamResponse(gen, this.promptTokens, this.maxTokens, this.respModel);
      }
    } catch (e: any) {
      const status = e.response?.status || 500;
      const detail = e.response?.data || String(e);
      logger.error(`Send conversation failed: ${status} ${JSON.stringify(detail)}`);
      throw Object.assign(new Error(JSON.stringify(detail)), { statusCode: status });
    }
  }

  async uploadFile(fileContent: Buffer, mimeType: string): Promise<any | null> {
    if (!fileContent || !mimeType) return null;

    let width: number | undefined, height: number | undefined;
    if (mimeType.startsWith('image/')) {
      try {
        [width, height] = await getImageSize(fileContent);
      } catch (e) {
        mimeType = 'text/plain';
      }
    }

    const fileSize = fileContent.length;
    const fileExtension = getFileExtension(mimeType);
    const fileName = `${uuidv4()}${fileExtension}`;
    const useCase = determineFileUseCase(mimeType);

    const [fileId, uploadUrl] = await this.getUploadUrl(fileName, fileSize, useCase);
    if (fileId && uploadUrl) {
      const success = await this.upload(uploadUrl, fileContent, mimeType);
      if (success) {
        const downloadUrl = await this.getDownloadUrlFromUpload(fileId);
        if (downloadUrl) {
          return {
            file_id: fileId,
            file_name: fileName,
            size_bytes: fileSize,
            mime_type: mimeType,
            width,
            height,
            use_case: useCase,
          };
        }
      }
    }
    return null;
  }

  async getUploadUrl(fileName: string, fileSize: number, useCase: string): Promise<[string, string]> {
    const url = `${this.baseUrl}/files`;
    const headers = { ...this.baseHeaders };
    try {
      const r = await this.s!.post(
        url,
        {
          file_name: fileName,
          file_size: fileSize,
          reset_rate_limits: false,
          timezone_offset_min: -480,
          use_case: useCase,
        },
        { headers, timeout: 5000 },
      );
      if (r.status === 200) {
        return [r.data.file_id, r.data.upload_url];
      }
      throw new Error(`${r.status}`);
    } catch (e) {
      logger.error(`Failed to get upload url: ${e}`);
      return ['', ''];
    }
  }

  async upload(uploadUrl: string, fileContent: Buffer, mimeType: string): Promise<boolean> {
    const headers = {
      accept: 'application/json, text/plain, */*',
      'content-type': mimeType,
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-version': '2020-04-08',
    };
    try {
      const r = await this.s!.put(uploadUrl, fileContent, { headers, timeout: 60000 });
      return r.status === 201;
    } catch (e) {
      logger.error(`Failed to upload file: ${e}`);
      return false;
    }
  }

  async getDownloadUrlFromUpload(fileId: string): Promise<string> {
    const url = `${this.baseUrl}/files/${fileId}/download`;
    const headers = { ...this.baseHeaders };
    try {
      const r = await this.s!.get(url, { headers, timeout: 5000 });
      if (r.status === 200) return r.data.download_url || '';
      throw new Error(`${r.status}`);
    } catch (e) {
      logger.error(`Failed to get download url: ${e}`);
      return '';
    }
  }

  closeClient(): void {
    if (this.s) {
      this.s.close();
      this.s = null;
    }
    this.ss = null;
  }
}
