import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { locatairesService, proprietairesService } from '../../services/api';
import { useData } from '../../contexts/DataContext';
import { 
  Plus, Users, Building2, Mail, Phone, Calendar, AlertCircle, Trash2, Edit, 
  RefreshCw, Grid3x3, List, UserCircle, Home 
} from 'lucide-react';
import LocatairesForm from './LocatairesForm';

function LocatairesList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getImmeubles, getLocataires, getProprietaires, invalidateCache } = useData();
  const [locataires, setLocataires] = useState([]);
  const [immeubles, setImmeubles] = useState([]);
  const [proprietaires, setProprietaires] = useState({});
  const [selectedImmeuble, setSelectedImmeuble] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedLocataire, setSelectedLocataire] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [locataireToDelete, setLocataireToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    loadData();
    
    if (location.state?.selectedImmeuble) {
      setSelectedImmeuble(location.state.selectedImmeuble);
    }
  }, [location.state]);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const immeublesData = await getImmeubles(forceRefresh);
      setImmeubles(immeublesData);

      const [locatairesResults, proprietairesResults] = await Promise.all([
        Promise.all(immeublesData.map(async (immeuble) => {
          try {
            const locs = await getLocataires(immeuble.id, forceRefresh);
            return locs.map(loc => ({
              ...loc,
              immeuble_nom: immeuble.nom
            }));
          } catch (err) {
            console.error(`Error loading locataires for immeuble ${immeuble.id}:`, err);
            return [];
          }
        })),
        Promise.all(immeublesData.map(async (immeuble) => {
          try {
            const props = await getProprietaires(immeuble.id, forceRefresh);
            return { immeubleId: immeuble.id, proprietaires: props };
          } catch (err) {
            console.error(`Error loading proprietaires for immeuble ${immeuble.id}:`, err);
            return { immeubleId: immeuble.id, proprietaires: [] };
          }
        }))
      ]);

      setLocataires(locatairesResults.flat());

      const propsMap = {};
      proprietairesResults.forEach(({ proprietaires }) => {
        proprietaires.forEach(prop => {
          propsMap[prop.id] = prop;
        });
      });
      setProprietaires(propsMap);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedLocataire(null);
    setShowForm(true);
  };

  const handleEdit = (locataire, e) => {
    e?.stopPropagation();
    setSelectedLocataire(locataire);
    setShowForm(true);
  };

  const handleDeleteClick = (locataire, e) => {
    e?.stopPropagation();
    setLocataireToDelete(locataire);
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locataireToDelete) return;

    const confirmText = `Effacer ${locataireToDelete.prenom} ${locataireToDelete.nom}`;
    if (deleteConfirmText !== confirmText) return;

    try {
      const deletedId = locataireToDelete.id;
      const immeubleId = locataireToDelete.immeuble_id;

      await locatairesService.delete(immeubleId, deletedId);
      
      setLocataires(prev => prev.filter(l => l.id !== deletedId));
      
      setShowDeleteConfirm(false);
      setLocataireToDelete(null);
      setDeleteConfirmText('');
      
      invalidateCache('locataires', immeubleId);
      setTimeout(() => loadData(true), 500);

    } catch (err) {
      console.error('Error deleting locataire:', err);
      setError('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message));
      setDeleteConfirmText('');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedLocataire(null);
    invalidateCache('locataires');
    loadData(true);
  };

  const handleCardClick = (locataire) => {
    navigate(`/immeubles/${locataire.immeuble_id}/locataires/${locataire.id}`);
  };

  const handleImmeubleClick = (e, immeubleId) => {
    e.stopPropagation();
    navigate(`/immeubles/${immeubleId}`);
  };

  const handleProprietaireClick = (e, immeubleId, proprietaireId) => {
    e.stopPropagation();
    navigate(`/immeubles/${immeubleId}/proprietaires/${proprietaireId}`);
  };

  const isActive = (locataire) => {
    if (!locataire.date_fin_bail) return true;
    const finDate = new Date(locataire.date_fin_bail);
    return finDate > new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-BE');
  };

  const formatMontant = (montant) => {
    if (!montant || montant === 0) return null;
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant) + ' €';
  };

  const filteredLocataires = selectedImmeuble === 'all' 
    ? locataires 
    : locataires.filter(l => l.immeuble_id === selectedImmeuble);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locataires</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos locataires et leurs baux
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex-1">
            <label htmlFor="immeuble-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par immeuble
            </label>
            <select
              id="immeuble-filter"
              value={selectedImmeuble}
              onChange={(e) => setSelectedImmeuble(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tous les immeubles</option>
              {immeubles.map((immeuble) => {
                const count = locataires.filter(l => l.immeuble_id === immeuble.id).length;
                return (
                  <option key={immeuble.id} value={immeuble.id}>
                    {immeuble.nom} ({count})
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vue grille"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vue liste"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {filteredLocataires.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun locataire
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedImmeuble === 'all' 
                ? "Commencez par ajouter votre premier locataire"
                : "Aucun locataire pour cet immeuble"}
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter un locataire
            </button>
          </div>
        </div>
      )}

      {filteredLocataires.length > 0 && (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {filteredLocataires.map((locataire) => {
                const proprietaire = proprietaires[locataire.proprietaire_id];
                const active = isActive(locataire);

                return (
                  <div
                    key={locataire.id}
                    onClick={() => handleCardClick(locataire)}
                    className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
                  >
                    {/* SECTION 1: Header - Hauteur fixe */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                            <Users className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                              {locataire.prenom} {locataire.nom}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {locataire.appartement || 'Pas d\'appart.'}
                            </span>
                          </div>
                        </div>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                          active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>

                    {/* SECTION 2: Immeuble & Propriétaire - Hauteur fixe (2 lignes) */}
                    <div className="px-4 py-3 space-y-2 border-b border-gray-100">
                      {/* Immeuble - Toujours présent */}
                      <button
                        onClick={(e) => handleImmeubleClick(e, locataire.immeuble_id)}
                        className="flex items-center text-sm text-primary-600 hover:text-primary-700 hover:underline w-full text-left"
                      >
                        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{locataire.immeuble_nom}</span>
                      </button>
                      
                      {/* Propriétaire - Ligne réservée */}
                      <div className="h-5 min-h-[20px]">
                        {proprietaire ? (
                          <button
                            onClick={(e) => handleProprietaireClick(e, locataire.immeuble_id, proprietaire.id)}
                            className="flex items-center text-sm text-purple-600 hover:text-purple-700 hover:underline w-full text-left"
                          >
                            <UserCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {proprietaire.prenom} {proprietaire.nom}
                            </span>
                          </button>
                        ) : (
                          <div className="h-5" />
                        )}
                      </div>
                    </div>

                    {/* SECTION 3: Contact - Hauteur fixe (2 lignes) */}
                    <div className="px-4 py-3 space-y-2 border-b border-gray-100">
                      {/* Email - Ligne toujours présente */}
                      <div className="h-5 flex items-center min-h-[20px]">
                        {locataire.email ? (
                          <a
                            href={`mailto:${locataire.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center text-sm text-primary-600 hover:text-primary-700 hover:underline w-full"
                          >
                            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{locataire.email}</span>
                          </a>
                        ) : (
                          <div className="h-5" />
                        )}
                      </div>
                      
                      {/* Téléphone - Ligne toujours présente */}
                      <div className="h-5 flex items-center min-h-[20px]">
                        {locataire.telephone ? (
                          <div className="flex items-center text-sm text-gray-600 w-full">
                            <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span>{locataire.telephone}</span>
                          </div>
                        ) : (
                          <div className="h-5" />
                        )}
                      </div>
                    </div>

                    {/* SECTION 4: Infos - Flex-1 pour pousser le footer */}
                    <div className="px-4 py-3 flex-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Entrée</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(locataire.date_debut_bail)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Loyer</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {locataire.loyer_mensuel > 0 ? formatMontant(locataire.loyer_mensuel) : '-'}
                          </p>
                        </div>
                        {locataire.nombre_habitants > 0 && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 mb-1">Habitants</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center">
                              <Home className="h-3 w-3 mr-1" />
                              {locataire.nombre_habitants}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 5: Actions - Hauteur fixe en bas */}
                    <div className="px-4 pb-4 pt-2 flex space-x-2 border-t border-gray-100">
                      <button
                        onClick={(e) => handleEdit(locataire, e)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(locataire, e)}
                        className="flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Locataire
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Immeuble / Propriétaire
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Période
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLocataires.map((locataire) => {
                      const proprietaire = proprietaires[locataire.proprietaire_id];
                      const active = isActive(locataire);

                      return (
                        <tr 
                          key={locataire.id}
                          onClick={() => handleCardClick(locataire)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-green-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {locataire.prenom} {locataire.nom}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {locataire.appartement || 'Pas d\'appart.'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => handleImmeubleClick(e, locataire.immeuble_id)}
                              className="text-sm text-primary-600 hover:text-primary-700 hover:underline block"
                            >
                              {locataire.immeuble_nom}
                            </button>
                            {proprietaire && (
                              <button
                                onClick={(e) => handleProprietaireClick(e, locataire.immeuble_id, proprietaire.id)}
                                className="text-xs text-purple-600 hover:text-purple-700 hover:underline block mt-1"
                              >
                                {proprietaire.prenom} {proprietaire.nom}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {locataire.email && (
                              <a
                                href={`mailto:${locataire.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-primary-600 hover:underline block truncate max-w-xs"
                              >
                                {locataire.email}
                              </a>
                            )}
                            {locataire.telephone && (
                              <div className="text-sm text-gray-500">{locataire.telephone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(locataire.date_debut_bail)}
                            {locataire.date_fin_bail && (
                              <div className="text-xs">→ {formatDate(locataire.date_fin_bail)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {locataire.loyer_mensuel > 0 ? (
                              <>
                                <div className="font-semibold text-gray-900">
                                  {formatMontant(locataire.loyer_mensuel)}
                                </div>
                                {locataire.charges_mensuelles > 0 && (
                                  <div className="text-xs text-gray-500">
                                    + {formatMontant(locataire.charges_mensuelles)} ch.
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={(e) => handleEdit(locataire, e)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Modifier"
                              >
                                <Edit className="h-6 w-6" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClick(locataire, e)}
                                className="text-red-600 hover:text-red-900"
                                title="Supprimer"
                              >
                                <Trash2 className="h-6 w-6" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <LocatairesForm
          locataire={selectedLocataire}
          immeubles={immeubles}
          onClose={() => {
            setShowForm(false);
            setSelectedLocataire(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900">
                Confirmer la suppression
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Cette action est <strong>irréversible</strong>. Le locataire <strong className="text-gray-900">{locataireToDelete?.prenom} {locataireToDelete?.nom}</strong> sera définitivement supprimé.
              </p>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                <p className="text-sm text-yellow-700">
                  Pour confirmer, tapez : <strong>Effacer {locataireToDelete?.prenom} {locataireToDelete?.nom}</strong>
                </p>
              </div>
              
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Effacer ${locataireToDelete?.prenom} ${locataireToDelete?.nom}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setLocataireToDelete(null);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== `Effacer ${locataireToDelete?.prenom} ${locataireToDelete?.nom}`}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocatairesList;
