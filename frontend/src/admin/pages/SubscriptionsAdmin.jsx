// =====================================================
// 👨‍💼 ADMIN - Gestion Abonnements (AVEC DÉFINIR UNITÉS)
// frontend/src/admin/pages/SubscriptionsAdmin.jsx
// =====================================================
import { useState, useEffect } from 'react';
import { Users, CreditCard, Calendar, Check, X, Plus, Zap, Package } from 'lucide-react';
import api from '../../services/api'; // ✅ UTILISER L'API NORMALE (comme PromoCodesManagement)

export default function SubscriptionsAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    plan_type: 'particulier',
    duration_months: 12
  });
  const [unitsForm, setUnitsForm] = useState({
    subscription_id: null,
    total_units: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  // ✅ CORRIGÉ : Utiliser api au lieu d'axios
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscriptions-admin/users-subscriptions');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRIGÉ : Utiliser api au lieu d'axios
  const createSubscription = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await api.post('/subscriptions-admin/create-test-subscription', {
        user_id: selectedUser.user_id,
        plan_type: formData.plan_type,
        duration_months: formData.duration_months
      });
      
      alert(`✅ ${response.data.message}\n\n` +
            `📋 Détails:\n` +
            `- Plan: ${response.data.details.plan}\n` +
            `- Durée: ${response.data.details.duration}\n` +
            `- Prix annuel: ${response.data.details.price_yearly}\n` +
            `- Valide jusqu'au: ${response.data.details.valid_until}\n` +
            `- Essai jusqu'au: ${response.data.details.trial_until}`
      );
      
      setShowModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  // ✅ CORRIGÉ : Utiliser api au lieu d'axios
  const setUnits = async () => {
    if (!unitsForm.subscription_id) return;
    
    try {
      await api.patch(`/subscriptions-admin/set-units/${unitsForm.subscription_id}`, {
        total_units: unitsForm.total_units
      });
      
      alert(`✅ Unités définies à ${unitsForm.total_units} !`);
      setShowUnitsModal(false);
      setUnitsForm({ subscription_id: null, total_units: 0 });
      loadUsers();
    } catch (error) {
      console.error('Error setting units:', error);
      alert(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  // ✅ CORRIGÉ : Utiliser api au lieu d'axios
  const toggleSubscription = async (subscription, newStatus) => {
    if (!confirm(`${newStatus ? 'Activer' : 'Désactiver'} cet abonnement ?`)) return;
    
    try {
      await api.patch(`/subscriptions-admin/toggle-subscription/${subscription.subscription_id}`, {
        is_active: newStatus
      });
      
      alert('✅ Abonnement mis à jour !');
      loadUsers();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // ✅ CORRIGÉ : Utiliser api au lieu d'axios
  const cancelSubscription = async (subscriptionId) => {
    if (!confirm('Annuler cet abonnement ?')) return;
    
    try {
      await api.delete(`/subscriptions-admin/cancel-subscription/${subscriptionId}`);
      
      alert('✅ Abonnement annulé !');
      loadUsers();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Erreur lors de l\'annulation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeCount = users.filter(u => u.status === 'active').length;
  const noSubCount = users.filter(u => !u.subscription_id).length;
  const trialCount = users.filter(u => u.is_trial).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            Gestion des Abonnements
          </h1>
          <p className="text-gray-600 mt-2">
            {users.length} utilisateurs • {activeCount} avec abonnement actif
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-blue-900">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600 opacity-50" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Abonnements Actifs</p>
              <p className="text-2xl font-bold text-green-900">{activeCount}</p>
            </div>
            <Check className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Sans Abonnement</p>
              <p className="text-2xl font-bold text-orange-900">{noSubCount}</p>
            </div>
            <X className="h-8 w-8 text-orange-600 opacity-50" />
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">En Essai</p>
              <p className="text-2xl font-bold text-purple-900">{trialCount}</p>
            </div>
            <Zap className="h-8 w-8 text-purple-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type Compte
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Fin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unités
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Annuel
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.prenom} {user.nom}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.type_compte === 'professionnel'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.type_compte}
                    </span>
                    {user.is_trial && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Essai
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {user.subscription_id ? (
                      user.status === 'active' ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <Check className="h-4 w-4" />
                          Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <X className="h-4 w-4" />
                          {user.status}
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-gray-400">Aucun</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.end_date ? (
                      new Date(user.end_date).toLocaleDateString('fr-FR')
                    ) : (
                      '-'
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.total_units || '-'}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.final_price_yearly ? (
                      `${parseFloat(user.final_price_yearly).toFixed(2)} €`
                    ) : (
                      '-'
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {!user.subscription_id ? (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                        >
                          <Zap className="h-4 w-4" />
                          Activer TEST
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setUnitsForm({
                                subscription_id: user.subscription_id,
                                total_units: user.total_units || 0
                              });
                              setShowUnitsModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                            title="Définir le nombre d'unités"
                          >
                            <Package className="h-4 w-4" />
                            Unités
                          </button>
                          
                          <button
                            onClick={() => toggleSubscription(user, user.status !== 'active')}
                            className={`px-3 py-1.5 text-sm rounded transition ${
                              user.status === 'active'
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {user.status === 'active' ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => cancelSubscription(user.subscription_id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Créer Abonnement */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-600" />
              Activer Abonnement Test
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utilisateur
                </label>
                <p className="text-sm text-gray-600">
                  {selectedUser?.prenom} {selectedUser?.nom} ({selectedUser?.email})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Type compte: {selectedUser?.type_compte}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de Plan
                </label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="particulier">Particulier (2€ TTC/mois)</option>
                  <option value="professionnel">Professionnel (4€ HTVA/mois)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée
                </label>
                <select
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="1">1 mois</option>
                  <option value="3">3 mois</option>
                  <option value="6">6 mois</option>
                  <option value="12">12 mois (1 an)</option>
                </select>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>🧪 Abonnement TEST :</strong>
                  <br />• Essai gratuit de 1 an
                  <br />• Unités: {selectedUser?.type_compte === 'professionnel' ? '10' : '1'}
                  <br />• Pas de Stripe
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={createSubscription}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Activer l'Abonnement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Définir Unités */}
      {showUnitsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Définir les Unités
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre d'unités (appartements)
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitsForm.total_units}
                  onChange={(e) => setUnitsForm({ ...unitsForm, total_units: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Ex: 5"
                />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Important :</strong>
                  <br />• total_units = unités ACHETÉES (fixe)
                  <br />• Utilisé uniquement pour les tests
                  <br />• En production, modifié via Stripe
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUnitsModal(false);
                  setUnitsForm({ subscription_id: null, total_units: 0 });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={setUnits}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Définir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
