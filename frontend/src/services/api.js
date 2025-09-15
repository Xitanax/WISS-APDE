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
    
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers.Authorization ? '✅ With Auth' : '❌ No Auth'
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${url} - ${status}`, {
      data: error.response?.data,
      message: error.message
    });

    if (status === 401) {
      console.log('🚨 401 Unauthorized - Clearing auth data');
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      // ENTFERNT: Automatische Umleitung hier
      // Stattdessen wird das von AuthContext/ProtectedRoute gehandhabt
      
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