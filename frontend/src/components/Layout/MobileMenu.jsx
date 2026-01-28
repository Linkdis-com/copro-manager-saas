// =====================================================
// MOBILE MENU
// frontend/src/components/Layout/MobileMenu.jsx
// =====================================================
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function MobileMenu({ navigation }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  return (
    <>
      {/* Bouton Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu latéral */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header du menu */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🏢</span>
            <span className="font-bold text-gray-900">Copro Manager</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-500">Connecté en tant que</p>
            <p className="font-medium text-gray-900">
              {user.firstName || user.prenom} {user.lastName || user.nom}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer avec déconnexion */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default MobileMenu;
