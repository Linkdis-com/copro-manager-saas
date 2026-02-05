import { useState, useEffect } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext'; 
import {
  Gift, Plus, Edit, Trash2, BarChart3, Calendar, Users,
  TrendingUp, Tag, Check, X, Loader
} from 'lucide-react';
import api from '../../services/api'; // ✅ UTILISER L'API NORMALE (pas adminApi)

function PromoCodesManagement() {
  const [loading, setLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'free_months',
    discount_value: 3,
    is_dual_benefit: false,
    reward_referrer: 2,
    reward_referee: 3,
    max_uses: 100,
    usage_limit_per_user: 1,
    requires_minimum_units: null,
    valid_from: '',
    valid_until: '',
    applicable_plans: ['particulier', 'professionnel']
  });

  useEffect(() => {
    loadData();
  }, []);

  // ✅ CORRIGÉ : Utiliser l'instance api normale (pas adminApi)
  const loadData = async () => {
    try {
      const [codesRes, statsRes] = await Promise.all([
        api.get('/admin/promo-codes'),
        api.get('/admin/promo-codes/stats')
      ]);

      if (codesRes.data) {
        setPromoCodes(codesRes.data.promo_codes || []);
      }

      if (statsRes.data) {
        setGlobalStats(statsRes.data.stats);
      }

    } catch (error) {
      console.error('Error loading promo codes:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRIGÉ : Utiliser l'instance api normale
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let response;
      
      if (editingCode) {
        response = await api.put(`/admin/promo-codes/${editingCode.id}`, formData);
      } else {
        response = await api.post('/admin/promo-codes', formData);
      }

      if (response.data) {
        setSuccess(response.data.message || (editingCode ? 'Code mis à jour !' : 'Code créé !'));
        setShowCreateForm(false);
        setEditingCode(null);
        resetForm();
        loadData();
      }

    } catch (error) {
      console.error('Error saving promo code:', error);
      setError(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  // ✅ CORRIGÉ : Utiliser l'instance api normale
  const handleDelete = async (id, code) => {
    if (!confirm(`Supprimer le code ${code} ?`)) return;

    try {
      const response = await api.delete(`/admin/promo-codes/${id}`);

      if (response.data) {
        setSuccess(response.data.message || 'Code supprimé !');
        loadData();
      }

    } catch (error) {
      console.error('Error deleting promo code:', error);
      setError(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleEdit = (code) => {
    setFormData({
      code: code.code,
      description: code.description,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      is_dual_benefit: code.is_dual_benefit,
      reward_referrer: code.reward_referrer || 2,
      reward_referee: code.reward_referee || 3,
      max_uses: code.max_uses,
      usage_limit_per_user: code.usage_limit_per_user,
      requires_minimum_units: code.requires_minimum_units,
      valid_from: code.valid_from ? code.valid_from.split('T')[0] : '',
      valid_until: code.valid_until ? code.valid_until.split('T')[0] : '',
      applicable_plans: code.applicable_plans || ['particulier', 'professionnel']
    });
    setEditingCode(code);
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'free_months',
      discount_value: 3,
      is_dual_benefit: false,
      reward_referrer: 2,
      reward_referee: 3,
      max_uses: 100,
      usage_limit_per_user: 1,
      requires_minimum_units: null,
      valid_from: '',
      valid_until: '',
      applicable_plans: ['particulier', 'professionnel']
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '∞';
    return new Date(dateString).toLocaleDateString('fr-BE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Codes Promo</h1>
          <p className="text-gray-600">Gérez les codes promotionnels de l'application</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingCode(null);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nouveau code
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <X className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Stats globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Tag className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{globalStats.active_codes}</p>
            <p className="text-sm text-blue-700">Codes actifs</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-900">{globalStats.total_uses || 0}</p>
            <p className="text-sm text-green-700">Utilisations totales</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-900">{globalStats.top_code || '-'}</p>
            <p className="text-sm text-purple-700">Code le plus utilisé</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-orange-900">{globalStats.top_code_uses || 0}</p>
            <p className="text-sm text-orange-700">Utilisations max</p>
          </div>
        </div>
      )}

      {/* Formulaire création/édition */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCode ? 'Modifier le code' : 'Créer un nouveau code'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identité */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code promo *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME2025"
                  required
                  maxLength={20}
                  disabled={!!editingCode}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de récompense *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="free_months">Mois gratuits</option>
                  <option value="free_units">Unités gratuites</option>
                  <option value="percentage">% de réduction</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Code de bienvenue pour les nouveaux utilisateurs"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Dual benefit */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_dual_benefit"
                checked={formData.is_dual_benefit}
                onChange={(e) => setFormData({ ...formData, is_dual_benefit: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_dual_benefit" className="text-sm font-medium text-gray-700">
                Récompense double (parrain + filleul)
              </label>
            </div>

            {/* Valeurs de récompense */}
            {formData.is_dual_benefit ? (
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Récompense parrain
                  </label>
                  <input
                    type="number"
                    value={formData.reward_referrer}
                    onChange={(e) => setFormData({ ...formData, reward_referrer: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Récompense filleul
                  </label>
                  <input
                    type="number"
                    value={formData.reward_referee}
                    onChange={(e) => setFormData({ ...formData, reward_referee: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur de la récompense *
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.discount_type === 'free_months' && 'Nombre de mois offerts'}
                  {formData.discount_type === 'free_units' && 'Nombre d\'unités offertes'}
                  {formData.discount_type === 'percentage' && 'Pourcentage de réduction'}
                </p>
              </div>
            )}

            {/* Limites */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utilisations max
                </label>
                <input
                  type="number"
                  value={formData.max_uses || ''}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  min="1"
                  placeholder="Illimité"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max par user
                </label>
                <input
                  type="number"
                  value={formData.usage_limit_per_user}
                  onChange={(e) => setFormData({ ...formData, usage_limit_per_user: parseInt(e.target.value) })}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min unités requises
                </label>
                <input
                  type="number"
                  value={formData.requires_minimum_units || ''}
                  onChange={(e) => setFormData({ ...formData, requires_minimum_units: e.target.value ? parseInt(e.target.value) : null })}
                  min="1"
                  placeholder="Aucun"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valide à partir du
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valide jusqu'au
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Plans applicables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plans applicables
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_plans.includes('particulier')}
                    onChange={(e) => {
                      const plans = e.target.checked
                        ? [...formData.applicable_plans, 'particulier']
                        : formData.applicable_plans.filter(p => p !== 'particulier');
                      setFormData({ ...formData, applicable_plans: plans });
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Particulier</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applicable_plans.includes('professionnel')}
                    onChange={(e) => {
                      const plans = e.target.checked
                        ? [...formData.applicable_plans, 'professionnel']
                        : formData.applicable_plans.filter(p => p !== 'professionnel');
                      setFormData({ ...formData, applicable_plans: plans });
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Professionnel</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingCode ? 'Mettre à jour' : 'Créer le code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCode(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau des codes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Liste des codes promo</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Récompense</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expire</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary-600" />
                      <span className="font-mono font-semibold text-gray-900">{code.code}</span>
                    </div>
                    {code.description && (
                      <p className="text-xs text-gray-500 mt-1">{code.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {code.is_dual_benefit ? 'Dual' : 'Simple'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {code.discount_type === 'free_months' && `${code.discount_value} mois`}
                      {code.discount_type === 'free_units' && `${code.discount_value} unités`}
                      {code.discount_type === 'percentage' && `-${code.discount_value}%`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {code.total_uses || 0} / {code.max_uses || '∞'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{formatDate(code.valid_until)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {code.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(code)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(code.id, code.code)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {promoCodes.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Aucun code promo créé pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PromoCodesManagement;
