import { useState, useEffect } from 'react';
import { 
  Search, Lock, Unlock, Building2, Calendar, 
  AlertCircle, CheckCircle, User
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function AdminExercices() {
  const [exercices, setExercices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadExercices();
  }, []);

  const loadExercices = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/v1/admin/exercices/clotures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setExercices(data.exercices || []);
      }
    } catch (error) {
      console.error('Error loading exercices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (exerciceId, immeubleName) => {
    const confirm = window.confirm(
      `Débloquer l'exercice clôturé de "${immeubleName}" ?\n\n` +
      `⚠️ Cette action permettra au client de modifier à nouveau cet exercice.`
    );

    if (!confirm) return;

    setActionLoading(exerciceId);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/v1/admin/exercices/${exerciceId}/unlock`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert('✅ Exercice débloqué avec succès');
        loadExercices(); // Recharger la liste
      } else {
        const error = await res.json();
        alert('❌ ' + error.error);
      }
    } catch (error) {
      alert('❌ Erreur lors du déblocage');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredExercices = exercices.filter(ex => 
    ex.immeuble_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.annee?.toString().includes(searchTerm)
  );

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Exercices clôturés</h2>
        <p className="text-sm text-gray-600 mt-1">
          Débloquer les exercices clôturés par erreur
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              À propos du déblocage d'exercices
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Débloquer un exercice permet au client de modifier à nouveau les données 
              de cet exercice comptable. Cette action est tracée dans les logs admin.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Exercices clôturés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{exercices.length}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clients concernés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {new Set(exercices.map(ex => ex.user_email)).size}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Immeubles concernés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {new Set(exercices.map(ex => ex.immeuble_id)).size}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par immeuble, client, année..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Exercices List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Immeuble
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date clôture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clôturé par
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExercices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {searchTerm 
                        ? 'Aucun exercice ne correspond à votre recherche'
                        : 'Aucun exercice clôturé pour le moment'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExercices.map((exercice) => (
                  <tr key={exercice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {exercice.immeuble_nom}
                          </div>
                          <div className="text-xs text-gray-500">
                            {exercice.immeuble_ville}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{exercice.user_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {exercice.annee}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(exercice.date_cloture).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {exercice.cloture_par || 'Utilisateur'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        <Lock className="h-3 w-3" />
                        Clôturé
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleUnlock(exercice.id, exercice.immeuble_nom)}
                        disabled={actionLoading === exercice.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === exercice.id ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-orange-600 border-t-transparent rounded-full" />
                            Déblocage...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4" />
                            Débloquer
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminExercices;
