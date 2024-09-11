export type CachedResponseType = {body?: unknown; statusCode?: number; headers?: {} & Express.Locals };

export interface GlobalCacheInterface {
  evict: (key: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: any) => Promise<void>;
  data?: Map<string, any>;
  deserializer: (body: string) => CachedResponseType;
  serializer: (opts: CachedResponseType) => string;
  cleanup: () => Promise<void>;
}
