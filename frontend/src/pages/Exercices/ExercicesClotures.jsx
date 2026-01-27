import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exercicesService, immeublesService } from '../../services/api';
import { 
  Lock, Building2, Calendar, AlertCircle, RefreshCw,
  ChevronDown, ChevronUp, FileText, Download, Users,
  TrendingUp, TrendingDown, Coins, ArrowRight
} from 'lucide-react';

function ExercicesClotures() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [immeubles, setImmeubles] = useState([]);
  const [exercicesByImmeuble, setExercicesByImmeuble] = useState({});
  const [expandedImmeubles, setExpandedImmeubles] = useState({});
  
  // Filtres
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const immeublesRes = await immeublesService.getAll();
      const immeublesList = immeublesRes.data.immeubles || [];
      setImmeubles(immeublesList);
      
      // Charger les exercices pour chaque immeuble
      const exercicesMap = {};
      for (const immeuble of immeublesList) {
        try {
          const exercicesRes = await exercicesService.getAll(immeuble.id);
          const exercices = exercicesRes.data.exercices || [];
          // Filtrer uniquement les exercices clôturés
          const clotures = exercices.filter(e => e.statut === 'cloture');
          if (clotures.length > 0) {
            exercicesMap[immeuble.id] = clotures;
          }
        } catch (err) {
          console.error(`Error loading exercices for ${immeuble.id}:`, err);
        }
      }
      
      setExercicesByImmeuble(exercicesMap);
      
      // Ouvrir par défaut le premier immeuble avec des exercices
      const firstImmeuble = Object.keys(exercicesMap)[0];
      if (firstImmeuble) {
        setExpandedImmeubles({ [firstImmeuble]: true });
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Extraire toutes les années disponibles
  const allYears = [...new Set(
    Object.values(exercicesByImmeuble)
      .flat()
      .map(e => e.annee)
  )].sort((a, b) => b - a);

  // Filtrer les exercices
  const getFilteredExercices = (exercices) => {
    if (selectedYear === 'all') return exercices;
    return exercices.filter(e => e.annee === parseInt(selectedYear));
  };

  // Compter le total
  const totalExercices = Object.values(exercicesByImmeuble)
    .flat()
    .filter(e => selectedYear === 'all' || e.annee === parseInt(selectedYear))
    .length;

  const toggleImmeuble = (immeubleId) => {
    setExpandedImmeubles(prev => ({
      ...prev,
      [immeubleId]: !prev[immeubleId]
    }));
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant || 0) + ' €';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-BE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exercices clôturés</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consultez l'historique de vos exercices comptables clôturés
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Filtrer par année :</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Toutes les années</option>
              {allYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Stats rapides */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Lock className="h-4 w-4 text-green-500" />
              <span><strong>{totalExercices}</strong> exercice(s) clôturé(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des immeubles avec exercices */}
      {Object.keys(exercicesByImmeuble).length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Lock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun exercice clôturé</h3>
          <p className="text-gray-600 mb-4">
            Vous n'avez pas encore clôturé d'exercice comptable.
          </p>
          <p className="text-sm text-gray-500">
            Pour clôturer un exercice, allez dans la comptabilité d'un immeuble et cliquez sur "Clôturer".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {immeubles
            .filter(imm => exercicesByImmeuble[imm.id]?.length > 0)
            .map(immeuble => {
              const exercices = getFilteredExercices(exercicesByImmeuble[immeuble.id] || []);
              if (exercices.length === 0) return null;
              
              const isExpanded = expandedImmeubles[immeuble.id];
              
              return (
                <div key={immeuble.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* En-tête immeuble */}
                  <button
                    onClick={() => toggleImmeuble(immeuble.id)}
                    className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">{immeuble.nom}</h3>
                        <p className="text-sm text-gray-500">{immeuble.adresse}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        {exercices.length} exercice(s)
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {/* Liste des exercices */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {exercices
                        .sort((a, b) => b.annee - a.annee)
                        .map(exercice => (
                          <div key={exercice.id} className="p-4 hover:bg-gray-50">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Infos exercice */}
                              <div className="flex items-start gap-4">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <Lock className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">Exercice {exercice.annee}</h4>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                      Clôturé
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    {formatDate(exercice.date_debut)} → {formatDate(exercice.date_fin)}
                                  </p>
                                  {exercice.date_cloture && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Clôturé le {formatDate(exercice.date_cloture)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Stats */}
                              <div className="flex flex-wrap gap-4 lg:gap-6">
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">Charges</p>
                                  <p className="font-semibold text-red-600">
                                    {formatMontant(exercice.total_charges)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">Provisions</p>
                                  <p className="font-semibold text-green-600">
                                    {formatMontant(exercice.total_provisions)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">Solde global</p>
                                  <p className={`font-semibold ${parseFloat(exercice.solde_global) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatMontant(exercice.solde_global)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">Propriétaires</p>
                                  <p className="font-semibold text-gray-700">
                                    <Users className="h-3 w-3 inline mr-1" />
                                    {exercice.nb_proprietaires || '-'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Action */}
                              <button
                                onClick={() => navigate(`/immeubles/${immeuble.id}/comptabilite?year=${exercice.annee}`)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              >
                                Voir détails
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {/* Notes de clôture */}
                            {exercice.notes_cloture && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Notes de clôture :</p>
                                <p className="text-sm text-gray-700">{exercice.notes_cloture}</p>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default ExercicesClotures;
