if (!("replaceAll" in String.prototype)) {
  String.prototype["replaceAll"] = function (search: string, replace: string) {
    if (typeof search === "string") {
      search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    }
    return this.replace(new RegExp(search, "g"), replace);
  };
}

export const dynamicReplace = (
  inputString: string,
  opts: Record<string, string>
): string => {
  const optsKeyQueue = Object.keys(opts);
  const optsValueQueue = Object.values(opts);
  let resString = inputString;

  while (optsKeyQueue.length && optsValueQueue.length) {
    const [currKey, currVal] = [
      optsKeyQueue.pop() as string,
      optsValueQueue.pop() as string,
    ];
    resString = resString.replace(currKey, currVal);
  }
  return resString;
};

const wildCompare = (
  string1: string,
  string2: string,
  start1: number,
  start2: number,
  len1: number,
  len2: number
): boolean => {
  if (start1 === len1) {
    if (string2[start2] === "*") {
      return wildCompare(string1, string2, start1, start2 + 1, len1, len2);
    }
    return start2 === len2;
  }

  if (string2[start2] === "*") {
    return (
      wildCompare(string1, string2, start1 + 1, start2, len1, len2) ||
      wildCompare(string1, string2, start1, start2 + 1, len1, len2)
    );
  }
  if (string1[start1] === string2[start2]) {
    return wildCompare(string1, string2, start1 + 1, start2 + 1, len1, len2);
  }

  if (string2[start2] === "*" && string2[start2 + 1] === undefined) return true;
  if (string1[start1] === "*" && string1[start1 + 1] === undefined) return true;

  return false;
};

const matchGlob = (string1: string, regexString: string): boolean => {
  const resRegex = new RegExp("^" + regexString["replaceAll"]("*", ".*"));
  return resRegex.test(string1);
};

export const dynamicMatch = (
  inputString: string,
  pattern: string,
  delimiter: string,
  segmentIndicator: string | undefined = undefined
): boolean => {
  let segmentMode = !!segmentIndicator;
  if (segmentIndicator === "*") {
    throw new Error("you cannot use a global match as a segment indicator");
  }
  if (inputString.endsWith(delimiter)) inputString = inputString.slice(0, -1);
  if (pattern.endsWith(delimiter)) pattern = pattern.slice(0, -1);
  const patternChunk = pattern.split(delimiter);
  const inputChunk = inputString.split(delimiter);

  if (pattern.indexOf("*") !== -1) {
    return matchGlob(inputString, pattern);
  }

  if (inputChunk.length !== patternChunk.length) return false;
  if (!inputString.length || !pattern.length) return pattern === inputString;
  if (inputString.length === 1 && pattern.length === 1)
    return pattern === inputString;

  let matchCount = 0;

  for (let i = 0; i < inputChunk.length; i++) {
    if (inputChunk[i] === patternChunk[i]) {
      matchCount++;
    } else if (
      segmentMode &&
      patternChunk[i].startsWith(segmentIndicator!) &&
      !inputChunk[i].startsWith(segmentIndicator!)
    ) {
      matchCount++;
    } else {
      break;
    }
  }
  return matchCount === inputChunk.length;
};

export const wait = (seconds: number): Promise<void> => {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, seconds * 1000);
  });
};

export const handleTrailing: (url: string) => string = (url) => {
  if (url.length === 1) return url;
  if (url.endsWith("/")) return url.slice(0, -1);
  return url;
};
