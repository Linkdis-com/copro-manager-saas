import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Building2 } from 'lucide-react';
import MobileMenu from './MobileMenu';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo + Menu mobile */}
          <div className="flex items-center space-x-3">
            {/* Menu hamburger - mobile only */}
            <div className="block md:hidden">
              <MobileMenu />
            </div>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">🏢</span>
              <span className="font-bold text-gray-900 hidden sm:inline">Copro Manager</span>
            </Link>
          </div>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/dashboard" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link 
              to="/immeubles" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Immeubles
            </Link>
            <Link 
              to="/proprietaires" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Propriétaires
            </Link>
            <Link 
              to="/locataires" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Locataires
            </Link>
            <Link 
              to="/decomptes" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Décomptes
            </Link>
          </div>

          {/* User menu - desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-600">
                {user.prenom} {user.nom}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>

          {/* Bouton déconnexion mobile (sans le menu) */}
          <div className="flex md:hidden items-center">
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;