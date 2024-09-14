import { CachedResponseType, GlobalCacheInterface } from "../types";


// DEFAULT CACHE CLASS
export class cacheClass implements GlobalCacheInterface {
  data: Map<string, any>;

  constructor() {
    this.data = new Map();
  }

  deserializer(body: string) {
    return JSON.parse(body) as CachedResponseType;
  }

  serializer(body: CachedResponseType) {
    return JSON.stringify(body);
  }

  async evict(key: string): Promise<void> {
    if (!this.data.has(key)) return;
    this.data.delete(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async get(key: string): Promise<any | undefined> {
    return this.data.get(key);
  }

  async cleanup(): Promise<void> {
    this.data.clear();
  }
}