import { isServer } from "@tanstack/react-query";

async function getHeaders(customHeaders?: HeadersInit): Promise<HeadersInit> {
  // Convert HeadersInit to a plain object for easier manipulation
  const headersObj: Record<string, string> = {};

  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headersObj[key] = value;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        headersObj[key] = value;
      });
    } else {
      Object.assign(headersObj, customHeaders);
    }
  }

  headersObj["Accept"] = "application/json";

  // Forward session cookie from Next.js to API server when on server side
  if (isServer) {
    try {
      const nextHeaders = await import("next/headers");
      // In Next.js 15, cookies() may return a Promise in some contexts
      const cookieStore = await nextHeaders.cookies();
      const sessionCookie = cookieStore.get("session");
      if (sessionCookie) {
        // Add Cookie header to forward the session cookie
        headersObj["Cookie"] = `session=${sessionCookie.value}`;
      }
    } catch (e) {
      // cookies() can only be called in Server Components/Route Handlers
      // If it fails, continue without the cookie
    }
  }

  return headersObj;
}

interface RequestOpts {
  formData?: FormData;
  data?: any;
  body?: string;
  headers?: HeadersInit;
  withCredentials?: boolean;
}

export function getBaseUrl() {
  return isServer ? process.env.API_PROXY : "";
}

export async function request(
  method: string,
  path: string,
  opts?: RequestOpts,
) {
  opts ??= {};

  const headers = await getHeaders(opts?.headers);

  const requestOptions: RequestInit = {
    method: method,
    headers: headers,
    credentials: opts?.withCredentials ? "include" : "same-origin",
  };

  if (opts.data) {
    requestOptions.body = JSON.stringify(opts.data);
    requestOptions.headers = {
      ...requestOptions.headers,
      "Content-Type": "application/json",
    };
  } else if (opts.body) {
    requestOptions.body = opts.body;
  } else if (opts.formData) {
    requestOptions.body = opts.formData;
  }

  const url = `${getBaseUrl()}${path}`;

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      // noinspection ExceptionCaughtLocallyJS
      throw response;
    }

    return response;
  } catch (e) {
    if (!isServer) {
      console.warn(e);
    }

    throw e;
  }
}

export function get(path: string, headers?: HeadersInit) {
  return request("GET", path, { headers });
}

export function post(
  path: string,
  data?: any,
  headers?: HeadersInit,
  opts?: RequestOpts,
) {
  return request("POST", path, { data, headers, ...opts });
}

export function patch(
  path: string,
  data?: any,
  headers?: HeadersInit,
  opts?: RequestOpts,
) {
  return request("PATCH", path, { data, headers, ...opts });
}

export function delete_(
  path: string,
  data?: any,
  headers?: HeadersInit,
  opts?: RequestOpts,
) {
  return request("DELETE", path, { data, headers, ...opts });
}
