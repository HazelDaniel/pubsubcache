import { CachedResponseType, GlobalCacheInterface } from "../types";
import { RedisClientType } from "redis";
import { createClient } from "redis";


export class RedisCacheClass implements GlobalCacheInterface {
  client: RedisClientType;
  constructor() {
    this.client = createClient();
    this.client.on("error", (err) => {
      console.error("[REDIS]: ", err);
    });

    this.client.on("connect", () => {
      console.log("[REDIS]: a new client acquired");
    });
  }

  deserializer(body: string) {
    return JSON.parse(body) as CachedResponseType;
  }

  serializer(body: CachedResponseType) {
    return body as string;
  }

  async get(key: string): Promise<string | null> {
    return new Promise(async (res, rej) => {
      try {
        res(await this.client.get(key));
      } catch (err) {
        rej(err);
      }
    });
  }

  async set(key: string, value: any): Promise<void> {
    return new Promise(async (res, rej) => {
      try {
        await this.client.set(key, value);
        res();
      } catch (err) {
        rej(err);
      }
    });
  }

  async evict(key: string): Promise<void> {
    return new Promise(async (res, rej) => {
      try {
        await this.client.del(key);
        res();
      } catch (err) {
        rej(err);
      }
    });
  }

  async cleanup(): Promise<void> {
    return new Promise(async (res, rej) => {
      try {
        await this.client.quit();
        res();
      } catch (err) {
        rej(err);
      }
    });
  }
}


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