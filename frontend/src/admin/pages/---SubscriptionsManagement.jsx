// =====================================================
// 👨‍💼 ADMIN - Gestion Abonnements
// frontend/src/admin/pages/SubscriptionsManagement.jsx
// =====================================================
import { useState, useEffect } from 'react';
import { Users, CreditCard, Calendar, CheckCircle, XCircle, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1';

export default function SubscriptionsManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/users-subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const activateTestSubscription = async (userId) => {
    if (!confirm('Activer un abonnement TEST de 1 an pour cet utilisateur ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/admin/users/${userId}/subscription/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(response.data.message);
      loadUsers();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Erreur');
    }
  };

  const cancelSubscription = async (userId) => {
    if (!confirm('Désactiver l\'abonnement de cet utilisateur ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/users/${userId}/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Abonnement désactivé');
      loadUsers();
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la désactivation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          Gestion des Abonnements
        </h1>
        <p className="text-gray-600 mt-2">
          {users.length} utilisateur{users.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Utilisateurs</p>
          <p className="text-2xl font-bold text-blue-900">{users.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Abonnements Actifs</p>
          <p className="text-2xl font-bold text-green-900">
            {users.filter(u => u.subscription_id).length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Sans Abonnement</p>
          <p className="text-2xl font-bold text-orange-900">
            {users.filter(u => !u.subscription_id).length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Essais Gratuits</p>
          <p className="text-2xl font-bold text-purple-900">
            {users.filter(u => u.is_trial).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type Compte
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Abonnement
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date Fin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Immeubles
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.prenom} {user.nom}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.type_compte === 'particulier' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {user.type_compte}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.subscription_id ? (
                      <div>
                        <span className="font-medium">{user.plan_type}</span>
                        {user.is_trial && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                            TEST
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Aucun</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.status === 'active' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.end_date ? (
                      new Date(user.end_date).toLocaleDateString()
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                      {user.immeubles_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!user.subscription_id ? (
                        <button
                          onClick={() => activateTestSubscription(user.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                        >
                          <Zap className="h-4 w-4" />
                          Activer TEST
                        </button>
                      ) : (
                        <button
                          onClick={() => cancelSubscription(user.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                        >
                          Désactiver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun utilisateur trouvé
        </div>
      )}
    </div>
  );
}
