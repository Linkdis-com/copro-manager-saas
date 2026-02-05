import { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      // ✅ CORRIGÉ : Utiliser 'token' au lieu de 'admin_token'
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // ✅ CORRIGÉ : URL Railway en fallback au lieu de chaîne vide
      const API_URL = import.meta.env.VITE_API_URL || 'https://copro-manager-saas-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/v1/admin/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        // ✅ CORRIGÉ : Nettoyer 'token' au lieu de 'admin_token'
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Admin auth check failed:', error);
      // ✅ CORRIGÉ : Nettoyer 'token' au lieu de 'admin_token'
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    // ✅ CORRIGÉ : URL Railway en fallback au lieu de chaîne vide
    const API_URL = import.meta.env.VITE_API_URL || 'https://copro-manager-saas-production.up.railway.app';
    const response = await fetch(`${API_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Échec de la connexion');
    }

    const data = await response.json();
    // ✅ CORRIGÉ : Stocker dans 'token' au lieu de 'admin_token'
    localStorage.setItem('token', data.token);
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    // ✅ CORRIGÉ : Nettoyer 'token' au lieu de 'admin_token'
    localStorage.removeItem('token');
    setAdmin(null);
  };

  const value = {
    admin,
    loading,
    login,
    logout,
    isAuthenticated: !!admin
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
