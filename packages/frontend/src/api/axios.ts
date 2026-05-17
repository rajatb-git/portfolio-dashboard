import axios from 'axios';

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token');
  const expiresRaw = sessionStorage.getItem('auth_expires');
  const expires = expiresRaw ? Number(expiresRaw) : 0;
  if (token && expires > Date.now()) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_expires');
      window.dispatchEvent(new Event('auth:locked'));
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
