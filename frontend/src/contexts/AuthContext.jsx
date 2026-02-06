import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false); // 

  // Charger l'utilisateur depuis localStorage au démarrage
useEffect(() => {
  const token = authService.getToken();
  const savedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
  
  if (token && savedUser) {
    setUser(savedUser);
  }
  setLoading(false);
}, []);

  // ✅ AJOUT : Écouter les événements de déconnexion depuis api.js
  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
      setUser(null);
      
      // Afficher le message pendant 3 secondes puis rediriger
      setTimeout(() => {
        window.location.href = '/login?session=expired';
      }, 3000);
    };

    window.addEventListener('session:expired', handleSessionExpired);
    return () => window.removeEventListener('session:expired', handleSessionExpired);
  }, []);

  // Fonction de login
  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      const { accessToken, refreshToken, user: userData } = response.data;
      
      // Sauvegarder dans localStorage
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setSessionExpired(false); // ✅ Réinitialiser le flag
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur de connexion' 
      };
    }
  };

  // Fonction de register
  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      
      // Après l'inscription, on doit se connecter
      if (response.data.success) {
        // L'inscription réussie, maintenant on se connecte automatiquement
        const loginResult = await login(userData.email, userData.password);
        return loginResult;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      
      // Gérer les erreurs du backend
      let errorMessage = 'Erreur lors de l\'inscription';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          return { success: false, error: { errors: errorData.errors } };
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Fonction de logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Toujours nettoyer côté client, même si l'API échoue
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Fonction pour mettre à jour le profil
  const updateProfile = (updatedUser) => {
    const newUser = { ...user, ...updatedUser };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Fonction pour vérifier si le token est expiré
  const isTokenExpired = () => {
    const token = localStorage.getItem('token');
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // Fonction pour rafraîchir le token manuellement si nécessaire
  const refreshTokenIfNeeded = async () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!token || !refreshToken) return false;
    
    // Vérifier si le token expire dans les 5 prochaines minutes
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresIn = payload.exp * 1000 - Date.now();
      
      // Rafraîchir si expire dans moins de 5 minutes
      if (expiresIn < 5 * 60 * 1000) {
        const response = await authService.refreshToken(refreshToken);
        if (response.data.accessToken) {
          localStorage.setItem('token', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          if (response.data.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
          return true;
        }
      }
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Si le refresh échoue, déconnecter l'utilisateur
      logout();
      return false;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isTokenExpired,
    refreshTokenIfNeeded,
    sessionExpired, 
  };

  return (
    <AuthContext.Provider value={value}>
      {/* ✅ AJOUT : Modal session expirée */}
      {sessionExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Session expirée</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Votre session a expiré pour des raisons de sécurité. 
              Veuillez vous reconnecter pour continuer.
            </p>
            <p className="text-sm text-gray-500">
              Redirection vers la page de connexion...
            </p>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;