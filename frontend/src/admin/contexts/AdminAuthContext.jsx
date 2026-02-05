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
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    console.log('🔍 Checking admin authentication...');
    
    try {
      const token = localStorage.getItem('admin_token');
      
      console.log('📝 Token check:', {
        exists: !!token,
        length: token?.length,
        preview: token ? `${token.substring(0, 30)}...` : 'none'
      });

      if (!token) {
        console.log('❌ No admin token found');
        setLoading(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      const url = `${API_URL}/api/v1/admin/auth/verify`;
      
      console.log('🌐 Verifying token at:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Verify response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Admin verified:', {
          id: data.admin?.id,
          email: data.admin?.email,
          role: data.admin?.role
        });
        setAdmin(data.admin);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Token verification failed:', {
          status: response.status,
          error: errorData
        });
        
        localStorage.removeItem('admin_token');
        setError(errorData.error || 'Token invalide');
      }
    } catch (error) {
      console.error('❌ Admin auth check exception:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0]
      });
      
      localStorage.removeItem('admin_token');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    console.log('🔐 Attempting admin login for:', email);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const url = `${API_URL}/api/v1/admin/auth/login`;
      
      console.log('🌐 Login URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('📡 Login response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Login failed:', error);
        throw new Error(error.error || 'Échec de la connexion');
      }

      const data = await response.json();
      
      console.log('✅ Login successful:', {
        hasToken: !!data.token,
        tokenLength: data.token?.length,
        tokenPreview: data.token ? `${data.token.substring(0, 30)}...` : 'none',
        admin: {
          id: data.admin?.id,
          email: data.admin?.email,
          role: data.admin?.role
        }
      });

      localStorage.setItem('admin_token', data.token);
      setAdmin(data.admin);
      setError(null);
      
      return data;
    } catch (error) {
      console.error('❌ Login exception:', error);
      setError(error.message);
      throw error;
    }
  };

  const logout = () => {
    console.log('👋 Admin logout');
    localStorage.removeItem('admin_token');
    setAdmin(null);
    setError(null);
  };

  const value = {
    admin,
    loading,
    error,
    login,
    logout,
    checkAdminAuth,
    isAuthenticated: !!admin
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
