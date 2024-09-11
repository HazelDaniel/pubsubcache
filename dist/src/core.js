import { GlobalRouteCache as OriginalGlobalRouteCache } from "./impl.js";
const handler = {
    set(target, prop) {
        const restrictedProps = new Set([
            "delimiter",
            "deserializer",
            "serializer",
            "channel",
            "get",
            "post",
            "put",
            "delete",
            "pub",
            "sub",
            "subAll",
        ]);
        if (restrictedProps.has(prop)) {
            throw new Error(`Property '${prop.toString()}' is restricted to internal implementation only!`);
        }
        return target[prop];
    },
};
const GlobalRouteCache = new Proxy(OriginalGlobalRouteCache, handler);
export { GlobalRouteCache };
export default GlobalRouteCache;
