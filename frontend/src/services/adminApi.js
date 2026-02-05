// =====================================================
// 🔧 INSTANCE AXIOS ADMIN
// services/adminApi.js
// =====================================================
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const adminApi = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Interceptor pour ajouter le token admin
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token'); // ⚠️ TOKEN ADMIN
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Interceptor pour gérer les erreurs 401
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Déconnecter l'admin et rediriger vers login admin
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;
