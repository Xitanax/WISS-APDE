import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else if (error.message === 'Network Error') {
      toast.error('Verbindungsfehler - Server nicht erreichbar');
    } else {
      toast.error('Ein Fehler ist aufgetreten');
    }
    return Promise.reject(error);
  }
);

export default api;
