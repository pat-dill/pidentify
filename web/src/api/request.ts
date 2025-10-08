import { isServer } from "@tanstack/react-query";

function getHeaders(customHeaders?: HeadersInit) {
  return {
    ...customHeaders,
    Accept: "application/json",
  };
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

  const headers = getHeaders(opts?.headers);

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
