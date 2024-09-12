import { GlobalRouteCache as OriginalGlobalRouteCache } from "./impl.js";

const handler: ProxyHandler<typeof OriginalGlobalRouteCache> = {
  set(target, prop, _1, receiver) {
    if (target !== receiver) {
      throw new Error(
        `Setting property '${prop.toString()}' is restricted to internal implementation only!`
      );
    }
    return target[prop];
  },
  get(target, prop, receiver) {
    const restrictedProps: Set<string | symbol> = new Set([
      "get",
      "post",
      "put",
      "delete",
      "sub",
      "subAll",
    ]);
    if (restrictedProps.has(prop) && target !== receiver) {
      throw new Error(
        "you can't access the 'sub' method from outside the internal implementation"
      );
    }
    return Reflect.get(target, prop, receiver);
  },
};

const GlobalRouteCache = new Proxy(OriginalGlobalRouteCache, handler);

export { GlobalRouteCache };
export default GlobalRouteCache;
