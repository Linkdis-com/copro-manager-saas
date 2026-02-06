throw new Error('Test ErrorBoundary');
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, FileText, Plus, TrendingUp, ChevronRight, ArrowRight, RefreshCw } from 'lucide-react';

function Dashboard() {
  const { user } = useAuth();
  const { getDashboardStats } = useData();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    immeubles: 0,
    proprietaires: 0,
    locataires: 0,
    decomptes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      const data = await getDashboardStats(forceRefresh);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Configuration des cartes stats - CLIQUABLES
  const statCards = [
    {
      title: 'Immeubles',
      value: stats.immeubles,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      path: '/immeubles'
    },
    {
      title: 'Propriétaires',
      value: stats.proprietaires,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      path: '/proprietaires'
    },
    {
      title: 'Locataires',
      value: stats.locataires,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      path: '/locataires'
    }
  ];

  // Configuration des actions rapides
  const quickActions = [
    {
      title: 'Ajouter un immeuble',
      description: 'Créer un nouveau bien en copropriété',
      icon: Plus,
      path: '/immeubles'
    },
    {
      title: 'Nouveau décompte',
      description: 'Générer un décompte de charges',
      icon: FileText,
      path: '/decomptes'
    },
    {
      title: 'Voir les rapports',
      description: 'Consulter les statistiques détaillées',
      icon: TrendingUp,
      path: '/dashboard'
    },
    {
      title: 'Gérer les locataires',
      description: 'Ajouter ou modifier des locataires',
      icon: Users,
      path: '/locataires'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Bienvenue, {user?.prenom || user?.firstName || 'Utilisateur'} ! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Voici un aperçu de votre activité
          </p>
        </div>
        {/* Bouton rafraîchir */}
        <button
          onClick={() => loadStats(true)}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Rafraîchir les données"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards - CLIQUABLES avec navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat) => (
          <button
            key={stat.title}
            onClick={() => navigate(stat.path)}
            className="bg-white rounded-xl shadow-sm p-5 sm:p-6 hover:shadow-md transition-all text-left group w-full"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                {isLoading ? (
                  <div className="mt-2 h-8 w-16 bg-gray-200 animate-pulse rounded" />
                ) : (
                  <p className={`mt-2 text-2xl sm:text-3xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            {/* Lien "Voir tout" */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-sm text-gray-500 group-hover:text-primary-600 transition-colors">
              <span>Voir tout</span>
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left group w-full"
            >
              <div className="flex-shrink-0">
                <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-primary-100 transition-colors">
                  <action.icon className="h-5 w-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                </div>
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                <p className="mt-1 text-sm text-gray-500 truncate">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Activité récente
        </h2>
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600">Aucune activité récente</p>
          <p className="text-sm mt-2 text-gray-400">Les dernières actions apparaîtront ici</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
