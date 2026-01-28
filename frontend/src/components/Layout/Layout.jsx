// =====================================================
// LAYOUT PRINCIPAL - Desktop + Mobile
// frontend/src/components/Layout/Layout.jsx
// =====================================================
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, Building2, Users, Settings, LogOut, 
  UserCircle2, Lock, Menu, X, ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import MobileMenu from './MobileMenu';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation principale (SANS liens eau - ceux-ci sont dans la page immeuble)
  const navigation = [
    { name: 'Tableau de bord', to: '/dashboard', icon: Home },
    { name: 'Immeubles', to: '/immeubles', icon: Building2 },
    { name: 'Propriétaires', to: '/proprietaires', icon: Users },
    { name: 'Locataires', to: '/locataires', icon: UserCircle2 },
    { name: 'Exercices clôturés', to: '/exercices-clotures', icon: Lock },
    { name: 'Paramètres', to: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex md:flex-col ${
        sidebarOpen ? 'md:w-64' : 'md:w-20'
      } bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300`}>
        
        {/* Header avec toggle */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen ? (
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                🏢 Copro Manager
              </h1>
            ) : (
              <span className="text-2xl">🏢</span>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-b border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.[0] || user?.prenom?.[0]}{user?.lastName?.[0] || user?.nom?.[0]}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.firstName || user?.prenom} {user?.lastName || user?.nom}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon className={`h-5 w-5 flex-shrink-0`} />
              {sidebarOpen && (
                <span className="font-medium">{item.name}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-400 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left text-sm font-medium text-gray-300">
                    Déconnexion
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} />
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && sidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header Mobile */}
        <header className="bg-white shadow-sm sticky top-0 z-10 md:hidden">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-3">
                <MobileMenu navigation={navigation} />
                <h1 className="text-xl font-bold text-gray-900">
                  🏢 Copro Manager
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
