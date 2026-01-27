import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, FileText, DollarSign, TrendingUp, 
  AlertCircle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      // Charger les stats
      const statsRes = await fetch(`${API_URL}/api/v1/admin/stats/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      // Charger l'activité récente
      const activityRes = await fetch(`${API_URL}/api/v1/admin/activity/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Utilisateurs totaux',
      value: stats?.total_users || 0,
      change: `+${stats?.new_users_this_month || 0} ce mois`,
      icon: Users,
      color: 'blue',
      trend: 'up',
      onClick: () => navigate('/clients')
    },
    {
      title: 'Immeubles gérés',
      value: stats?.total_immeubles || 0,
      change: 'Actifs',
      icon: Building2,
      color: 'purple',
      trend: null,
      onClick: () => navigate('/clients')
    },
    {
      title: 'MRR',
      value: `${(stats?.mrr || 0).toFixed(0)}€`,
      change: 'Revenus mensuels',
      icon: DollarSign,
      color: 'green',
      trend: 'up',
      onClick: () => navigate('/revenue')
    },
    {
      title: 'Factures ce mois',
      value: stats?.invoices_this_month || 0,
      change: `${stats?.unpaid_invoices || 0} impayées`,
      icon: FileText,
      color: 'orange',
      trend: stats?.unpaid_invoices > 0 ? 'down' : null,
      onClick: () => navigate('/invoices')
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Bienvenue, Admin ! 👋
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Voici un aperçu de votre activité
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = getColorClasses(card.color);
          
          return (
            <div
              key={index}
              onClick={card.onClick}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                  <Icon className="h-6 w-6" />
                </div>
                {card.trend && (
                  <div className={`flex items-center gap-1 ${
                    card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                <p className="text-xs text-gray-500">{card.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all text-left"
          >
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Gérer les clients</p>
              <p className="text-xs text-gray-500">Voir tous les utilisateurs</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all text-left"
          >
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Factures</p>
              <p className="text-xs text-gray-500">Gérer la facturation</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/exercices')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all text-left"
          >
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Exercices clôturés</p>
              <p className="text-xs text-gray-500">Débloquer si besoin</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activité récente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Activité récente
            </h3>
            <button className="text-sm text-red-600 hover:text-red-700 font-medium">
              Voir tout →
            </button>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title || 'Activité'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.description || 'Aucune description'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune activité récente</p>
            </div>
          )}
        </div>

        {/* Alertes système */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Alertes
            </h3>
          </div>

          <div className="space-y-3">
            {stats?.unpaid_invoices > 0 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">
                    {stats.unpaid_invoices} facture{stats.unpaid_invoices > 1 ? 's' : ''} impayée{stats.unpaid_invoices > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Nécessite votre attention
                  </p>
                  <button
                    onClick={() => navigate('/invoices')}
                    className="text-xs text-orange-700 hover:text-orange-800 font-medium mt-2"
                  >
                    Voir les factures →
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Système opérationnel
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Tous les services fonctionnent normalement
                </p>
              </div>
            </div>

            {stats?.new_users_this_month > 0 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Croissance positive
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    +{stats.new_users_this_month} nouveaux clients ce mois
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
