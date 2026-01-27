import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  BarChart3,
  ArrowRightLeft,
  AlertTriangle
} from 'lucide-react';
import {
  immeublesService,
  exercicesService,
  proprietairesService
} from '../../services/api';

// Couleurs pour les statuts
const STATUT_COLORS = {
  brouillon: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  ouvert: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  cloture: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  archive: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' }
};

const STATUT_LABELS = {
  brouillon: 'Brouillon',
  ouvert: 'Ouvert',
  cloture: 'Clôturé',
  archive: 'Archivé'
};

function ExercicesComptables() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [immeuble, setImmeuble] = useState(null);
  const [exercices, setExercices] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  
  const [selectedExercice, setSelectedExercice] = useState(null);
  const [expandedExercice, setExpandedExercice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClotureModal, setShowClotureModal] = useState(false);
  
  // ✅ Confirmation écrite pour clôture
  const [clotureConfirmText, setClotureConfirmText] = useState('');
  
  // Formulaire nouvel exercice
  const [newExercice, setNewExercice] = useState({
    annee: new Date().getFullYear(),
    dateDebut: `${new Date().getFullYear()}-01-01`,
    dateFin: `${new Date().getFullYear()}-12-31`,
    budgetPrevisionnel: 0,
    budgetFondsReserve: 0
  });

  useEffect(() => {
    loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [immeubleRes, exercicesRes, proprietairesRes] = await Promise.all([
        immeublesService.getOne(immeubleId),
        exercicesService.getAll(immeubleId),
        proprietairesService.getByImmeuble(immeubleId)
      ]);

      setImmeuble(immeubleRes.data.immeuble);
      setExercices(exercicesRes.data.exercices || []);
      setProprietaires(proprietairesRes.data.proprietaires || []);

      // Sélectionner l'exercice ouvert par défaut
      const exerciceOuvert = (exercicesRes.data.exercices || []).find(e => e.statut === 'ouvert');
      if (exerciceOuvert) {
        setSelectedExercice(exerciceOuvert);
        setExpandedExercice(exerciceOuvert.id);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercice = async () => {
    try {
      setLoading(true);
      await exercicesService.create(immeubleId, newExercice);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      console.error('Error creating exercice:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Texte attendu pour la confirmation de clôture
  const getExpectedClotureText = () => {
    if (!selectedExercice || !immeuble) return '';
    return `CLOTURER ${selectedExercice.annee}`;
  };

  const handleCloturerExercice = async () => {
    if (!selectedExercice) return;
    
    // ✅ Vérifier la confirmation écrite
    if (clotureConfirmText !== getExpectedClotureText()) {
      return;
    }
    
    try {
      setLoading(true);
      await exercicesService.cloturer(immeubleId, selectedExercice.id);
      setShowClotureModal(false);
      setClotureConfirmText('');
      loadData();
    } catch (err) {
      console.error('Error closing exercice:', err);
      setError(err.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Rediriger vers la section comptabilité de l'immeuble
  const handleVoirDecomptes = (exercice) => {
    navigate(`/immeubles/${immeubleId}?tab=comptabilite&year=${exercice.annee}`);
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-BE');
  };

  if (loading && !immeuble) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/immeubles/${immeubleId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'immeuble
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Exercices Comptables</h1>
              <p className="text-gray-600">{immeuble?.nom} - Report À Nouveau</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Nouvel exercice
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Info RAN */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          Report À Nouveau (RAN)
        </h3>
        <p className="text-sm text-blue-700">
          Le solde de chaque propriétaire en fin d'exercice est automatiquement reporté comme solde 
          initial de l'exercice suivant. Un propriétaire avec +300€ en 2024 commencera 2025 avec ce même solde.
        </p>
      </div>

      {/* Liste des exercices */}
      {exercices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun exercice comptable</h3>
          <p className="text-gray-600 mb-4">
            Créez votre premier exercice pour commencer le suivi comptable avec Report À Nouveau.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Créer l'exercice {new Date().getFullYear()}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {exercices.map((exercice) => {
            const colors = STATUT_COLORS[exercice.statut] || STATUT_COLORS.brouillon;
            const isExpanded = expandedExercice === exercice.id;
            const soldeGlobal = parseFloat(exercice.solde_global || 0);
            
            return (
              <div
                key={exercice.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                  selectedExercice?.id === exercice.id ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {/* En-tête exercice */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setSelectedExercice(exercice);
                    setExpandedExercice(isExpanded ? null : exercice.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
                        {exercice.statut === 'cloture' || exercice.statut === 'archive' ? (
                          <Lock className={`w-5 h-5 ${colors.text}`} />
                        ) : (
                          <Unlock className={`w-5 h-5 ${colors.text}`} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Exercice {exercice.annee}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(exercice.date_debut)} - {formatDate(exercice.date_fin)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {STATUT_LABELS[exercice.statut]}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-500">Provisions</p>
                        <p className="font-medium text-green-600">
                          {formatMontant(exercice.total_provisions)}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-500">Charges</p>
                        <p className="font-medium text-red-600">
                          {formatMontant(exercice.total_charges)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Solde global</p>
                        <p className={`font-bold ${soldeGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatMontant(soldeGlobal)}
                        </p>
                      </div>
                      
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Détails exercice */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      {/* Budget */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Budget prévisionnel
                        </h4>
                        <p className="text-2xl font-bold text-primary-600">
                          {formatMontant(exercice.budget_previsionnel)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Fonds de réserve: {formatMontant(exercice.budget_fonds_reserve)}
                        </p>
                      </div>
                      
                      {/* Statistiques */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Propriétaires
                        </h4>
                        <p className="text-2xl font-bold text-gray-900">
                          {exercice.nb_proprietaires || proprietaires.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          copropriétaires actifs
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-medium text-gray-700 mb-3">Actions</h4>
                        <div className="space-y-2">
                          {/* ✅ Voir les décomptes redirige vers la section comptabilité */}
                          <button
                            onClick={() => handleVoirDecomptes(exercice)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            Voir les décomptes
                          </button>
                          
                          {exercice.statut === 'ouvert' && (
                            <button
                              onClick={() => {
                                setSelectedExercice(exercice);
                                setClotureConfirmText('');
                                setShowClotureModal(true);
                              }}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 text-sm"
                            >
                              <Lock className="w-4 h-4" />
                              Clôturer l'exercice
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table des soldes propriétaires */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="px-4 py-3 bg-gray-100 border-b">
                        <h4 className="font-medium text-gray-700">Soldes par propriétaire</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Propriétaire
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Millièmes
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                <span className="inline-flex items-center gap-1">
                                  <ArrowRightLeft className="w-3 h-3" />
                                  Report (RAN)
                                </span>
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Provisions
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Charges
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Solde final
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {exercice.soldes?.map((solde) => {
                              const soldeFin = parseFloat(solde.solde_fin || 0);
                              const ran = parseFloat(solde.solde_debut || 0);
                              
                              return (
                                <tr key={solde.proprietaire_id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">
                                      {solde.proprietaire_prenom} {solde.proprietaire_nom}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Apt. {solde.numero_appartement}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                      {solde.milliemes}/1000
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`font-medium ${ran >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                      {formatMontant(ran)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600">
                                    +{formatMontant(solde.total_provisions)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-red-600">
                                    -{formatMontant(solde.total_charges)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`font-bold ${soldeFin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatMontant(soldeFin)}
                                    </span>
                                    {soldeFin >= 0 ? (
                                      <TrendingUp className="w-4 h-4 inline ml-1 text-green-500" />
                                    ) : (
                                      <TrendingDown className="w-4 h-4 inline ml-1 text-red-500" />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Création exercice */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Créer un nouvel exercice
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Année
                </label>
                <input
                  type="number"
                  value={newExercice.annee}
                  onChange={(e) => {
                    const annee = parseInt(e.target.value);
                    setNewExercice({
                      ...newExercice,
                      annee,
                      dateDebut: `${annee}-01-01`,
                      dateFin: `${annee}-12-31`
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={newExercice.dateDebut}
                    onChange={(e) => setNewExercice({ ...newExercice, dateDebut: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={newExercice.dateFin}
                    onChange={(e) => setNewExercice({ ...newExercice, dateFin: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget prévisionnel (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExercice.budgetPrevisionnel}
                  onChange={(e) => setNewExercice({ ...newExercice, budgetPrevisionnel: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget fonds de réserve (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExercice.budgetFondsReserve}
                  onChange={(e) => setNewExercice({ ...newExercice, budgetFondsReserve: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <strong>Note:</strong> Les soldes de l'exercice {newExercice.annee - 1} seront 
                automatiquement reportés comme Report À Nouveau.
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateExercice}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer l\'exercice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal Clôture avec confirmation écrite */}
      {showClotureModal && selectedExercice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Clôturer l'exercice {selectedExercice.annee}
              </h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                La clôture de l'exercice va :
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Finaliser tous les soldes propriétaires</li>
                <li>Empêcher toute modification ultérieure</li>
                <li>Préparer le Report À Nouveau pour le prochain exercice</li>
              </ul>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Action irréversible</p>
                    <p className="text-sm text-red-700 mt-1">
                      Pour confirmer, tapez exactement :
                    </p>
                    <p className="font-mono font-bold text-red-800 mt-2 p-2 bg-red-100 rounded">
                      {getExpectedClotureText()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmation
                </label>
                <input
                  type="text"
                  value={clotureConfirmText}
                  onChange={(e) => setClotureConfirmText(e.target.value.toUpperCase())}
                  placeholder={getExpectedClotureText()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono ${
                    clotureConfirmText && clotureConfirmText !== getExpectedClotureText() 
                      ? 'border-red-300 bg-red-50' 
                      : clotureConfirmText === getExpectedClotureText() 
                        ? 'border-green-300 bg-green-50' 
                        : ''
                  }`}
                />
                {clotureConfirmText && clotureConfirmText !== getExpectedClotureText() && (
                  <p className="text-xs text-red-600 mt-1">
                    Le texte ne correspond pas
                  </p>
                )}
                {clotureConfirmText === getExpectedClotureText() && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Confirmation valide
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowClotureModal(false);
                  setClotureConfirmText('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={handleCloturerExercice}
                disabled={loading || clotureConfirmText !== getExpectedClotureText()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Clôture...' : 'Confirmer la clôture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExercicesComptables;
