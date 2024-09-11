export interface GlobalCacheInterface {
  evict: (key: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: any) => Promise<void>;
  data?: Map<string, any>;
  deserializer: (body: string) => unknown;
  serializer: (body: unknown) => string;
  cleanup: () => Promise<void>;
}
