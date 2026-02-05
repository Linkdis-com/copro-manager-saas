import { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, 
  Calendar, CreditCard, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import adminApi from '../utils/adminApi';

function AdminRevenue() {
  const [stats, setStats] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('year'); // year, month, all

  useEffect(() => {
    loadRevenueData();
  }, [period]);

  const loadRevenueData = async () => {
    try {
      const data = await adminApi.get(`/revenue/stats?period=${period}`);
      setStats(data.stats);
      setRevenueByMonth(data.revenueByMonth || []);
      setTopClients(data.topClients || []);
    } catch (error) {
      console.error('Error loading revenue:', error);
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
      title: 'MRR (Revenus mensuels)',
      value: `${(stats?.mrr || 0).toFixed(2)}€`,
      change: stats?.mrr_growth > 0 ? `+${stats.mrr_growth.toFixed(1)}%` : `${stats?.mrr_growth?.toFixed(1) || 0}%`,
      icon: DollarSign,
      color: 'green',
      trend: stats?.mrr_growth > 0 ? 'up' : 'down'
    },
    {
      title: 'ARR (Revenus annuels)',
      value: `${((stats?.mrr || 0) * 12).toFixed(0)}€`,
      change: 'Projection annuelle',
      icon: TrendingUp,
      color: 'blue',
      trend: 'up'
    },
    {
      title: 'Clients payants',
      value: stats?.paying_customers || 0,
      change: `${stats?.total_customers || 0} clients totaux`,
      icon: Users,
      color: 'purple',
      trend: null
    },
    {
      title: 'ARPU (Revenu moyen)',
      value: `${(stats?.arpu || 0).toFixed(2)}€`,
      change: 'Par utilisateur/mois',
      icon: CreditCard,
      color: 'orange',
      trend: null
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600'
    };
    return colors[color] || colors.green;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenus</h2>
          <p className="text-sm text-gray-600 mt-1">
            Analyse financière et statistiques
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === 'month'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Ce mois
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === 'year'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cette année
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === 'all'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = getColorClasses(card.color);
          
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
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
                    <span className="text-xs font-semibold">{card.change}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                {!card.trend && (
                  <p className="text-xs text-gray-500">{card.change}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenus par mois */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenus mensuels
            </h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>

          {revenueByMonth.length > 0 ? (
            <div className="space-y-3">
              {revenueByMonth.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(month.month).toLocaleDateString('fr-FR', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {month.invoices_count} facture{month.invoices_count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {parseFloat(month.total_revenue).toFixed(2)}€
                    </p>
                    {month.growth !== null && (
                      <p className={`text-xs font-medium ${
                        month.growth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {month.growth > 0 ? '+' : ''}{month.growth}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Meilleurs clients
            </h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>

          {topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {client.name || 'Client'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {client.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {parseFloat(client.total_spent).toFixed(2)}€
                    </p>
                    <p className="text-xs text-gray-500">
                      {client.invoices_count} facture{client.invoices_count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucun client</p>
            </div>
          )}
        </div>
      </div>

      {/* Métriques additionnelles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Métriques clés
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Taux de conversion</p>
            <p className="text-3xl font-bold text-gray-900">
              {((stats?.paying_customers / stats?.total_customers * 100) || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.paying_customers} / {stats?.total_customers} clients
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Croissance MRR</p>
            <p className={`text-3xl font-bold ${
              stats?.mrr_growth > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats?.mrr_growth > 0 ? '+' : ''}{(stats?.mrr_growth || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              vs mois précédent
            </p>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Valeur client (LTV)</p>
            <p className="text-3xl font-bold text-gray-900">
              {((stats?.arpu || 0) * 12).toFixed(0)}€
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Projection annuelle
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminRevenue;