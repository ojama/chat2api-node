import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
import { modelSystemFingerprint } from '../api/models';
import { calculateImageTokens, numTokensFromMessages, splitTokensFromContent } from '../api/tokens';
import { getFileContent } from '../api/files';

function randomChatId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return 'chatcmpl-' + Array.from({ length: 29 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function pickFingerprint(model: string): string | null {
  const list = modelSystemFingerprint[model];
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export async function* streamResponse(
  service: any,
  response: Readable,
  model: string,
  maxTokens: number,
): AsyncGenerator<string> {
  const chatId = randomChatId();
  const createdTime = Math.floor(Date.now() / 1000);
  const systemFingerprint = pickFingerprint(model);

  // Send initial chunk with role
  const initialChunk: any = {
    id: chatId,
    object: 'chat.completion.chunk',
    created: createdTime,
    model,
    choices: [{ index: 0, delta: { role: 'assistant', content: '' }, logprobs: null, finish_reason: null }],
  };
  if (systemFingerprint) initialChunk.system_fingerprint = systemFingerprint;
  yield `data: ${JSON.stringify(initialChunk)}\n\n`;

  let buffer = '';
  let modelSlug = model;
  // Track the last text sent to compute deltas
  let lastText = '';

  for await (const rawChunk of response) {
    buffer += (rawChunk as Buffer).toString('utf-8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed === 'data: [DONE]') {
        logger.info(`Response Model: ${modelSlug}`);
        // Send finish chunk
        const finishChunk: any = {
          id: chatId,
          object: 'chat.completion.chunk',
          created: createdTime,
          model: modelSlug,
          choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: 'stop' }],
        };
        if (systemFingerprint) finishChunk.system_fingerprint = systemFingerprint;
        yield `data: ${JSON.stringify(finishChunk)}\n\n`;
        yield 'data: [DONE]\n\n';
        return;
      }

      if (!trimmed.startsWith('data: {')) continue;

      let chunkData: any;
      try {
        chunkData = JSON.parse(trimmed.slice(6));
      } catch {
        continue;
      }

      const message = chunkData.message;
      if (!message) continue;

      const role = message.author?.role;
      if (role === 'user' || role === 'system') continue;

      const status: string = message.status || '';
      modelSlug = message.metadata?.model_slug || modelSlug;

      const content = message.content;
      if (!content) continue;

      const contentType: string = content.content_type || '';
      const parts: any[] = content.parts || [];

      if (contentType === 'text') {
        const fullText: string = parts.filter((p: any) => typeof p === 'string').join('');

        if (status === 'finished_successfully') {
          const [truncated, , finishReason] = splitTokensFromContent(fullText, maxTokens, model);
          // Send only the delta (new content since last emission)
          const delta = truncated.slice(lastText.length);
          if (delta) {
            const chunkOut: any = {
              id: chatId,
              object: 'chat.completion.chunk',
              created: createdTime,
              model: modelSlug,
              choices: [{ index: 0, delta: { content: delta }, logprobs: null, finish_reason: null }],
            };
            if (systemFingerprint) chunkOut.system_fingerprint = systemFingerprint;
            yield `data: ${JSON.stringify(chunkOut)}\n\n`;
          }
          lastText = truncated;

          // Send finish chunk
          const finishChunk: any = {
            id: chatId,
            object: 'chat.completion.chunk',
            created: createdTime,
            model: modelSlug,
            choices: [{ index: 0, delta: {}, logprobs: null, finish_reason: finishReason }],
          };
          if (systemFingerprint) finishChunk.system_fingerprint = systemFingerprint;
          yield `data: ${JSON.stringify(finishChunk)}\n\n`;
          yield 'data: [DONE]\n\n';
          return;
        } else if (status === 'in_progress' || status === 'finished_partially') {
          const delta = fullText.slice(lastText.length);
          if (delta) {
            const chunkOut: any = {
              id: chatId,
              object: 'chat.completion.chunk',
              created: createdTime,
              model: modelSlug,
              choices: [{ index: 0, delta: { content: delta }, logprobs: null, finish_reason: null }],
            };
            if (systemFingerprint) chunkOut.system_fingerprint = systemFingerprint;
            yield `data: ${JSON.stringify(chunkOut)}\n\n`;
            lastText = fullText;
          }
        }
      }

      // Handle error detail embedded in message
      if (chunkData.error) {
        logger.error(`Error from ChatGPT: ${JSON.stringify(chunkData.error)}`);
        yield 'data: [DONE]\n\n';
        return;
      }
    }
  }

  yield 'data: [DONE]\n\n';
}

export async function formatNotStreamResponse(
  responseGen: AsyncGenerator<string>,
  promptTokens: number,
  maxTokens: number,
  model: string,
): Promise<any> {
  const chatId = randomChatId();
  const systemFingerprint = pickFingerprint(model);
  const createdTime = Math.floor(Date.now() / 1000);
  let allText = '';
  let modelSlug = model;

  for await (const chunk of responseGen) {
    if (chunk.startsWith('data: [DONE]')) break;
    if (!chunk.startsWith('data: ')) continue;
    try {
      const data = JSON.parse(chunk.slice(6));
      const delta = data.choices?.[0]?.delta;
      if (delta?.content) allText += delta.content;
      if (data.model) modelSlug = data.model;
    } catch {
      continue;
    }
  }

  const [content, completionTokens, finishReason] = splitTokensFromContent(allText, maxTokens, model);

  if (!content) {
    throw Object.assign(new Error('No content in the message.'), { statusCode: 403 });
  }

  const data: any = {
    id: chatId,
    object: 'chat.completion',
    created: createdTime,
    model: modelSlug,
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      logprobs: null,
      finish_reason: finishReason,
    }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
  if (systemFingerprint) data.system_fingerprint = systemFingerprint;
  return data;
}

export async function apiMessagesToChatMessages(
  service: any,
  apiMessages: any[],
  uploadByUrl = false,
): Promise<[any[], number]> {
  let fileTokens = 0;
  const chatMessages = [];

  for (const apiMessage of apiMessages) {
    const role = apiMessage.role;
    const content = apiMessage.content;

    let contentType = 'text';
    let parts: any[] = [];
    let metadata: any = {};

    if (Array.isArray(content)) {
      contentType = 'multimodal_text';
      const attachments: any[] = [];

      for (const item of content) {
        if (item.type === 'text') {
          parts.push(item.text);
        } else if (item.type === 'image_url') {
          const imageUrl = item.image_url?.url;
          const detail = item.image_url?.detail || 'auto';
          if (imageUrl) {
            const [fileContent, mimeType] = await getFileContent(imageUrl);
            if (fileContent && mimeType) {
              const fileMeta = await service.uploadFile(fileContent, mimeType);
              if (fileMeta) {
                if (mimeType.startsWith('image/')) {
                  fileTokens += calculateImageTokens(fileMeta.width || 0, fileMeta.height || 0, detail);
                  parts.push({
                    content_type: 'image_asset_pointer',
                    asset_pointer: `file-service://${fileMeta.file_id}`,
                    size_bytes: fileMeta.size_bytes,
                    width: fileMeta.width,
                    height: fileMeta.height,
                  });
                  attachments.push({
                    id: fileMeta.file_id,
                    size: fileMeta.size_bytes,
                    name: fileMeta.file_name,
                    mime_type: mimeType,
                    width: fileMeta.width,
                    height: fileMeta.height,
                  });
                }
              }
            }
          }
        }
      }
      metadata = { attachments };
    } else {
      contentType = 'text';
      parts = [content];
      metadata = {};
    }

    chatMessages.push({
      id: uuidv4(),
      author: { role },
      content: { content_type: contentType, parts },
      metadata,
    });
  }

  const textTokens = numTokensFromMessages(apiMessages, service.respModel);
  return [chatMessages, textTokens + fileTokens];
}
