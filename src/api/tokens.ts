import { get_encoding, encoding_for_model, TiktokenModel } from 'tiktoken';

export function calculateImageTokens(width: number, height: number, detail: string): number {
  if (detail === 'low') return 85;

  let w = width, h = height;
  const maxDim = Math.max(w, h);
  if (maxDim > 2048) {
    const scale = 2048 / maxDim;
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  const minDim = Math.min(w, h);
  if (minDim > 768) {
    const scale = 768 / minDim;
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  const numMasksW = Math.ceil(w / 512);
  const numMasksH = Math.ceil(h / 512);
  return numMasksW * numMasksH * 170 + 85;
}

export function numTokensFromMessages(messages: any[], model = ''): number {
  let enc;
  try {
    enc = encoding_for_model(model as TiktokenModel);
  } catch {
    enc = get_encoding('cl100k_base');
  }

  const tokensPerMessage = model === 'gpt-3.5-turbo-0301' ? 4 : 3;
  let numTokens = 0;

  for (const message of messages) {
    numTokens += tokensPerMessage;
    for (const [, value] of Object.entries(message)) {
      if (Array.isArray(value)) {
        for (const item of value as any[]) {
          if (item.type === 'text') numTokens += enc.encode(item.text).length;
        }
      } else if (typeof value === 'string') {
        numTokens += enc.encode(value).length;
      }
    }
  }
  numTokens += 3;
  enc.free();
  return numTokens;
}

export function splitTokensFromContent(
  content: string,
  maxTokens: number,
  model?: string,
): [string, number, string] {
  let enc;
  try {
    enc = encoding_for_model((model || 'gpt-3.5-turbo') as TiktokenModel);
  } catch {
    enc = get_encoding('cl100k_base');
  }

  const encoded = enc.encode(content);
  enc.free();

  if (encoded.length >= maxTokens) {
    const truncated = content.substring(0, Math.floor(content.length * maxTokens / encoded.length));
    return [truncated, maxTokens, 'length'];
  }
  return [content, encoded.length, 'stop'];
}
