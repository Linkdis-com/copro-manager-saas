/**
 * Utilitaire centralisé pour les appels API admin
 * Gère automatiquement l'authentification et les erreurs
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Récupère le token admin depuis localStorage
 */
export const getAdminToken = () => {
  return localStorage.getItem('admin_token');
};

/**
 * Vérifie si le token admin existe
 */
export const hasAdminToken = () => {
  return !!getAdminToken();
};

/**
 * Supprime le token admin (logout)
 */
export const removeAdminToken = () => {
  localStorage.removeItem('admin_token');
};

/**
 * Sauvegarde le token admin
 */
export const setAdminToken = (token) => {
  localStorage.setItem('admin_token', token);
};

/**
 * Effectue un appel API admin avec authentification automatique
 * @param {string} endpoint - L'endpoint API (ex: '/invoices', '/clients')
 * @param {object} options - Options fetch (method, body, headers...)
 * @returns {Promise<any>} - Réponse JSON ou throw error
 */
export const adminFetch = async (endpoint, options = {}) => {
  const token = getAdminToken();
  
  if (!token) {
    throw new Error('No admin token found. Please login.');
  }

  // Préparer les headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  // Construire l'URL complète
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_URL}/api/v1/admin${endpoint}`;

  console.log('🔐 Admin API Call:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Log pour déboguer
    console.log('📡 Admin API Response:', {
      url,
      status: response.status,
      ok: response.ok
    });

    // Si 401, le token est invalide
    if (response.status === 401) {
      removeAdminToken();
      throw new Error('Token invalide ou expiré. Veuillez vous reconnecter.');
    }

    // Si autre erreur HTTP
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    // Retourner la réponse JSON
    return await response.json();

  } catch (error) {
    console.error('❌ Admin API Error:', {
      url,
      error: error.message
    });
    throw error;
  }
};

/**
 * Méthodes pratiques pour les verbes HTTP
 */
export const adminApi = {
  get: (endpoint) => adminFetch(endpoint),
  
  post: (endpoint, data) => adminFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (endpoint, data) => adminFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  patch: (endpoint, data) => adminFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  
  delete: (endpoint) => adminFetch(endpoint, {
    method: 'DELETE'
  })
};

export default adminApi;
