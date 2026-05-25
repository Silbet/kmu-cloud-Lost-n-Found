import axios from 'axios';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const AUTH_HEADER = import.meta.env.VITE_AUTH_HEADER_NAME || 'Authorization';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('lf_auth_token');
  if (token) {
    config.headers.set(AUTH_HEADER, `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lf_auth_token');
    }
    return Promise.reject(err);
  },
);
