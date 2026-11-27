import axios, { type InternalAxiosRequestConfig } from 'axios';

import { browserRequests, type LoggedRequest, nextRequestId, redactHeaders } from '@/utils/requestLog';

const axiosInstance = axios.create();

const logged = new WeakMap<InternalAxiosRequestConfig, LoggedRequest>();

const finishLog = (config: InternalAxiosRequestConfig | undefined, patch: Partial<LoggedRequest>) => {
  const entry = config && logged.get(config);
  if (entry) browserRequests.upsert({ ...entry, endedAt: Date.now(), ...patch });
};

axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token');
  const expiresRaw = sessionStorage.getItem('auth_expires');
  const expires = expiresRaw ? Number(expiresRaw) : 0;
  if (token && expires > Date.now()) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const entry: LoggedRequest = {
    id: nextRequestId(),
    direction: 'out',
    method: (config.method ?? 'get').toUpperCase(),
    url: axiosInstance.getUri(config),
    startedAt: Date.now(),
    requestHeaders: redactHeaders(config.headers),
    requestBody: config.data,
  };
  logged.set(config, entry);
  browserRequests.upsert(entry);
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    finishLog(response.config, {
      status: response.status,
      responseHeaders: redactHeaders(response.headers),
      responseBody: response.data,
    });
    return response;
  },
  (error) => {
    finishLog(error?.config, {
      status: error?.response?.status,
      error: error?.message,
      responseHeaders: redactHeaders(error?.response?.headers),
      responseBody: error?.response?.data,
    });
    if (error?.response?.status === 401) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_expires');
      window.dispatchEvent(new Event('auth:locked'));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
