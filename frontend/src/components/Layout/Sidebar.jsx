import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Building2, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  X,
  Calculator,
  Lock,
  Shield,
  Droplets,
  Plus
} from 'lucide-react';

function Sidebar({ isOpen, onClose }) {
  const { logout, user } = useAuth();
  console.log('USER DATA:', user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Tableau de bord', to: '/dashboard', icon: Home },
    { name: 'Immeubles', to: '/immeubles', icon: Building2 },
    { name: 'Propriétaires', to: '/proprietaires', icon: Users },
    { name: 'Locataires', to: '/locataires', icon: Users },
    { name: 'Décomptes d\'eau', to: '/decomptes', icon: Droplets },
    { name: 'Nouveau décompte', to: '/decomptes/nouveau', icon: Plus },
    { name: 'Exercices clôturés', to: '/exercices-clotures', icon: Lock },
    { name: 'Paramètres', to: '/settings', icon: Settings },
  ];

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`
      }
    >
      <item.icon className="mr-3 h-5 w-5" />
      {item.name}
    </NavLink>
  );

  return (
    <>
      {/* Sidebar pour desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900">
              🏢 Copro Manager
            </h1>
          </div>

          {/* User info */}
          <div className="px-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}

            {/* Lien Admin - visible uniquement pour les admins */}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mt-4 ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-red-600 hover:bg-red-50 border border-red-200'
                  }`
                }
              >
                <Shield className="mr-3 h-5 w-5" />
                Administration
              </NavLink>
            )}
          </nav>

          {/* Logout */}
          <div className="px-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar pour mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header mobile */}
          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">
              🏢 Copro Manager
            </h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User info mobile */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation mobile */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}

            {/* Lien Admin mobile - visible uniquement pour les admins */}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mt-4 ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-red-600 hover:bg-red-50 border border-red-200'
                  }`
                }
              >
                <Shield className="mr-3 h-5 w-5" />
                Administration
              </NavLink>
            )}
          </nav>

          {/* Logout mobile */}
          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
