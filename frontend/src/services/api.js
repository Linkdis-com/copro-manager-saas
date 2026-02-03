import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/')) return Promise.reject(error);
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/api/v1/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken, user } = response.data;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.accessToken) {
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  logoutAll: () => api.post('/auth/logout-all'),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  getToken: () => localStorage.getItem('token'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  isAuthenticated: () => !!localStorage.getItem('token'),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
};

export const immeublesService = {
  getAll: () => api.get('/immeubles'),
  getOne: (id) => api.get(`/immeubles/${id}`),
  create: (data) => api.post('/immeubles', data),
  update: (id, data) => api.patch(`/immeubles/${id}`, data),
  delete: (id) => api.delete(`/immeubles/${id}`),
};

export const proprietairesService = {
  getByImmeuble: (immeubleId) => api.get(`/immeubles/${immeubleId}/proprietaires`),
  getOne: (immeubleId, id) => api.get(`/immeubles/${immeubleId}/proprietaires/${id}`),
  create: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/proprietaires`, data),
  update: (immeubleId, id, data) => api.patch(`/immeubles/${immeubleId}/proprietaires/${id}`, data),
  delete: (immeubleId, id) => api.delete(`/immeubles/${immeubleId}/proprietaires/${id}`),
};

export const locatairesService = {
  getByImmeuble: (immeubleId) => api.get(`/immeubles/${immeubleId}/locataires`),
  getOne: (immeubleId, id) => api.get(`/immeubles/${immeubleId}/locataires/${id}`),
  create: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/locataires`, data),
  update: (immeubleId, id, data) => api.patch(`/immeubles/${immeubleId}/locataires/${id}`, data),
  delete: (immeubleId, id) => api.delete(`/immeubles/${immeubleId}/locataires/${id}`),
};

export const decomptesEauService = {
  getAll: () => api.get('/decomptes'),
  getById: (id) => api.get(`/decomptes/${id}`),
  create: (data) => api.post('/decomptes', data),
  update: (id, data) => api.patch(`/decomptes/${id}`, data),
  delete: (id) => api.delete(`/decomptes/${id}`),
  calculer: (id) => api.post(`/decomptes/${id}/calculer`),
  validate: (id) => api.post(`/decomptes/${id}/validate`),
  getCategories: () => api.get('/decomptes/categories')
};

export const tarifsEauService = {
  getAll: () => api.get('/tarifs-eau'),
  getById: (id) => api.get(`/tarifs-eau/${id}`),
  create: (data) => api.post('/tarifs-eau', data),
  update: (id, data) => api.patch(`/tarifs-eau/${id}`, data),
  delete: (id) => api.delete(`/tarifs-eau/${id}`)
};

export const compteursEauService = {
  getAll: (immeubleId) => api.get(`/immeubles/${immeubleId}/compteurs-eau`),
  getByImmeuble: (immeubleId) => api.get(`/immeubles/${immeubleId}/compteurs-eau`),
  create: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/compteurs-eau`, data),
  update: (immeubleId, id, data) => api.patch(`/immeubles/${immeubleId}/compteurs-eau/${id}`, data),
  delete: (immeubleId, id) => api.delete(`/immeubles/${immeubleId}/compteurs-eau/${id}`)
};

export const relevesEauService = {
  getByDecompte: (decompteId) => api.get(`/decomptes/${decompteId}/releves`),
  create: (decompteId, data) => api.post(`/decomptes/${decompteId}/releves`, data),
  bulkImport: (decompteId, releves) => api.post(`/decomptes/${decompteId}/releves/bulk`, { releves }),
  getTemplate: (decompteId) => api.get(`/decomptes/${decompteId}/releves/template`),
  update: (decompteId, id, data) => api.patch(`/decomptes/${decompteId}/releves/${id}`, data),
  delete: (decompteId, id) => api.delete(`/decomptes/${decompteId}/releves/${id}`)
};

export const relevesService = relevesEauService;

export const fournisseursService = {
  getAll: (immeubleId) => api.get(`/immeubles/${immeubleId}/fournisseurs`),
  getCategories: (immeubleId) => api.get(`/immeubles/${immeubleId}/fournisseurs/categories`),
  create: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/fournisseurs`, data),
  update: (immeubleId, id, data) => api.patch(`/immeubles/${immeubleId}/fournisseurs/${id}`, data),
  delete: (immeubleId, id) => api.delete(`/immeubles/${immeubleId}/fournisseurs/${id}`)
};

// ✅ CORRIGÉ: import → importBulk
export const transactionsService = {
  getAll: (immeubleId, params) => api.get(`/immeubles/${immeubleId}/transactions`, { params }),
  getStats: (immeubleId) => api.get(`/immeubles/${immeubleId}/transactions/stats`),
  importBulk: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/transactions/import`, data),
  create: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/transactions`, data),
  update: (immeubleId, id, data) => api.patch(`/immeubles/${immeubleId}/transactions/${id}`, data),
  delete: (immeubleId, id) => api.delete(`/immeubles/${immeubleId}/transactions/${id}`)
};

export const exercicesService = {
  getAll: (immeubleId) => api.get(`/immeubles/${immeubleId}/exercices`),
  getOne: (immeubleId, exerciceId) => api.get(`/immeubles/${immeubleId}/exercices/${exerciceId}`),
  create: (immeubleId, data) => api.post(`/immeubles/${immeubleId}/exercices`, data),
  cloturer: (immeubleId, exerciceId, data = {}) => 
    api.post(`/immeubles/${immeubleId}/exercices/${exerciceId}/cloturer`, data),
  getSoldeProprietaire: (immeubleId, exerciceId, proprietaireId) => 
    api.get(`/immeubles/${immeubleId}/exercices/${exerciceId}/proprietaires/${proprietaireId}/solde`),
  getDecompteAnnuel: (immeubleId, exerciceId, proprietaireId) => 
    api.get(`/immeubles/${immeubleId}/exercices/${exerciceId}/proprietaires/${proprietaireId}/decompte`),
  createAppel: (immeubleId, exerciceId, data) => 
    api.post(`/immeubles/${immeubleId}/exercices/${exerciceId}/appels`, data),
  enregistrerPaiement: (immeubleId, appelId, proprietaireId, data) => 
    api.post(`/immeubles/${immeubleId}/exercices/appels/${appelId}/proprietaires/${proprietaireId}/paiement`, data),
};

export const subscriptionsService = {
  getPlans: () => api.get('/subscriptions/plans'),
  getMySubscription: () => api.get('/subscriptions/me'),
  checkLimit: (resource) => api.get(`/subscriptions/check/${resource}`),
  changePlan: (planCode, billingCycle = 'monthly') => 
    api.post('/subscriptions/change-plan', { planCode, billingCycle }),
  getInvoices: () => api.get('/subscriptions/invoices'),
};

// ✅ SERVICES SYSTÈME EAU
export const eauConfigService = {
  getConfig: (immeubleId) => api.get(`/eau/configuration/${immeubleId}`),
  saveConfig: (immeubleId, config) => api.post(`/eau/configuration/${immeubleId}`, config),
  updateConfig: (immeubleId, config) => api.patch(`/eau/configuration/${immeubleId}`, config),
};

export const eauRelevesService = {
  saveReleves: (immeubleId, data) => api.post(`/eau/releves/${immeubleId}`, data),
  getReleves: (immeubleId, params) => api.get(`/eau/releves/${immeubleId}`, { params }),
};

export default api;
