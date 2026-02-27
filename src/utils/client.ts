import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';

export class Client {
  private session: AxiosInstance;
  private streamSession: AxiosInstance;
  private proxyUrl: string | null;

  constructor(options: { proxy?: string | null; timeout?: number } = {}) {
    this.proxyUrl = options.proxy || null;
    const timeout = (options.timeout || 15) * 1000;

    const config: AxiosRequestConfig = {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
    };

    if (this.proxyUrl) {
      const agent = this.proxyUrl.startsWith('https')
        ? new HttpsProxyAgent(this.proxyUrl)
        : new HttpProxyAgent(this.proxyUrl);
      config.httpAgent = agent;
      config.httpsAgent = agent;
    }

    this.session = axios.create(config);
    this.streamSession = axios.create({ ...config, responseType: 'stream' });
  }

  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.session.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.session.post(url, data, config);
  }

  async postStream(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.streamSession.post(url, data, { ...config, responseType: 'stream' });
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.session.put(url, data, config);
  }

  close(): void {
    // axios instances don't need explicit closing
  }
}
