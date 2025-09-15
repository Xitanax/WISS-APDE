import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    // Setup API response interceptor to handle 401 errors
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && user) {
          console.log('🚨 401 Error detected, logging out user');
          logout();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Set the authorization header for all requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          console.log('✅ Auth check successful:', response.data);
        } catch (error) {
          console.error('❌ Auth check failed:', error.response?.status, error.response?.data);
          // If token is invalid, clear it
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } else {
        console.log('ℹ️ No token found in localStorage');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }

      console.log('✅ Login successful, token received');
      
      // Store token and set header
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user info
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      
      console.log('✅ User data loaded:', userResponse.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.status, error.response?.data);
      
      // Clean up on failed login
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/public/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Erfolgreich abgemeldet');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};