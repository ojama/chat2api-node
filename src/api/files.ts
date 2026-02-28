import axios from 'axios';
import { imageSize } from 'image-size';

export async function getFileContent(url: string): Promise<[Buffer | null, string | null]> {
  if (url.startsWith('data:')) {
    const [header, base64Data] = url.split(',');
    const mimeType = header.split(':')[1].split(';')[0];
    const fileContent = Buffer.from(base64Data, 'base64');
    return [fileContent, mimeType];
  } else {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
      const fileContent = Buffer.from(response.data);
      const mimeType = (response.headers['content-type'] || '').split(';')[0].trim();
      return [fileContent, mimeType];
    } catch (e) {
      return [null, null];
    }
  }
}

export async function getImageSize(fileContent: Buffer): Promise<[number, number]> {
  const dimensions = imageSize(fileContent);
  return [dimensions.width || 0, dimensions.height || 0];
}

export function determineFileUseCase(mimeType: string): string {
  const multimodalTypes = ['image/jpeg', 'image/webp', 'image/png', 'image/gif'];
  const myFilesTypes = [
    'text/x-php', 'application/msword', 'text/x-c', 'text/html',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json', 'text/javascript', 'application/pdf',
    'text/x-java', 'text/x-tex', 'text/x-typescript', 'text/x-sh',
    'text/x-csharp', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/x-c++', 'text/markdown', 'text/plain', 'text/x-ruby', 'text/x-script.python',
  ];

  if (multimodalTypes.includes(mimeType)) return 'multimodal';
  if (myFilesTypes.includes(mimeType)) return 'my_files';
  return 'ace_upload';
}

export function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'application/pdf': '.pdf',
    'text/markdown': '.md',
    'application/json': '.json',
    'text/javascript': '.js',
    'text/html': '.html',
    'text/x-python': '.py',
    'text/x-script.python': '.py',
    'text/x-typescript': '.ts',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
  };
  return map[mimeType] || '';
}
