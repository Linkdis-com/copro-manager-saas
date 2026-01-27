import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { immeublesService } from '../../services/api';
import { 
  Plus, Building2, MapPin, Trash2, Edit, AlertCircle, 
  Grid3x3, List, Users, Home, RefreshCw, Eye, Lock
} from 'lucide-react';
import ImmeublesForm from './ImmeublesForm';

function ImmeublesList() {
  const navigate = useNavigate();
  const { getImmeubles, invalidateCache } = useData();
  const { user } = useAuth();
  
  const [immeubles, setImmeubles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedImmeuble, setSelectedImmeuble] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [immeubleToDelete, setImmeubleToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Limite d'immeubles selon l'abonnement
  const getMaxImmeubles = () => {
    return user?.subscription?.maxImmeubles || user?.max_immeubles || 999;
  };

  const maxImmeubles = getMaxImmeubles();
  const canAddImmeuble = immeubles.length < maxImmeubles;

  useEffect(() => {
    loadImmeubles();
  }, []);

  const loadImmeubles = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      const data = await getImmeubles(forceRefresh);
      setImmeubles(data);
    } catch (err) {
      console.error('Error loading immeubles:', err);
      setError('Erreur lors du chargement des immeubles');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!canAddImmeuble) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedImmeuble(null);
    setShowForm(true);
  };

  const handleEdit = (immeuble, e) => {
    e?.stopPropagation();
    setSelectedImmeuble(immeuble);
    setShowForm(true);
  };

  const handleDeleteClick = (immeuble, e) => {
    e?.stopPropagation();
    setImmeubleToDelete(immeuble);
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!immeubleToDelete) return;
    if (deleteConfirmText !== `Effacer ${immeubleToDelete.nom}`) return;

    try {
      await immeublesService.delete(immeubleToDelete.id);
      invalidateCache('all');
      setImmeubles(immeubles.filter(i => i.id !== immeubleToDelete.id));
      setShowDeleteConfirm(false);
      setImmeubleToDelete(null);
      setDeleteConfirmText('');
    } catch (err) {
      console.error('Error deleting immeuble:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedImmeuble(null);
    invalidateCache('all');
    loadImmeubles(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header simplifié */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Immeubles</h1>
          <p className="text-sm text-gray-600 mt-1">
            {immeubles.length} immeuble{immeubles.length > 1 ? 's' : ''} 
            {maxImmeubles < 999 && ` sur ${maxImmeubles} autorisé${maxImmeubles > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadImmeubles(true)}
            className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            title="Rafraîchir"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
          
          {immeubles.length > 0 && (
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {/* Bouton Ajouter conditionné à l'abonnement */}
          <button
            onClick={handleAdd}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg transition-all font-medium ${
              canAddImmeuble 
                ? 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-xl' 
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
            title={!canAddImmeuble ? `Limite de ${maxImmeubles} immeuble(s) atteinte` : ''}
          >
            {canAddImmeuble ? (
              <Plus className="h-5 w-5" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {immeubles.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun immeuble</h3>
          <p className="text-gray-500 mb-6">Commencez par ajouter votre premier immeuble</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Créer un immeuble
          </button>
        </div>
      )}

      {/* Vue Grille - Design simplifié sans bloc financier */}
      {immeubles.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {immeubles.map((immeuble) => (
            <div
              key={immeuble.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate(`/immeubles/${immeuble.id}`)}
            >
              {/* Header bleu clair avec nom + adresse complète */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {immeuble.nom}
                    </h3>
                    <div className="flex items-start gap-1 text-gray-600 text-sm mt-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="truncate">{immeuble.adresse}</p>
                        <p className="truncate">{immeuble.code_postal} {immeuble.ville}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Stats Propriétaires / Locataires */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Propriétaires</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {immeuble.proprietairesCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Home className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Locataires</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {immeuble.locatairesCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/immeubles/${immeuble.id}`); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-md"
                  >
                    <Eye className="h-4 w-4" />
                    Gérer
                  </button>
                  <button
                    onClick={(e) => handleEdit(immeuble, e)}
                    className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Éditer"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(immeuble, e)}
                    className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vue Liste */}
      {immeubles.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Immeuble</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriétaires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locataires</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {immeubles.map((immeuble) => (
                  <tr 
                    key={immeuble.id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => navigate(`/immeubles/${immeuble.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{immeuble.nom}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {immeuble.ville}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{immeuble.adresse}</div>
                      <div className="text-sm text-gray-500">{immeuble.code_postal} {immeuble.ville}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {immeuble.proprietairesCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {immeuble.locatairesCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/immeubles/${immeuble.id}`); }} 
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          Gérer →
                        </button>
                        <button 
                          onClick={(e) => handleEdit(immeuble, e)} 
                          className="text-gray-500 hover:text-gray-700 p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(immeuble, e)} 
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ImmeublesForm
          immeuble={selectedImmeuble}
          onClose={() => { setShowForm(false); setSelectedImmeuble(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Confirmer la suppression</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Cette action est <strong>irréversible</strong>. L'immeuble <strong className="text-gray-900">{immeubleToDelete?.nom}</strong> sera définitivement supprimé.
              </p>
              
              <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                <p className="text-sm text-red-800 font-semibold">⚠️ Tous les propriétaires et locataires associés seront également supprimés !</p>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                <p className="text-sm text-yellow-700">Pour confirmer, tapez : <strong>Effacer {immeubleToDelete?.nom}</strong></p>
              </div>
              
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Effacer ${immeubleToDelete?.nom}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setImmeubleToDelete(null); setDeleteConfirmText(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== `Effacer ${immeubleToDelete?.nom}`}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal - Pour limite d'abonnement */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Limite atteinte
              </h3>
              <p className="text-gray-600 mb-6">
                Votre abonnement actuel permet de gérer <strong>{maxImmeubles}</strong> immeuble{maxImmeubles > 1 ? 's' : ''}.
                <br />
                Pour ajouter plus d'immeubles, veuillez mettre à niveau votre abonnement.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/abonnement');
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-lg"
                >
                  Voir les offres
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImmeublesList;
