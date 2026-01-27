// ✅ FICHIER BASÉ SUR LE DOCUMENT INDEX 7 
// ✅ AJOUT UNIQUEMENT: Bouton Import/Export Excel

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { proprietairesService, transactionsService, exercicesService } from '../../services/api';
import { useData } from '../../contexts/DataContext';
import { 
  Plus, Users, Building2, Mail, Phone, MapPin, AlertCircle, Trash2, Edit, 
  Briefcase, RefreshCw, TrendingUp, TrendingDown, FileText, 
  Grid3x3, List, Download, Upload
} from 'lucide-react';
import ProprietairesForm from './ProprietairesForm';
import * as XLSX from 'xlsx';

function ProprietairesList() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getImmeubles, getProprietaires, invalidateCache } = useData();
  const [proprietaires, setProprietaires] = useState([]);
  const [immeubles, setImmeubles] = useState([]);
  const [selectedImmeuble, setSelectedImmeuble] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedProprietaire, setSelectedProprietaire] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [proprietaireToDelete, setProprietaireToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [soldes, setSoldes] = useState({});

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

      const proprietairesPromises = immeublesData.map(async (immeuble) => {
        try {
          const props = await getProprietaires(immeuble.id, forceRefresh);
          return props.map(prop => ({
            ...prop,
            immeuble_nom: immeuble.nom,
            immeuble_systeme: immeuble.systeme_repartition || 'milliemes'
          }));
        } catch (err) {
          console.error(`Error loading proprietaires for immeuble ${immeuble.id}:`, err);
          return [];
        }
      });

      const results = await Promise.all(proprietairesPromises);
      const allProprietaires = results.flat();
      setProprietaires(allProprietaires);
      
      loadSoldes(immeublesData, allProprietaires);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadSoldes = async (immeublesData, proprietairesData) => {
    try {
      const currentYear = new Date().getFullYear();
      const soldesMap = {};

      await Promise.all(immeublesData.map(async (immeuble) => {
        try {
          const [exercicesRes, transactionsRes] = await Promise.all([
            exercicesService.getAll(immeuble.id).catch(() => ({ data: { exercices: [] } })),
            transactionsService.getAll(immeuble.id, { limit: 1000 }).catch(() => ({ data: { transactions: [] } }))
          ]);

          const exercices = exercicesRes.data.exercices || [];
          const transactions = transactionsRes.data.transactions || [];
          const currentExercice = exercices.find(e => parseInt(e.annee) === currentYear);

          if (currentExercice) {
            const exerciceDetailRes = await exercicesService.getOne(immeuble.id, currentExercice.id);
            const soldesExercice = exerciceDetailRes.data.exercice?.soldes || [];
            
            soldesExercice.forEach(solde => {
              soldesMap[solde.proprietaire_id] = parseFloat(solde.solde_fin || 0);
            });
          } else {
            const yearTransactions = transactions.filter(t => {
              const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
              return dateField && new Date(dateField).getFullYear() === currentYear;
            });

            const proprietairesImmeuble = proprietairesData.filter(p => p.immeuble_id === immeuble.id);
            const totalParts = proprietairesImmeuble.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
            
            proprietairesImmeuble.forEach(prop => {
              const parts = prop.nombre_parts || prop.milliemes || 0;
              const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;
              
              const totalCharges = yearTransactions
                .filter(t => t.type === 'charge')
                .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
              
              const chargesProprietaire = totalCharges * pourcentage;
              
              const depotsProprietaire = yearTransactions
                .filter(t => t.type !== 'charge' && 
                  (t.proprietaire_id === prop.id || 
                   (t.nom_contrepartie || '').toLowerCase().includes(prop.nom.toLowerCase())))
                .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
              
              soldesMap[prop.id] = depotsProprietaire - chargesProprietaire;
            });
          }
        } catch (err) {
          console.error(`Error loading soldes for immeuble ${immeuble.id}:`, err);
        }
      }));

      setSoldes(soldesMap);
    } catch (err) {
      console.error('Error loading soldes:', err);
    }
  };

  // ✅ NOUVEAU: Export Excel
  const handleExportExcel = () => {
    const filtered = filteredProprietaires;
    
    const data = filtered.map(prop => ({
      'Nom': prop.nom,
      'Prénom': prop.prenom,
      'Type': prop.type_proprietaire === 'personne_morale' ? 'Personne morale' : 'Personne physique',
      'Email': prop.email || '',
      'Téléphone': prop.telephone || '',
      'Adresse': prop.adresse || '',
      'Immeuble': prop.immeuble_nom,
      'Millièmes/Parts': prop.immeuble_systeme === 'milliemes' 
        ? prop.milliemes || 0 
        : prop.parts_coproprietaire || 0,
      'Système': prop.immeuble_systeme === 'milliemes' ? 'Millièmes' : 'Parts',
      'Solde 2026': soldes[prop.id] !== undefined ? soldes[prop.id].toFixed(2) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Propriétaires');
    
    const fileName = selectedImmeuble === 'all' 
      ? `proprietaires_tous_${new Date().toISOString().split('T')[0]}.xlsx`
      : `proprietaires_${immeubles.find(i => i.id === selectedImmeuble)?.nom}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  const handleAdd = () => {
    setSelectedProprietaire(null);
    setShowForm(true);
  };

  const handleEdit = (proprietaire, e) => {
    e?.stopPropagation();
    setSelectedProprietaire(proprietaire);
    setShowForm(true);
  };

  const handleDeleteClick = (proprietaire, e) => {
    e?.stopPropagation();
    setProprietaireToDelete(proprietaire);
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!proprietaireToDelete) return;

    const confirmText = `Effacer ${proprietaireToDelete.prenom} ${proprietaireToDelete.nom}`;
    if (deleteConfirmText !== confirmText) return;

    try {
      const deletedId = proprietaireToDelete.id;
      const immeubleId = proprietaireToDelete.immeuble_id;
      
      await proprietairesService.delete(immeubleId, deletedId);
      
      setProprietaires(prev => prev.filter(p => p.id !== deletedId));
      
      setSoldes(prev => {
        const newSoldes = { ...prev };
        delete newSoldes[deletedId];
        return newSoldes;
      });
      
      setShowDeleteConfirm(false);
      setProprietaireToDelete(null);
      setDeleteConfirmText('');
      
      invalidateCache('proprietaires', immeubleId);
      setTimeout(() => loadData(true), 500);
      
    } catch (err) {
      console.error('Error deleting proprietaire:', err);
      setError('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message));
      setDeleteConfirmText('');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedProprietaire(null);
    invalidateCache('proprietaires');
    loadData(true);
  };

  const handleCardClick = (proprietaire) => {
    navigate(`/immeubles/${proprietaire.immeuble_id}/proprietaires/${proprietaire.id}`);
  };
  
  const handleImmeubleClick = (e, immeubleId) => {
    e.stopPropagation();
    navigate(`/immeubles/${immeubleId}`);
  };

  const getTypeLabel = (type) => {
    return type === 'personne_physique' ? 'Personne physique' : 'Personne morale';
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant || 0) + ' €';
  };

  const filteredProprietaires = selectedImmeuble === 'all' 
    ? proprietaires 
    : proprietaires.filter(p => p.immeuble_id === selectedImmeuble);

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
          <h1 className="text-2xl font-bold text-gray-900">Propriétaires</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les propriétaires de vos immeubles
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* ✅ NOUVEAU: Bouton Export Excel */}
          {filteredProprietaires.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Exporter en Excel"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          )}
          
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
                const count = proprietaires.filter(p => p.immeuble_id === immeuble.id).length;
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

      {filteredProprietaires.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun propriétaire
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedImmeuble === 'all' 
                ? "Commencez par ajouter votre premier propriétaire"
                : "Aucun propriétaire pour cet immeuble"}
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Ajouter un propriétaire
            </button>
          </div>
        </div>
      )}

      {/* ✅ RESTE DU CODE IDENTIQUE AU DOCUMENT INDEX 7 */}
      {filteredProprietaires.length > 0 && (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProprietaires.map((proprietaire) => {
                const solde = soldes[proprietaire.id];
                const hasSolde = solde !== undefined && solde !== null;
                
                return (
                  <div
                    key={proprietaire.id}
                    onClick={() => handleCardClick(proprietaire)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-all border border-gray-200 cursor-pointer group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                            {proprietaire.type_proprietaire === 'personne_morale' ? (
                              <Briefcase className="h-6 w-6 text-purple-600" />
                            ) : (
                              <Users className="h-6 w-6 text-purple-600" />
                            )}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                              {proprietaire.prenom} {proprietaire.nom}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {getTypeLabel(proprietaire.type_proprietaire)}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleImmeubleClick(e, proprietaire.immeuble_id)}
                          className="ml-3 text-right flex-shrink-0 hover:text-primary-600 transition-colors"
                          title="Voir l'immeuble"
                        >
                          <div className="flex items-center text-xs text-gray-500 hover:text-primary-600">
                            <Building2 className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[100px]">
                              {proprietaire.immeuble_nom}
                            </span>
                          </div>
                        </button>
                      </div>

                      <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                        {proprietaire.email && (
                          <a
                            href={`mailto:${proprietaire.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center text-sm text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{proprietaire.email}</span>
                          </a>
                        )}
                        {proprietaire.telephone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span>{proprietaire.telephone}</span>
                          </div>
                        )}
                        {proprietaire.adresse && (
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="line-clamp-2">{proprietaire.adresse}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {proprietaire.immeuble_systeme === 'milliemes' ? (
                          <div>
                            <p className="text-xs text-gray-500">Millièmes</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {proprietaire.milliemes || 0}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-gray-500">Parts</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {proprietaire.parts_coproprietaire || 0}
                            </p>
                          </div>
                        )}
                        
                        {hasSolde && (
                          <div>
                            <p className="text-xs text-gray-500">Solde {new Date().getFullYear()}</p>
                            <p className={`text-sm font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                              {solde >= 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {formatMontant(Math.abs(solde))}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => handleEdit(proprietaire, e)}
                          className="flex items-center justify-center px-2 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(proprietaire);
                          }}
                          className="flex-1 flex items-center justify-center px-2 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Voir le décompte"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          <span>Décompte</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(proprietaire, e)}
                          className="flex items-center justify-center px-2 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                        Propriétaire
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Immeuble
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quote-part
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProprietaires.map((proprietaire) => {
                      const solde = soldes[proprietaire.id];
                      const hasSolde = solde !== undefined && solde !== null;
                      
                      return (
                        <tr 
                          key={proprietaire.id} 
                          onClick={() => handleCardClick(proprietaire)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                  {proprietaire.type_proprietaire === 'personne_morale' ? (
                                    <Briefcase className="h-6 w-6 text-purple-600" />
                                  ) : (
                                    <Users className="h-6 w-6 text-purple-600" />
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {proprietaire.prenom} {proprietaire.nom}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {getTypeLabel(proprietaire.type_proprietaire)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => handleImmeubleClick(e, proprietaire.immeuble_id)}
                              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              {proprietaire.immeuble_nom}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {proprietaire.email && (
                                <a 
                                  href={`mailto:${proprietaire.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary-600 hover:underline block truncate max-w-xs"
                                >
                                  {proprietaire.email}
                                </a>
                              )}
                            </div>
                            {proprietaire.telephone && (
                              <div className="text-sm text-gray-500">{proprietaire.telephone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {proprietaire.immeuble_systeme === 'milliemes' 
                              ? `${proprietaire.milliemes || 0} millièmes`
                              : `${proprietaire.parts_coproprietaire || 0} parts`
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            {hasSolde ? (
                              <span className={`font-semibold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatMontant(solde)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={(e) => handleEdit(proprietaire, e)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Modifier"
                              >
                                <Edit className="h-6 w-6" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCardClick(proprietaire);
                                }}
                                className="text-gray-600 hover:text-gray-900"
                                title="Voir le décompte"
                              >
                                <FileText className="h-6 w-6" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClick(proprietaire, e)}
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
        <ProprietairesForm
          proprietaire={selectedProprietaire}
          immeubles={immeubles}
          onClose={() => {
            setShowForm(false);
            setSelectedProprietaire(null);
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
                Cette action est <strong>irréversible</strong>. Le propriétaire <strong className="text-gray-900">{proprietaireToDelete?.prenom} {proprietaireToDelete?.nom}</strong> sera définitivement supprimé.
              </p>
              
              <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                <p className="text-sm text-red-800 font-semibold">
                  ⚠️ Attention : Tous les locataires associés seront également supprimés !
                </p>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                <p className="text-sm text-yellow-700">
                  Pour confirmer, tapez : <strong>Effacer {proprietaireToDelete?.prenom} {proprietaireToDelete?.nom}</strong>
                </p>
              </div>
              
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={`Effacer ${proprietaireToDelete?.prenom} ${proprietaireToDelete?.nom}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProprietaireToDelete(null);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== `Effacer ${proprietaireToDelete?.prenom} ${proprietaireToDelete?.nom}`}
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

export default ProprietairesList;
