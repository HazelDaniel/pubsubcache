var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createClient } from "redis";
export class RedisCacheClass {
    constructor() {
        this.client = createClient();
        this.client.on("error", (err) => {
            console.error("[REDIS]: ", err);
        });
        this.client.on("connect", () => {
            console.log("[REDIS]: a new client acquired");
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                try {
                    res(yield this.client.get(key));
                }
                catch (err) {
                    rej(err);
                }
            }));
        });
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.client.set(key, value);
                    res();
                }
                catch (err) {
                    rej(err);
                }
            }));
        });
    }
    evict(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.client.del(key);
                    res();
                }
                catch (err) {
                    rej(err);
                }
            }));
        });
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.client.quit();
                    res();
                }
                catch (err) {
                    rej(err);
                }
            }));
        });
    }
}
// DEFAULT CACHE CLASS
export class cacheClass {
    constructor() {
        this.data = new Map();
    }
    evict(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.data.has(key))
                return;
            this.data.delete(key);
        });
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            this.data.set(key, value);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.data.get(key);
        });
    }
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data.clear();
        });
    }
}
