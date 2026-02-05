import { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Building2, DollarSign, 
  Calendar, Filter, Download, RefreshCw
} from 'lucide-react';
import adminApi from '../utils/adminApi';

function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y, all
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const data = await adminApi.get(`/analytics?range=${timeRange}`);
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleExport = () => {
    alert('Fonctionnalité d\'export en développement');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistiques avancées</h2>
          <p className="text-sm text-gray-600 mt-1">
            Analyse détaillée de votre plateforme
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '7d'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7j
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '30d'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              30j
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '90d'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              90j
            </button>
            <button
              onClick={() => setTimeRange('1y')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === '1y'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              1an
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === 'all'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Exporter</span>
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              analytics?.users_growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analytics?.users_growth >= 0 ? '+' : ''}{(analytics?.users_growth || 0).toFixed(1)}%
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Croissance utilisateurs</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {analytics?.total_users || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              +{analytics?.new_users || 0} nouveaux
            </p>
          </div>
        </div>

        {/* Immeubles Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              analytics?.immeubles_growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analytics?.immeubles_growth >= 0 ? '+' : ''}{(analytics?.immeubles_growth || 0).toFixed(1)}%
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Croissance immeubles</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {analytics?.total_immeubles || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              +{analytics?.new_immeubles || 0} ajoutés
            </p>
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              analytics?.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analytics?.revenue_growth >= 0 ? '+' : ''}{(analytics?.revenue_growth || 0).toFixed(1)}%
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Croissance revenus</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {(analytics?.total_revenue || 0).toFixed(0)}€
            </p>
            <p className="text-xs text-gray-500 mt-1">
              MRR: {(analytics?.mrr || 0).toFixed(0)}€
            </p>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-blue-600">
              Score
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Taux d'engagement</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {(analytics?.engagement_rate || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analytics?.active_users || 0} actifs
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Acquisition Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Acquisition utilisateurs
            </h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>

          {/* Simple Bar Chart */}
          <div className="space-y-3">
            {(analytics?.user_acquisition || []).map((day, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-20">
                  {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min((day.count / Math.max(...analytics.user_acquisition.map(d => d.count)) * 100), 100)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">
                      {day.count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!analytics?.user_acquisition?.length && (
            <div className="text-center py-8">
              <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Évolution des revenus
            </h3>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>

          {/* Simple Area Chart */}
          <div className="space-y-3">
            {(analytics?.revenue_trend || []).map((period, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-20">
                  {new Date(period.date).toLocaleDateString('fr-FR', { month: 'short' })}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.min((period.amount / Math.max(...analytics.revenue_trend.map(d => d.amount)) * 100), 100)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">
                      {period.amount.toFixed(0)}€
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!analytics?.revenue_trend?.length && (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Segments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Segments utilisateurs
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Utilisateurs gratuits</span>
              <span className="text-sm font-bold text-gray-900">
                {analytics?.free_users || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Utilisateurs payants</span>
              <span className="text-sm font-bold text-green-700">
                {analytics?.paid_users || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Taux de conversion</span>
              <span className="text-sm font-bold text-blue-700">
                {((analytics?.paid_users / analytics?.total_users * 100) || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Platform Usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Utilisation plateforme
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Connexions / jour</span>
              <span className="text-sm font-bold text-gray-900">
                {analytics?.daily_logins || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-gray-600">Immeubles / utilisateur</span>
              <span className="text-sm font-bold text-purple-700">
                {((analytics?.total_immeubles / analytics?.total_users) || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-gray-600">Session moyenne</span>
              <span className="text-sm font-bold text-orange-700">
                {analytics?.avg_session_time || '--'} min
              </span>
            </div>
          </div>
        </div>

        {/* Top Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Fonctionnalités populaires
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Gestion locataires</span>
              <span className="text-sm font-bold text-gray-900">
                {analytics?.feature_usage?.locataires || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Comptabilité</span>
              <span className="text-sm font-bold text-gray-900">
                {analytics?.feature_usage?.comptabilite || 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Décomptes</span>
              <span className="text-sm font-bold text-gray-900">
                {analytics?.feature_usage?.decomptes || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;