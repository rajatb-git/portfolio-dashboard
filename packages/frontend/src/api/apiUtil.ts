import { AxiosError } from 'axios';

import axios from './axios';

export const catchCustomError = (error: AxiosError<{ name: string; message: string }>) => {
  const customError = new Error(error.response?.data?.message || error.message);
  customError.name = error.response?.data?.name || error.name;

  throw customError;
};

const PENDING_RETRY_MS = 2000;
const PENDING_MAX_ATTEMPTS = 15;

// Market data endpoints answer 202 when the data is being fetched but wasn't
// ready within the backend's deadline. Ask again until it is, so a card keeps
// its skeleton instead of rendering "no data" for something on its way.
export const getUntilReady = async <T>(url: string): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    const response = await axios.get<T>(url);
    if (response.status !== 202) return response.data;
    if (attempt >= PENDING_MAX_ATTEMPTS) throw new Error('Market data is still loading — try refreshing in a minute');
    await new Promise((resolve) => setTimeout(resolve, PENDING_RETRY_MS));
  }
};
