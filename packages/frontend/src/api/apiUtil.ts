import { AxiosError } from 'axios';

export const catchCustomError = (error: AxiosError<{ name: string; message: string }>) => {
  const customError = new Error(error.response?.data?.message || error.message);
  customError.name = error.response?.data?.name || error.name;

  throw customError;
};
