#!/usr/bin/env bun
// @bun
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// ralph.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync, mkdirSync, statSync } from "fs";
import { join as join2 } from "path";
// node_modules/@opencode-ai/sdk/dist/gen/core/serverSentEvents.gen.js
var createSseClient = ({ onSseError, onSseEvent, responseTransformer, responseValidator, sseDefaultRetryDelay, sseMaxRetryAttempts, sseMaxRetryDelay, sseSleepFn, url, ...options }) => {
  let lastEventId;
  const sleep = sseSleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const createStream = async function* () {
    let retryDelay = sseDefaultRetryDelay ?? 3000;
    let attempt = 0;
    const signal = options.signal ?? new AbortController().signal;
    while (true) {
      if (signal.aborted)
        break;
      attempt++;
      const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      if (lastEventId !== undefined) {
        headers.set("Last-Event-ID", lastEventId);
      }
      try {
        const response = await fetch(url, { ...options, headers, signal });
        if (!response.ok)
          throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
        if (!response.body)
          throw new Error("No body in SSE response");
        const reader = response.body.pipeThrough(new TextDecoderStream).getReader();
        let buffer = "";
        const abortHandler = () => {
          try {
            reader.cancel();
          } catch {}
        };
        signal.addEventListener("abort", abortHandler);
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            buffer += value;
            const chunks = buffer.split(`

`);
            buffer = chunks.pop() ?? "";
            for (const chunk of chunks) {
              const lines = chunk.split(`
`);
              const dataLines = [];
              let eventName;
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  dataLines.push(line.replace(/^data:\s*/, ""));
                } else if (line.startsWith("event:")) {
                  eventName = line.replace(/^event:\s*/, "");
                } else if (line.startsWith("id:")) {
                  lastEventId = line.replace(/^id:\s*/, "");
                } else if (line.startsWith("retry:")) {
                  const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                  if (!Number.isNaN(parsed)) {
                    retryDelay = parsed;
                  }
                }
              }
              let data;
              let parsedJson = false;
              if (dataLines.length) {
                const rawData = dataLines.join(`
`);
                try {
                  data = JSON.parse(rawData);
                  parsedJson = true;
                } catch {
                  data = rawData;
                }
              }
              if (parsedJson) {
                if (responseValidator) {
                  await responseValidator(data);
                }
                if (responseTransformer) {
                  data = await responseTransformer(data);
                }
              }
              onSseEvent?.({
                data,
                event: eventName,
                id: lastEventId,
                retry: retryDelay
              });
              if (dataLines.length) {
                yield data;
              }
            }
          }
        } finally {
          signal.removeEventListener("abort", abortHandler);
          reader.releaseLock();
        }
        break;
      } catch (error) {
        onSseError?.(error);
        if (sseMaxRetryAttempts !== undefined && attempt >= sseMaxRetryAttempts) {
          break;
        }
        const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 30000);
        await sleep(backoff);
      }
    }
  };
  const stream = createStream();
  return { stream };
};

// node_modules/@opencode-ai/sdk/dist/gen/core/auth.gen.js
var getAuthToken = async (auth, callback) => {
  const token = typeof callback === "function" ? await callback(auth) : callback;
  if (!token) {
    return;
  }
  if (auth.scheme === "bearer") {
    return `Bearer ${token}`;
  }
  if (auth.scheme === "basic") {
    return `Basic ${btoa(token)}`;
  }
  return token;
};

// node_modules/@opencode-ai/sdk/dist/gen/core/bodySerializer.gen.js
var jsonBodySerializer = {
  bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value)
};

// node_modules/@opencode-ai/sdk/dist/gen/core/pathSerializer.gen.js
var separatorArrayExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var separatorArrayNoExplode = (style) => {
  switch (style) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
};
var separatorObjectExplode = (style) => {
  switch (style) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
};
var serializeArrayParam = ({ allowReserved, explode, name, style, value }) => {
  if (!explode) {
    const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
    switch (style) {
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      case "simple":
        return joinedValues2;
      default:
        return `${name}=${joinedValues2}`;
    }
  }
  const separator = separatorArrayExplode(style);
  const joinedValues = value.map((v) => {
    if (style === "label" || style === "simple") {
      return allowReserved ? v : encodeURIComponent(v);
    }
    return serializePrimitiveParam({
      allowReserved,
      name,
      value: v
    });
  }).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};
var serializePrimitiveParam = ({ allowReserved, name, value }) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "object") {
    throw new Error("Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.");
  }
  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};
var serializeObjectParam = ({ allowReserved, explode, name, style, value, valueOnly }) => {
  if (value instanceof Date) {
    return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
  }
  if (style !== "deepObject" && !explode) {
    let values = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
    });
    const joinedValues2 = values.join(",");
    switch (style) {
      case "form":
        return `${name}=${joinedValues2}`;
      case "label":
        return `.${joinedValues2}`;
      case "matrix":
        return `;${name}=${joinedValues2}`;
      default:
        return joinedValues2;
    }
  }
  const separator = separatorObjectExplode(style);
  const joinedValues = Object.entries(value).map(([key, v]) => serializePrimitiveParam({
    allowReserved,
    name: style === "deepObject" ? `${name}[${key}]` : key,
    value: v
  })).join(separator);
  return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
};

// node_modules/@opencode-ai/sdk/dist/gen/core/utils.gen.js
var PATH_PARAM_RE = /\{[^{}]+\}/g;
var defaultPathSerializer = ({ path, url: _url }) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE);
  if (matches) {
    for (const match of matches) {
      let explode = false;
      let name = match.substring(1, match.length - 1);
      let style = "simple";
      if (name.endsWith("*")) {
        explode = true;
        name = name.substring(0, name.length - 1);
      }
      if (name.startsWith(".")) {
        name = name.substring(1);
        style = "label";
      } else if (name.startsWith(";")) {
        name = name.substring(1);
        style = "matrix";
      }
      const value = path[name];
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value)) {
        url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
        continue;
      }
      if (typeof value === "object") {
        url = url.replace(match, serializeObjectParam({
          explode,
          name,
          style,
          value,
          valueOnly: true
        }));
        continue;
      }
      if (style === "matrix") {
        url = url.replace(match, `;${serializePrimitiveParam({
          name,
          value
        })}`);
        continue;
      }
      const replaceValue = encodeURIComponent(style === "label" ? `.${value}` : value);
      url = url.replace(match, replaceValue);
    }
  }
  return url;
};
var getUrl = ({ baseUrl, path, query, querySerializer, url: _url }) => {
  const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
  let url = (baseUrl ?? "") + pathUrl;
  if (path) {
    url = defaultPathSerializer({ path, url });
  }
  let search = query ? querySerializer(query) : "";
  if (search.startsWith("?")) {
    search = search.substring(1);
  }
  if (search) {
    url += `?${search}`;
  }
  return url;
};

// node_modules/@opencode-ai/sdk/dist/gen/client/utils.gen.js
var createQuerySerializer = ({ allowReserved, array, object } = {}) => {
  const querySerializer = (queryParams) => {
    const search = [];
    if (queryParams && typeof queryParams === "object") {
      for (const name in queryParams) {
        const value = queryParams[name];
        if (value === undefined || value === null) {
          continue;
        }
        if (Array.isArray(value)) {
          const serializedArray = serializeArrayParam({
            allowReserved,
            explode: true,
            name,
            style: "form",
            value,
            ...array
          });
          if (serializedArray)
            search.push(serializedArray);
        } else if (typeof value === "object") {
          const serializedObject = serializeObjectParam({
            allowReserved,
            explode: true,
            name,
            style: "deepObject",
            value,
            ...object
          });
          if (serializedObject)
            search.push(serializedObject);
        } else {
          const serializedPrimitive = serializePrimitiveParam({
            allowReserved,
            name,
            value
          });
          if (serializedPrimitive)
            search.push(serializedPrimitive);
        }
      }
    }
    return search.join("&");
  };
  return querySerializer;
};
var getParseAs = (contentType) => {
  if (!contentType) {
    return "stream";
  }
  const cleanContent = contentType.split(";")[0]?.trim();
  if (!cleanContent) {
    return;
  }
  if (cleanContent.startsWith("application/json") || cleanContent.endsWith("+json")) {
    return "json";
  }
  if (cleanContent === "multipart/form-data") {
    return "formData";
  }
  if (["application/", "audio/", "image/", "video/"].some((type) => cleanContent.startsWith(type))) {
    return "blob";
  }
  if (cleanContent.startsWith("text/")) {
    return "text";
  }
  return;
};
var checkForExistence = (options, name) => {
  if (!name) {
    return false;
  }
  if (options.headers.has(name) || options.query?.[name] || options.headers.get("Cookie")?.includes(`${name}=`)) {
    return true;
  }
  return false;
};
var setAuthParams = async ({ security, ...options }) => {
  for (const auth of security) {
    if (checkForExistence(options, auth.name)) {
      continue;
    }
    const token = await getAuthToken(auth, options.auth);
    if (!token) {
      continue;
    }
    const name = auth.name ?? "Authorization";
    switch (auth.in) {
      case "query":
        if (!options.query) {
          options.query = {};
        }
        options.query[name] = token;
        break;
      case "cookie":
        options.headers.append("Cookie", `${name}=${token}`);
        break;
      case "header":
      default:
        options.headers.set(name, token);
        break;
    }
  }
};
var buildUrl = (options) => getUrl({
  baseUrl: options.baseUrl,
  path: options.path,
  query: options.query,
  querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer(options.querySerializer),
  url: options.url
});
var mergeConfigs = (a, b) => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith("/")) {
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  }
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};
var mergeHeaders = (...headers) => {
  const mergedHeaders = new Headers;
  for (const header of headers) {
    if (!header || typeof header !== "object") {
      continue;
    }
    const iterator = header instanceof Headers ? header.entries() : Object.entries(header);
    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          mergedHeaders.append(key, v);
        }
      } else if (value !== undefined) {
        mergedHeaders.set(key, typeof value === "object" ? JSON.stringify(value) : value);
      }
    }
  }
  return mergedHeaders;
};

class Interceptors {
  _fns;
  constructor() {
    this._fns = [];
  }
  clear() {
    this._fns = [];
  }
  getInterceptorIndex(id) {
    if (typeof id === "number") {
      return this._fns[id] ? id : -1;
    } else {
      return this._fns.indexOf(id);
    }
  }
  exists(id) {
    const index = this.getInterceptorIndex(id);
    return !!this._fns[index];
  }
  eject(id) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = null;
    }
  }
  update(id, fn) {
    const index = this.getInterceptorIndex(id);
    if (this._fns[index]) {
      this._fns[index] = fn;
      return id;
    } else {
      return false;
    }
  }
  use(fn) {
    this._fns = [...this._fns, fn];
    return this._fns.length - 1;
  }
}
var createInterceptors = () => ({
  error: new Interceptors,
  request: new Interceptors,
  response: new Interceptors
});
var defaultQuerySerializer = createQuerySerializer({
  allowReserved: false,
  array: {
    explode: true,
    style: "form"
  },
  object: {
    explode: true,
    style: "deepObject"
  }
});
var defaultHeaders = {
  "Content-Type": "application/json"
};
var createConfig = (override = {}) => ({
  ...jsonBodySerializer,
  headers: defaultHeaders,
  parseAs: "auto",
  querySerializer: defaultQuerySerializer,
  ...override
});

// node_modules/@opencode-ai/sdk/dist/gen/client/client.gen.js
var createClient = (config = {}) => {
  let _config = mergeConfigs(createConfig(), config);
  const getConfig = () => ({ ..._config });
  const setConfig = (config2) => {
    _config = mergeConfigs(_config, config2);
    return getConfig();
  };
  const interceptors = createInterceptors();
  const beforeRequest = async (options) => {
    const opts = {
      ..._config,
      ...options,
      fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
      headers: mergeHeaders(_config.headers, options.headers),
      serializedBody: undefined
    };
    if (opts.security) {
      await setAuthParams({
        ...opts,
        security: opts.security
      });
    }
    if (opts.requestValidator) {
      await opts.requestValidator(opts);
    }
    if (opts.body && opts.bodySerializer) {
      opts.serializedBody = opts.bodySerializer(opts.body);
    }
    if (opts.serializedBody === undefined || opts.serializedBody === "") {
      opts.headers.delete("Content-Type");
    }
    const url = buildUrl(opts);
    return { opts, url };
  };
  const request = async (options) => {
    const { opts, url } = await beforeRequest(options);
    const requestInit = {
      redirect: "follow",
      ...opts,
      body: opts.serializedBody
    };
    let request2 = new Request(url, requestInit);
    for (const fn of interceptors.request._fns) {
      if (fn) {
        request2 = await fn(request2, opts);
      }
    }
    const _fetch = opts.fetch;
    let response = await _fetch(request2);
    for (const fn of interceptors.response._fns) {
      if (fn) {
        response = await fn(response, request2, opts);
      }
    }
    const result = {
      request: request2,
      response
    };
    if (response.ok) {
      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return opts.responseStyle === "data" ? {} : {
          data: {},
          ...result
        };
      }
      const parseAs = (opts.parseAs === "auto" ? getParseAs(response.headers.get("Content-Type")) : opts.parseAs) ?? "json";
      let data;
      switch (parseAs) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          data = await response[parseAs]();
          break;
        case "stream":
          return opts.responseStyle === "data" ? response.body : {
            data: response.body,
            ...result
          };
      }
      if (parseAs === "json") {
        if (opts.responseValidator) {
          await opts.responseValidator(data);
        }
        if (opts.responseTransformer) {
          data = await opts.responseTransformer(data);
        }
      }
      return opts.responseStyle === "data" ? data : {
        data,
        ...result
      };
    }
    const textError = await response.text();
    let jsonError;
    try {
      jsonError = JSON.parse(textError);
    } catch {}
    const error = jsonError ?? textError;
    let finalError = error;
    for (const fn of interceptors.error._fns) {
      if (fn) {
        finalError = await fn(error, response, request2, opts);
      }
    }
    finalError = finalError || {};
    if (opts.throwOnError) {
      throw finalError;
    }
    return opts.responseStyle === "data" ? undefined : {
      error: finalError,
      ...result
    };
  };
  const makeMethod = (method) => {
    const fn = (options) => request({ ...options, method });
    fn.sse = async (options) => {
      const { opts, url } = await beforeRequest(options);
      return createSseClient({
        ...opts,
        body: opts.body,
        headers: opts.headers,
        method,
        url
      });
    };
    return fn;
  };
  return {
    buildUrl,
    connect: makeMethod("CONNECT"),
    delete: makeMethod("DELETE"),
    get: makeMethod("GET"),
    getConfig,
    head: makeMethod("HEAD"),
    interceptors,
    options: makeMethod("OPTIONS"),
    patch: makeMethod("PATCH"),
    post: makeMethod("POST"),
    put: makeMethod("PUT"),
    request,
    setConfig,
    trace: makeMethod("TRACE")
  };
};
// node_modules/@opencode-ai/sdk/dist/gen/core/params.gen.js
var extraPrefixesMap = {
  $body_: "body",
  $headers_: "headers",
  $path_: "path",
  $query_: "query"
};
var extraPrefixes = Object.entries(extraPrefixesMap);
// node_modules/@opencode-ai/sdk/dist/gen/client.gen.js
var client = createClient(createConfig({
  baseUrl: "http://localhost:4096"
}));

// node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.js
class _HeyApiClient {
  _client = client;
  constructor(args) {
    if (args?.client) {
      this._client = args.client;
    }
  }
}

class Project extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/project",
      ...options
    });
  }
  current(options) {
    return (options?.client ?? this._client).get({
      url: "/project/current",
      ...options
    });
  }
}

class Config extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/config",
      ...options
    });
  }
  update(options) {
    return (options?.client ?? this._client).patch({
      url: "/config",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  providers(options) {
    return (options?.client ?? this._client).get({
      url: "/config/providers",
      ...options
    });
  }
}

class Tool extends _HeyApiClient {
  ids(options) {
    return (options?.client ?? this._client).get({
      url: "/experimental/tool/ids",
      ...options
    });
  }
  list(options) {
    return (options.client ?? this._client).get({
      url: "/experimental/tool",
      ...options
    });
  }
}

class Path extends _HeyApiClient {
  get(options) {
    return (options?.client ?? this._client).get({
      url: "/path",
      ...options
    });
  }
}

class Session extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/session",
      ...options
    });
  }
  create(options) {
    return (options?.client ?? this._client).post({
      url: "/session",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  delete(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}",
      ...options
    });
  }
  get(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}",
      ...options
    });
  }
  update(options) {
    return (options.client ?? this._client).patch({
      url: "/session/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  children(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/children",
      ...options
    });
  }
  todo(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/todo",
      ...options
    });
  }
  init(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/init",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  fork(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/fork",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  abort(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/abort",
      ...options
    });
  }
  unshare(options) {
    return (options.client ?? this._client).delete({
      url: "/session/{id}/share",
      ...options
    });
  }
  share(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/share",
      ...options
    });
  }
  diff(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/diff",
      ...options
    });
  }
  summarize(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/summarize",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  messages(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message",
      ...options
    });
  }
  prompt(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/message",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  message(options) {
    return (options.client ?? this._client).get({
      url: "/session/{id}/message/{messageID}",
      ...options
    });
  }
  command(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  shell(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/shell",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  revert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/revert",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  unrevert(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/unrevert",
      ...options
    });
  }
}

class Command extends _HeyApiClient {
  list(options) {
    return (options?.client ?? this._client).get({
      url: "/command",
      ...options
    });
  }
}

class Find extends _HeyApiClient {
  text(options) {
    return (options.client ?? this._client).get({
      url: "/find",
      ...options
    });
  }
  files(options) {
    return (options.client ?? this._client).get({
      url: "/find/file",
      ...options
    });
  }
  symbols(options) {
    return (options.client ?? this._client).get({
      url: "/find/symbol",
      ...options
    });
  }
}

class File extends _HeyApiClient {
  list(options) {
    return (options.client ?? this._client).get({
      url: "/file",
      ...options
    });
  }
  read(options) {
    return (options.client ?? this._client).get({
      url: "/file/content",
      ...options
    });
  }
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/file/status",
      ...options
    });
  }
}

class App extends _HeyApiClient {
  log(options) {
    return (options?.client ?? this._client).post({
      url: "/log",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  agents(options) {
    return (options?.client ?? this._client).get({
      url: "/agent",
      ...options
    });
  }
}

class Mcp extends _HeyApiClient {
  status(options) {
    return (options?.client ?? this._client).get({
      url: "/mcp",
      ...options
    });
  }
}

class Control extends _HeyApiClient {
  next(options) {
    return (options?.client ?? this._client).get({
      url: "/tui/control/next",
      ...options
    });
  }
  response(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/control/response",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
}

class Tui extends _HeyApiClient {
  appendPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/append-prompt",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  openHelp(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-help",
      ...options
    });
  }
  openSessions(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-sessions",
      ...options
    });
  }
  openThemes(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-themes",
      ...options
    });
  }
  openModels(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/open-models",
      ...options
    });
  }
  submitPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/submit-prompt",
      ...options
    });
  }
  clearPrompt(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/clear-prompt",
      ...options
    });
  }
  executeCommand(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/execute-command",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  showToast(options) {
    return (options?.client ?? this._client).post({
      url: "/tui/show-toast",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  control = new Control({ client: this._client });
}

class Auth extends _HeyApiClient {
  set(options) {
    return (options.client ?? this._client).put({
      url: "/auth/{id}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
}

class Event extends _HeyApiClient {
  subscribe(options) {
    return (options?.client ?? this._client).get.sse({
      url: "/event",
      ...options
    });
  }
}

class OpencodeClient extends _HeyApiClient {
  postSessionIdPermissionsPermissionId(options) {
    return (options.client ?? this._client).post({
      url: "/session/{id}/permissions/{permissionID}",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  }
  project = new Project({ client: this._client });
  config = new Config({ client: this._client });
  tool = new Tool({ client: this._client });
  path = new Path({ client: this._client });
  session = new Session({ client: this._client });
  command = new Command({ client: this._client });
  find = new Find({ client: this._client });
  file = new File({ client: this._client });
  app = new App({ client: this._client });
  mcp = new Mcp({ client: this._client });
  tui = new Tui({ client: this._client });
  auth = new Auth({ client: this._client });
  event = new Event({ client: this._client });
}
// node_modules/@opencode-ai/sdk/dist/server.js
var {spawn} = (() => ({}));
// src/sdk/client.ts
var {existsSync, readFileSync} = (() => ({}));

// node:path
function assertPath(path) {
  if (typeof path !== "string")
    throw TypeError("Path must be a string. Received " + JSON.stringify(path));
}
function normalizeStringPosix(path, allowAboveRoot) {
  var res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, code;
  for (var i = 0;i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47)
      break;
    else
      code = 47;
    if (code === 47) {
      if (lastSlash === i - 1 || dots === 1)
        ;
      else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1)
                res = "", lastSegmentLength = 0;
              else
                res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
              lastSlash = i, dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = "", lastSegmentLength = 0, lastSlash = i, dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += "/..";
          else
            res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += "/" + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i, dots = 0;
    } else if (code === 46 && dots !== -1)
      ++dots;
    else
      dots = -1;
  }
  return res;
}
function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root, base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
  if (!dir)
    return base;
  if (dir === pathObject.root)
    return dir + base;
  return dir + sep + base;
}
function resolve() {
  var resolvedPath = "", resolvedAbsolute = false, cwd;
  for (var i = arguments.length - 1;i >= -1 && !resolvedAbsolute; i--) {
    var path;
    if (i >= 0)
      path = arguments[i];
    else {
      if (cwd === undefined)
        cwd = process.cwd();
      path = cwd;
    }
    if (assertPath(path), path.length === 0)
      continue;
    resolvedPath = path + "/" + resolvedPath, resolvedAbsolute = path.charCodeAt(0) === 47;
  }
  if (resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute), resolvedAbsolute)
    if (resolvedPath.length > 0)
      return "/" + resolvedPath;
    else
      return "/";
  else if (resolvedPath.length > 0)
    return resolvedPath;
  else
    return ".";
}
function normalize(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var isAbsolute = path.charCodeAt(0) === 47, trailingSeparator = path.charCodeAt(path.length - 1) === 47;
  if (path = normalizeStringPosix(path, !isAbsolute), path.length === 0 && !isAbsolute)
    path = ".";
  if (path.length > 0 && trailingSeparator)
    path += "/";
  if (isAbsolute)
    return "/" + path;
  return path;
}
function isAbsolute(path) {
  return assertPath(path), path.length > 0 && path.charCodeAt(0) === 47;
}
function join() {
  if (arguments.length === 0)
    return ".";
  var joined;
  for (var i = 0;i < arguments.length; ++i) {
    var arg = arguments[i];
    if (assertPath(arg), arg.length > 0)
      if (joined === undefined)
        joined = arg;
      else
        joined += "/" + arg;
  }
  if (joined === undefined)
    return ".";
  return normalize(joined);
}
function relative(from, to) {
  if (assertPath(from), assertPath(to), from === to)
    return "";
  if (from = resolve(from), to = resolve(to), from === to)
    return "";
  var fromStart = 1;
  for (;fromStart < from.length; ++fromStart)
    if (from.charCodeAt(fromStart) !== 47)
      break;
  var fromEnd = from.length, fromLen = fromEnd - fromStart, toStart = 1;
  for (;toStart < to.length; ++toStart)
    if (to.charCodeAt(toStart) !== 47)
      break;
  var toEnd = to.length, toLen = toEnd - toStart, length = fromLen < toLen ? fromLen : toLen, lastCommonSep = -1, i = 0;
  for (;i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === 47)
          return to.slice(toStart + i + 1);
        else if (i === 0)
          return to.slice(toStart + i);
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === 47)
          lastCommonSep = i;
        else if (i === 0)
          lastCommonSep = 0;
      }
      break;
    }
    var fromCode = from.charCodeAt(fromStart + i), toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode)
      break;
    else if (fromCode === 47)
      lastCommonSep = i;
  }
  var out = "";
  for (i = fromStart + lastCommonSep + 1;i <= fromEnd; ++i)
    if (i === fromEnd || from.charCodeAt(i) === 47)
      if (out.length === 0)
        out += "..";
      else
        out += "/..";
  if (out.length > 0)
    return out + to.slice(toStart + lastCommonSep);
  else {
    if (toStart += lastCommonSep, to.charCodeAt(toStart) === 47)
      ++toStart;
    return to.slice(toStart);
  }
}
function _makeLong(path) {
  return path;
}
function dirname(path) {
  if (assertPath(path), path.length === 0)
    return ".";
  var code = path.charCodeAt(0), hasRoot = code === 47, end = -1, matchedSlash = true;
  for (var i = path.length - 1;i >= 1; --i)
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else
      matchedSlash = false;
  if (end === -1)
    return hasRoot ? "/" : ".";
  if (hasRoot && end === 1)
    return "//";
  return path.slice(0, end);
}
function basename(path, ext) {
  if (ext !== undefined && typeof ext !== "string")
    throw TypeError('"ext" argument must be a string');
  assertPath(path);
  var start = 0, end = -1, matchedSlash = true, i;
  if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
    if (ext.length === path.length && ext === path)
      return "";
    var extIdx = ext.length - 1, firstNonSlashEnd = -1;
    for (i = path.length - 1;i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else {
        if (firstNonSlashEnd === -1)
          matchedSlash = false, firstNonSlashEnd = i + 1;
        if (extIdx >= 0)
          if (code === ext.charCodeAt(extIdx)) {
            if (--extIdx === -1)
              end = i;
          } else
            extIdx = -1, end = firstNonSlashEnd;
      }
    }
    if (start === end)
      end = firstNonSlashEnd;
    else if (end === -1)
      end = path.length;
    return path.slice(start, end);
  } else {
    for (i = path.length - 1;i >= 0; --i)
      if (path.charCodeAt(i) === 47) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1)
        matchedSlash = false, end = i + 1;
    if (end === -1)
      return "";
    return path.slice(start, end);
  }
}
function extname(path) {
  assertPath(path);
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, preDotState = 0;
  for (var i = path.length - 1;i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    return "";
  return path.slice(startDot, end);
}
function format(pathObject) {
  if (pathObject === null || typeof pathObject !== "object")
    throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
  return _format("/", pathObject);
}
function parse(path) {
  assertPath(path);
  var ret = { root: "", dir: "", base: "", ext: "", name: "" };
  if (path.length === 0)
    return ret;
  var code = path.charCodeAt(0), isAbsolute2 = code === 47, start;
  if (isAbsolute2)
    ret.root = "/", start = 1;
  else
    start = 0;
  var startDot = -1, startPart = 0, end = -1, matchedSlash = true, i = path.length - 1, preDotState = 0;
  for (;i >= start; --i) {
    if (code = path.charCodeAt(i), code === 47) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1)
      matchedSlash = false, end = i + 1;
    if (code === 46) {
      if (startDot === -1)
        startDot = i;
      else if (preDotState !== 1)
        preDotState = 1;
    } else if (startDot !== -1)
      preDotState = -1;
  }
  if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    if (end !== -1)
      if (startPart === 0 && isAbsolute2)
        ret.base = ret.name = path.slice(1, end);
      else
        ret.base = ret.name = path.slice(startPart, end);
  } else {
    if (startPart === 0 && isAbsolute2)
      ret.name = path.slice(1, startDot), ret.base = path.slice(1, end);
    else
      ret.name = path.slice(startPart, startDot), ret.base = path.slice(startPart, end);
    ret.ext = path.slice(startDot, end);
  }
  if (startPart > 0)
    ret.dir = path.slice(0, startPart - 1);
  else if (isAbsolute2)
    ret.dir = "/";
  return ret;
}
var sep = "/";
var delimiter = ":";
var posix = ((p) => (p.posix = p, p))({ resolve, normalize, isAbsolute, join, relative, _makeLong, dirname, basename, extname, format, parse, sep, delimiter, win32: null, posix: null });

// ralph.ts
var __dirname = "/Users/torugo/go/src/github.com/victorhsb/opencode-ralph";
var VERSION = process.env.npm_package_version || (existsSync2(join2(__dirname, "package.json")) ? JSON.parse(readFileSync2(join2(__dirname, "package.json"), "utf-8")).version : "2.0.0");
var stateDir = join2(process.cwd(), ".ralph");
var statePath = join2(stateDir, "ralph-loop.state.json");
var contextPath = join2(stateDir, "ralph-context.md");
var historyPath = join2(stateDir, "ralph-history.json");
var tasksPath = join2(stateDir, "ralph-tasks.md");
var supervisorMemoryPath = join2(stateDir, "supervisor-memory.md");
var supervisorSuggestionsPath = join2(stateDir, "supervisor-suggestions.json");
var args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Ralph Wiggum Loop - Iterative AI development with OpenCode

Usage:
  ralph "<prompt>" [options]
  ralph --prompt-file <path> [options]

Arguments:
  prompt              Task description for the AI to work on

Options:
  --model MODEL       Model to use (e.g., anthropic/claude-sonnet-4)
  --min-iterations N  Minimum iterations before completion allowed (default: 1)
  --max-iterations N  Maximum iterations before stopping (default: unlimited)
  --completion-promise TEXT  Phrase that signals completion (default: COMPLETE)
  --abort-promise TEXT  Phrase that signals early abort (e.g., precondition failed)
  --tasks, -t         Enable Tasks Mode for structured task tracking
  --task-promise TEXT Phrase that signals task completion (default: READY_FOR_NEXT_TASK)
  --supervisor       Enable post-iteration supervisor loop
  --supervisor-model MODEL  Supervisor model
  --supervisor-no-action-promise TEXT  Promise for no-op supervisor run (default: NO_ACTION_NEEDED)
  --supervisor-suggestion-promise TEXT Promise when supervisor suggests change (default: USER_DECISION_REQUIRED)
  --supervisor-memory-limit N  Number of supervisor memory entries to keep (default: 20)
  --supervisor-prompt-template PATH  Custom prompt template for supervisor
  --prompt-file, --file, -f  Read prompt content from a file
  --prompt-template PATH  Use custom prompt template (supports variables)
  --no-stream         Buffer output and print at the end
  --verbose-tools     Print every tool line (disable compact tool summary)
  --no-plugins        Disable non-auth OpenCode plugins for this run
  --no-commit         Don't auto-commit after each iteration
  --allow-all         Auto-approve all tool permissions (default: on)
  --no-allow-all      Require interactive permission prompts
  --version, -v       Show version
  --help, -h          Show this help

Commands:
  --status            Show current Ralph loop status and history
  --status --tasks    Show status including current task list
  --add-context TEXT  Add context for the next iteration (or edit .ralph/ralph-context.md)
  --clear-context     Clear any pending context
  --list-tasks        Display the current task list with indices
  --add-task "desc"   Add a new task to the list
  --remove-task N     Remove task at index N (including subtasks)
  --list-suggestions  Show supervisor suggestions and statuses
  --approve-suggestion ID  Approve and apply a pending supervisor suggestion
  --reject-suggestion ID   Reject a pending supervisor suggestion

Examples:
  ralph "Build a REST API for todos"
  ralph "Fix the auth bug" --max-iterations 10
  ralph "Add tests" --completion-promise "ALL TESTS PASS" --model anthropic/claude-sonnet-4
  ralph --prompt-file ./prompt.md --max-iterations 5
  ralph --status                                        # Check loop status
  ralph --add-context "Focus on the auth module first"  # Add hint for next iteration

How it works:
  1. Sends your prompt to OpenCode via SDK
  2. OpenCode works on the task
  3. Checks output for completion promise
  4. If not complete, repeats with same prompt
  5. OpenCode sees its previous work in files
  6. Continues until promise detected or max iterations

To stop manually: Ctrl+C

Learn more: https://ghuntley.com/ralph/
`);
  process.exit(0);
}
if (args.includes("--version") || args.includes("-v")) {
  console.log(`ralph ${VERSION}`);
  process.exit(0);
}
function loadHistory() {
  if (!existsSync2(historyPath)) {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }
  try {
    return JSON.parse(readFileSync2(historyPath, "utf-8"));
  } catch {
    return {
      iterations: [],
      totalDurationMs: 0,
      struggleIndicators: { repeatedErrors: {}, noProgressIterations: 0, shortIterations: 0 }
    };
  }
}
function ensureStateDir() {
  if (!existsSync2(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
}
function loadSupervisorSuggestions(path = supervisorSuggestionsPath) {
  if (!existsSync2(path)) {
    return { suggestions: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync2(path, "utf-8"));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.suggestions)) {
      return { suggestions: [] };
    }
    const suggestions = parsed.suggestions.filter((item) => item && typeof item === "object");
    return { suggestions };
  } catch {
    return { suggestions: [], parseError: `Could not parse suggestions file at ${path}` };
  }
}
function saveSupervisorSuggestions(store, path = supervisorSuggestionsPath) {
  ensureStateDir();
  writeFileSync(path, JSON.stringify(store, null, 2));
}
function appendContextEntry(contextText) {
  ensureStateDir();
  const timestamp = new Date().toISOString();
  const newEntry = `
## Context added at ${timestamp}
${contextText}
`;
  if (existsSync2(contextPath)) {
    const existing = readFileSync2(contextPath, "utf-8");
    writeFileSync(contextPath, existing + newEntry);
  } else {
    writeFileSync(contextPath, `# Ralph Loop Context
${newEntry}`);
  }
}
function appendTaskEntry(taskDescription) {
  ensureStateDir();
  let tasksContent = "";
  if (existsSync2(tasksPath)) {
    tasksContent = readFileSync2(tasksPath, "utf-8");
  } else {
    tasksContent = `# Ralph Tasks

`;
  }
  const newTaskContent = tasksContent.trimEnd() + `
` + `- [ ] ${taskDescription}
`;
  writeFileSync(tasksPath, newTaskContent);
}
function displaySupervisorSuggestions(store) {
  if (store.suggestions.length === 0) {
    console.log("No supervisor suggestions found.");
    return;
  }
  console.log("Supervisor suggestions:");
  for (const suggestion of store.suggestions) {
    console.log(`- ${suggestion.id} [${suggestion.status}] iteration ${suggestion.iteration}`);
    console.log(`  ${suggestion.kind}: ${suggestion.title}`);
    if (suggestion.details) {
      console.log(`  details: ${suggestion.details}`);
    }
  }
}
function applyApprovedSuggestion(suggestion) {
  try {
    if (suggestion.kind === "add_task") {
      const taskText = suggestion.proposedChanges.task ?? suggestion.details;
      if (!taskText?.trim()) {
        return { ok: false, error: "missing task text in suggestion payload" };
      }
      appendTaskEntry(taskText.trim());
      return { ok: true };
    }
    if (suggestion.kind === "add_context") {
      const contextText = suggestion.proposedChanges.context ?? suggestion.details;
      if (!contextText?.trim()) {
        return { ok: false, error: "missing context text in suggestion payload" };
      }
      appendContextEntry(contextText.trim());
      return { ok: true };
    }
    return { ok: false, error: `unsupported suggestion kind: ${suggestion.kind}` };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
if (args.includes("--status")) {
  const state = loadState();
  const history = loadHistory();
  const context = existsSync2(contextPath) ? readFileSync2(contextPath, "utf-8").trim() : null;
  const supervisorSuggestions = loadSupervisorSuggestions();
  const pendingSuggestions = supervisorSuggestions.suggestions.filter((s) => s.status === "pending").length;
  const showTasks = args.includes("--tasks") || args.includes("-t") || state?.tasksMode;
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                    Ralph Wiggum Status                           \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  if (state?.active) {
    const elapsed = Date.now() - new Date(state.startedAt).getTime();
    const elapsedStr = formatDurationLong(elapsed);
    console.log(`\uD83D\uDD04 ACTIVE LOOP`);
    console.log(`   Iteration:    ${state.iteration}${state.maxIterations > 0 ? ` / ${state.maxIterations}` : " (unlimited)"}`);
    console.log(`   Started:      ${state.startedAt}`);
    console.log(`   Elapsed:      ${elapsedStr}`);
    console.log(`   Promise:      ${state.completionPromise}`);
    if (state.model)
      console.log(`   Model:        ${state.model}`);
    if (state.tasksMode) {
      console.log(`   Tasks Mode:   ENABLED`);
      console.log(`   Task Promise: ${state.taskPromise}`);
    }
    console.log(`   Prompt:       ${state.prompt.substring(0, 60)}${state.prompt.length > 60 ? "..." : ""}`);
    if (state.supervisor?.enabled) {
      console.log(`   Supervisor:   ENABLED`);
      if (state.supervisor.model) {
        console.log(`   Sup Model:    ${state.supervisor.model}`);
      }
      console.log(`   Sup Pending:  ${pendingSuggestions}`);
      if (state.supervisorState?.pausedForDecision) {
        console.log(`   Sup Status:   waiting for user decision`);
      }
    }
  } else {
    console.log(`\u23F9\uFE0F  No active loop`);
  }
  if (context) {
    console.log(`
\uD83D\uDCDD PENDING CONTEXT (will be injected next iteration):`);
    console.log(`   ${context.split(`
`).join(`
   `)}`);
  }
  if (supervisorSuggestions.parseError) {
    console.log(`
\u26A0\uFE0F  SUPERVISOR DATA WARNING: ${supervisorSuggestions.parseError}`);
  }
  if (showTasks) {
    if (existsSync2(tasksPath)) {
      try {
        const tasksContent = readFileSync2(tasksPath, "utf-8");
        const tasks = parseTasks(tasksContent);
        if (tasks.length > 0) {
          console.log(`
\uD83D\uDCCB CURRENT TASKS:`);
          for (let i = 0;i < tasks.length; i++) {
            const task = tasks[i];
            const statusIcon = task.status === "complete" ? "\u2705" : task.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
            console.log(`   ${i + 1}. ${statusIcon} ${task.text}`);
            for (const subtask of task.subtasks) {
              const subStatusIcon = subtask.status === "complete" ? "\u2705" : subtask.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
              console.log(`      ${subStatusIcon} ${subtask.text}`);
            }
          }
          const complete = tasks.filter((t) => t.status === "complete").length;
          const inProgress = tasks.filter((t) => t.status === "in-progress").length;
          console.log(`
   Progress: ${complete}/${tasks.length} complete, ${inProgress} in progress`);
        } else {
          console.log(`
\uD83D\uDCCB CURRENT TASKS: (no tasks found)`);
        }
      } catch {
        console.log(`
\uD83D\uDCCB CURRENT TASKS: (error reading tasks)`);
      }
    } else {
      console.log(`
\uD83D\uDCCB CURRENT TASKS: (no tasks file found)`);
    }
  }
  if (history.iterations.length > 0) {
    console.log(`
\uD83D\uDCCA HISTORY (${history.iterations.length} iterations)`);
    console.log(`   Total time:   ${formatDurationLong(history.totalDurationMs)}`);
    const recent = history.iterations.slice(-5);
    console.log(`
   Recent iterations:`);
    for (const iter of recent) {
      const tools = Object.entries(iter.toolsUsed).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(" ");
      const modelLabel = iter.model ?? "unknown";
      console.log(`   #${iter.iteration}  ${formatDurationLong(iter.durationMs)}  ${modelLabel}  ${tools || "no tools"}`);
    }
    const struggle = history.struggleIndicators;
    const hasRepeatedErrors = Object.values(struggle.repeatedErrors).some((count) => count >= 2);
    if (struggle.noProgressIterations >= 3 || struggle.shortIterations >= 3 || hasRepeatedErrors) {
      console.log(`
\u26A0\uFE0F  STRUGGLE INDICATORS:`);
      if (struggle.noProgressIterations >= 3) {
        console.log(`   - No file changes in ${struggle.noProgressIterations} iterations`);
      }
      if (struggle.shortIterations >= 3) {
        console.log(`   - ${struggle.shortIterations} very short iterations (< 30s)`);
      }
      const topErrors = Object.entries(struggle.repeatedErrors).filter(([_, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
      for (const [error, count] of topErrors) {
        console.log(`   - Same error ${count}x: "${error.substring(0, 50)}..."`);
      }
      console.log(`
   \uD83D\uDCA1 Consider using: ralph --add-context "your hint here"`);
    }
  }
  console.log("");
  process.exit(0);
}
if (args.includes("--list-suggestions")) {
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  displaySupervisorSuggestions(store);
  process.exit(0);
}
var approveSuggestionIdx = args.indexOf("--approve-suggestion");
if (approveSuggestionIdx !== -1) {
  const suggestionId = args[approveSuggestionIdx + 1];
  if (!suggestionId) {
    console.error("Error: --approve-suggestion requires an ID");
    process.exit(1);
  }
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  const suggestion = store.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) {
    console.error(`Error: Suggestion not found: ${suggestionId}`);
    process.exit(1);
  }
  if (suggestion.status !== "pending") {
    console.error(`Error: Suggestion ${suggestionId} is already ${suggestion.status}`);
    process.exit(1);
  }
  suggestion.status = "approved";
  suggestion.decidedAt = new Date().toISOString();
  const applied = applyApprovedSuggestion(suggestion);
  if (applied.ok) {
    suggestion.status = "applied";
    suggestion.appliedAt = new Date().toISOString();
    console.log(`\u2705 Suggestion ${suggestionId} approved and applied`);
  } else {
    suggestion.status = "failed";
    suggestion.error = applied.error;
    console.error(`\u274C Suggestion ${suggestionId} approved but failed to apply: ${applied.error}`);
    saveSupervisorSuggestions(store);
    process.exit(1);
  }
  saveSupervisorSuggestions(store);
  process.exit(0);
}
var rejectSuggestionIdx = args.indexOf("--reject-suggestion");
if (rejectSuggestionIdx !== -1) {
  const suggestionId = args[rejectSuggestionIdx + 1];
  if (!suggestionId) {
    console.error("Error: --reject-suggestion requires an ID");
    process.exit(1);
  }
  const store = loadSupervisorSuggestions();
  if (store.parseError) {
    console.error(`Error: ${store.parseError}`);
    process.exit(1);
  }
  const suggestion = store.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) {
    console.error(`Error: Suggestion not found: ${suggestionId}`);
    process.exit(1);
  }
  if (suggestion.status !== "pending") {
    console.error(`Error: Suggestion ${suggestionId} is already ${suggestion.status}`);
    process.exit(1);
  }
  suggestion.status = "rejected";
  suggestion.decidedAt = new Date().toISOString();
  saveSupervisorSuggestions(store);
  console.log(`\u2705 Suggestion ${suggestionId} rejected`);
  process.exit(0);
}
var addContextIdx = args.indexOf("--add-context");
if (addContextIdx !== -1) {
  const contextText = args[addContextIdx + 1];
  if (!contextText) {
    console.error("Error: --add-context requires a text argument");
    console.error('Usage: ralph --add-context "Your context or hint here"');
    process.exit(1);
  }
  appendContextEntry(contextText);
  console.log(`\u2705 Context added for next iteration`);
  console.log(`   File: ${contextPath}`);
  const state = loadState();
  if (state?.active) {
    console.log(`   Will be picked up in iteration ${state.iteration + 1}`);
  } else {
    console.log(`   Will be used when loop starts`);
  }
  process.exit(0);
}
if (args.includes("--clear-context")) {
  if (existsSync2(contextPath)) {
    __require("fs").unlinkSync(contextPath);
    console.log(`\u2705 Context cleared`);
  } else {
    console.log(`\u2139\uFE0F  No pending context to clear`);
  }
  process.exit(0);
}
if (args.includes("--list-tasks")) {
  if (!existsSync2(tasksPath)) {
    console.log("No tasks file found. Use --add-task to create your first task.");
    process.exit(0);
  }
  try {
    const tasksContent = readFileSync2(tasksPath, "utf-8");
    const tasks = parseTasks(tasksContent);
    displayTasksWithIndices(tasks);
  } catch (error) {
    console.error("Error reading tasks file:", error);
    process.exit(1);
  }
  process.exit(0);
}
var addTaskIdx = args.indexOf("--add-task");
if (addTaskIdx !== -1) {
  const taskDescription = args[addTaskIdx + 1];
  if (!taskDescription) {
    console.error("Error: --add-task requires a description");
    console.error('Usage: ralph --add-task "Task description"');
    process.exit(1);
  }
  try {
    appendTaskEntry(taskDescription);
    console.log(`\u2705 Task added: "${taskDescription}"`);
  } catch (error) {
    console.error("Error adding task:", error);
    process.exit(1);
  }
  process.exit(0);
}
var removeTaskIdx = args.indexOf("--remove-task");
if (removeTaskIdx !== -1) {
  const taskIndexStr = args[removeTaskIdx + 1];
  if (!taskIndexStr || isNaN(parseInt(taskIndexStr))) {
    console.error("Error: --remove-task requires a valid number");
    console.error("Usage: ralph --remove-task 3");
    process.exit(1);
  }
  const taskIndex = parseInt(taskIndexStr);
  if (!existsSync2(tasksPath)) {
    console.error("Error: No tasks file found");
    process.exit(1);
  }
  try {
    const tasksContent = readFileSync2(tasksPath, "utf-8");
    const tasks = parseTasks(tasksContent);
    if (taskIndex < 1 || taskIndex > tasks.length) {
      console.error(`Error: Task index ${taskIndex} is out of range (1-${tasks.length})`);
      process.exit(1);
    }
    const lines = tasksContent.split(`
`);
    const newLines = [];
    let inRemovedTask = false;
    let currentTaskLine = 0;
    for (const line of lines) {
      if (line.match(/^- \[/)) {
        currentTaskLine++;
        if (currentTaskLine === taskIndex) {
          inRemovedTask = true;
          continue;
        } else {
          inRemovedTask = false;
        }
      }
      if (inRemovedTask && line.match(/^\s+/) && line.trim() !== "") {
        continue;
      }
      newLines.push(line);
    }
    writeFileSync(tasksPath, newLines.join(`
`));
    console.log(`\u2705 Removed task ${taskIndex} and its subtasks`);
  } catch (error) {
    console.error("Error removing task:", error);
    process.exit(1);
  }
  process.exit(0);
}
function formatDurationLong(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
function parseTasks(content) {
  const tasks = [];
  const lines = content.split(`
`);
  let currentTask = null;
  for (const line of lines) {
    const topLevelMatch = line.match(/^- \[([ x\/])\]\s*(.+)/);
    if (topLevelMatch) {
      if (currentTask) {
        tasks.push(currentTask);
      }
      const [, statusChar, text] = topLevelMatch;
      let status = "todo";
      if (statusChar === "x")
        status = "complete";
      else if (statusChar === "/")
        status = "in-progress";
      currentTask = { text, status, subtasks: [], originalLine: line };
      continue;
    }
    const subtaskMatch = line.match(/^\s+- \[([ x\/])\]\s*(.+)/);
    if (subtaskMatch && currentTask) {
      const [, statusChar, text] = subtaskMatch;
      let status = "todo";
      if (statusChar === "x")
        status = "complete";
      else if (statusChar === "/")
        status = "in-progress";
      currentTask.subtasks.push({ text, status, subtasks: [], originalLine: line });
    }
  }
  if (currentTask) {
    tasks.push(currentTask);
  }
  return tasks;
}
function displayTasksWithIndices(tasks) {
  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }
  console.log("Current tasks:");
  for (let i = 0;i < tasks.length; i++) {
    const task = tasks[i];
    const statusIcon = task.status === "complete" ? "\u2705" : task.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
    console.log(`${i + 1}. ${statusIcon} ${task.text}`);
    for (const subtask of task.subtasks) {
      const subStatusIcon = subtask.status === "complete" ? "\u2705" : subtask.status === "in-progress" ? "\uD83D\uDD04" : "\u23F8\uFE0F";
      console.log(`   ${subStatusIcon} ${subtask.text}`);
    }
  }
}
var prompt = "";
var minIterations = 1;
var maxIterations = 0;
var completionPromise = "COMPLETE";
var abortPromise = "";
var tasksMode = false;
var taskPromise = "READY_FOR_NEXT_TASK";
var model = "";
var autoCommit = true;
var disablePlugins = false;
var allowAllPermissions = true;
var promptFile = "";
var promptTemplatePath = "";
var streamOutput = true;
var verboseTools = false;
var promptSource = "";
var supervisorEnabled = false;
var supervisorModel = "";
var supervisorNoActionPromise = "NO_ACTION_NEEDED";
var supervisorSuggestionPromise = "USER_DECISION_REQUIRED";
var supervisorMemoryLimit = 20;
var supervisorPromptTemplatePath = "";
var supervisorOptionsTouched = false;
var promptParts = [];
var extraAgentFlags = [];
var doubleDashIndex = args.indexOf("--");
if (doubleDashIndex !== -1) {
  extraAgentFlags = args.slice(doubleDashIndex + 1);
  args.splice(doubleDashIndex);
}
for (let i = 0;i < args.length; i++) {
  const arg = args[i];
  if (arg === "--min-iterations") {
    const val = args[++i];
    if (!val || isNaN(parseInt(val))) {
      console.error("Error: --min-iterations requires a number");
      process.exit(1);
    }
    minIterations = parseInt(val);
  } else if (arg === "--max-iterations") {
    const val = args[++i];
    if (!val || isNaN(parseInt(val))) {
      console.error("Error: --max-iterations requires a number");
      process.exit(1);
    }
    maxIterations = parseInt(val);
  } else if (arg === "--completion-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --completion-promise requires a value");
      process.exit(1);
    }
    completionPromise = val;
  } else if (arg === "--abort-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --abort-promise requires a value");
      process.exit(1);
    }
    abortPromise = val;
  } else if (arg === "--tasks" || arg === "-t") {
    tasksMode = true;
  } else if (arg === "--task-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --task-promise requires a value");
      process.exit(1);
    }
    taskPromise = val;
  } else if (arg === "--model") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --model requires a value");
      process.exit(1);
    }
    model = val;
  } else if (arg === "--supervisor") {
    supervisorEnabled = true;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-model") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-model requires a value");
      process.exit(1);
    }
    supervisorModel = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-no-action-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-no-action-promise requires a value");
      process.exit(1);
    }
    supervisorNoActionPromise = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-suggestion-promise") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-suggestion-promise requires a value");
      process.exit(1);
    }
    supervisorSuggestionPromise = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-memory-limit") {
    const val = args[++i];
    if (!val || isNaN(parseInt(val))) {
      console.error("Error: --supervisor-memory-limit requires a number");
      process.exit(1);
    }
    supervisorMemoryLimit = parseInt(val, 10);
    if (supervisorMemoryLimit <= 0) {
      console.error("Error: --supervisor-memory-limit must be greater than 0");
      process.exit(1);
    }
    supervisorOptionsTouched = true;
  } else if (arg === "--supervisor-prompt-template") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --supervisor-prompt-template requires a file path");
      process.exit(1);
    }
    supervisorPromptTemplatePath = val;
    supervisorOptionsTouched = true;
  } else if (arg === "--prompt-file" || arg === "--file" || arg === "-f") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --prompt-file requires a file path");
      process.exit(1);
    }
    promptFile = val;
  } else if (arg === "--prompt-template") {
    const val = args[++i];
    if (!val) {
      console.error("Error: --prompt-template requires a file path");
      process.exit(1);
    }
    promptTemplatePath = val;
  } else if (arg === "--no-stream") {
    streamOutput = false;
  } else if (arg === "--stream") {
    streamOutput = true;
  } else if (arg === "--verbose-tools") {
    verboseTools = true;
  } else if (arg === "--no-commit") {
    autoCommit = false;
  } else if (arg === "--no-plugins") {
    disablePlugins = true;
  } else if (arg === "--allow-all") {
    allowAllPermissions = true;
  } else if (arg === "--no-allow-all") {
    allowAllPermissions = false;
  } else if (arg.startsWith("-")) {
    console.error(`Error: Unknown option: ${arg}`);
    console.error("Run 'ralph --help' for available options");
    process.exit(1);
  } else {
    promptParts.push(arg);
  }
}
if (supervisorOptionsTouched) {
  supervisorEnabled = true;
}
function readPromptFile(path) {
  if (!existsSync2(path)) {
    console.error(`Error: Prompt file not found: ${path}`);
    process.exit(1);
  }
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      console.error(`Error: Prompt path is not a file: ${path}`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: Unable to stat prompt file: ${path}`);
    process.exit(1);
  }
  try {
    const content = readFileSync2(path, "utf-8");
    if (!content.trim()) {
      console.error(`Error: Prompt file is empty: ${path}`);
      process.exit(1);
    }
    return content;
  } catch {
    console.error(`Error: Unable to read prompt file: ${path}`);
    process.exit(1);
  }
}
if (promptFile) {
  promptSource = promptFile;
  prompt = readPromptFile(promptFile);
} else if (promptParts.length === 1 && existsSync2(promptParts[0])) {
  promptSource = promptParts[0];
  prompt = readPromptFile(promptParts[0]);
} else {
  prompt = promptParts.join(" ");
}
if (!prompt) {
  const existingState = loadState();
  if (existingState?.active) {
    prompt = existingState.prompt;
  } else {
    console.error("Error: No prompt provided");
    console.error('Usage: ralph "Your task description" [options]');
    console.error("Run 'ralph --help' for more information");
    process.exit(1);
  }
}
if (maxIterations > 0 && minIterations > maxIterations) {
  console.error(`Error: --min-iterations (${minIterations}) cannot be greater than --max-iterations (${maxIterations})`);
  process.exit(1);
}
function loadState() {
  if (!existsSync2(statePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync2(statePath, "utf-8"));
  } catch {
    return null;
  }
}
