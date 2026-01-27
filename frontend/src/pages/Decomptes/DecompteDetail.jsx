import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decomptesService, compteursEauService, relevesService } from '../../services/api';
import RelevesForm from './RelevesForm';
import GestionCompteursEau from "../../components/DecompteEau/GestionCompteursEau";
import ExportImportReleves from '../../components/DecompteEau/ExportImportReleves';
import RepartitionsDisplay from '../../components/DecompteEau/RepartitionsDisplay';
import RelevesDisplay from '../../components/DecompteEau/RelevesDisplay';
import { 
  ArrowLeft, Calculator, AlertCircle, Plus, 
  Building2, Calendar, Droplets, Users, FileEdit, 
  CheckCircle, Lock, Settings
} from 'lucide-react';

function DecompteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [decompte, setDecompte] = useState(null);
  const [compteurs, setCompteurs] = useState([]);
  const [releves, setReleves] = useState([]);
  const [repartitions, setRepartitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [showRelevesForm, setShowRelevesForm] = useState(false);
  const [activeTab, setActiveTab] = useState('releves');
  const [repartitionsViewMode, setRepartitionsViewMode] = useState('grid');
  const [relevesViewMode, setRelevesViewMode] = useState('grid');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const decompteRes = await decomptesService.getById(id);
      setDecompte(decompteRes.data.decompte);
      setRepartitions(decompteRes.data.repartitions || []);

      const compteursRes = await compteursEauService.getByImmeuble(decompteRes.data.decompte.immeuble_id);
      setCompteurs(compteursRes.data.compteurs || []);

      try {
        const relevesRes = await relevesService.getByDecompte(id);
        setReleves(relevesRes.data.releves || []);
      } catch (err) {
        setReleves([]);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculer = async () => {
    try {
      setCalculating(true);
      setError('');
      
      await decomptesService.calculer(id);
      await loadData();
      setActiveTab('repartitions');
      
    } catch (err) {
      console.error('Error calculating:', err);
      setError(err.response?.data?.message || 'Erreur lors du calcul');
    } finally {
      setCalculating(false);
    }
  };

  const getStatusIcon = (statut) => {
    switch(statut) {
      case 'brouillon':
        return <FileEdit className="h-8 w-8 text-gray-500" />;
      case 'calcule':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'valide':
        return <CheckCircle className="h-8 w-8 text-blue-500" />;
      case 'cloture':
        return <Lock className="h-8 w-8 text-red-500" />;
      default:
        return <FileEdit className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusLabel = (statut) => {
    switch(statut) {
      case 'brouillon': return 'Brouillon';
      case 'calcule': return 'Calculé';
      case 'valide': return 'Validé';
      case 'cloture': return 'Clôturé';
      default: return statut;
    }
  };

  const formatPeriode = () => {
    if (!decompte) return '';
    const debut = new Date(decompte.periode_debut).toLocaleDateString('fr-FR');
    const fin = new Date(decompte.periode_fin).toLocaleDateString('fr-FR');
    return `Du ${debut} au ${fin}`;
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

  if (!decompte) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Décompte introuvable</h3>
        <button
          onClick={() => navigate('/decomptes')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const canCalculate = releves.length > 0 && decompte.statut !== 'cloture';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/decomptes')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Décompte {decompte.annee}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {decompte.immeuble_nom}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Stats Cards - CLIQUABLES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Période */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Période</p>
              <p className="text-xs font-semibold text-gray-900 mt-1">
                {formatPeriode()}
              </p>
            </div>
          </div>
        </div>

        {/* Compteurs - CLIQUABLE */}
        <button
          onClick={() => setActiveTab('compteurs')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg hover:border-cyan-300 border-2 border-transparent transition-all text-left"
        >
          <div className="flex items-center">
            <Droplets className="h-8 w-8 text-cyan-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Compteurs</p>
              <p className="text-lg font-semibold text-gray-900">
                {compteurs.length}
              </p>
            </div>
          </div>
        </button>

        {/* Habitants - CLIQUABLE (pourrait ouvrir modal) */}
        <button
          onClick={() => setActiveTab('repartitions')}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg hover:border-purple-300 border-2 border-transparent transition-all text-left"
        >
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Habitants</p>
              <p className="text-lg font-semibold text-gray-900">
                {decompte.total_habitants || 0}
              </p>
            </div>
          </div>
        </button>

        {/* Statut */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            {getStatusIcon(decompte.statut)}
            <div className="ml-4">
              <p className="text-sm text-gray-600">Statut</p>
              <p className="text-lg font-semibold text-gray-900">
                {getStatusLabel(decompte.statut)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button 
              onClick={() => setActiveTab('releves')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'releves'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Relevés compteurs ({releves.length})
            </button>
            <button 
              onClick={() => setActiveTab('repartitions')}
              disabled={repartitions.length === 0}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'repartitions'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : repartitions.length === 0 
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Répartitions ({repartitions.length})
            </button>
            <button 
              onClick={() => setActiveTab('compteurs')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'compteurs'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="inline h-4 w-4 mr-1" />
              Gestion compteurs
            </button>
          </nav>
        </div>

        {/* Tab: Relevés */}
        {activeTab === 'releves' && (
          <div className="p-6">
            {compteurs.length === 0 ? (
              <div className="text-center py-12">
                <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun compteur configuré
                </h3>
                <p className="text-gray-600 mb-6">
                  Configurez d'abord les compteurs d'eau pour cet immeuble
                </p>
                <button
                  onClick={() => setActiveTab('compteurs')}
                  className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Gérer les compteurs
                </button>
              </div>
            ) : releves.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun relevé enregistré
                </h3>
                <p className="text-gray-600 mb-6">
                  Commencez par saisir les index des compteurs
                </p>
                <button 
                  onClick={() => setShowRelevesForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Saisir les relevés
                </button>
              </div>
            ) : (
              <>
                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                  <button 
                    onClick={() => setShowRelevesForm(true)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Modifier les relevés
                  </button>
                  
                  <button
                    onClick={handleCalculer}
                    disabled={calculating || !canCalculate}
                    className="inline-flex items-center justify-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {calculating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-5 w-5 mr-2" />
                        Calculer les répartitions
                      </>
                    )}
                  </button>
                </div>

                {/* Tab: Relevés */}
{activeTab === 'releves' && (
  <div className="p-6">
    {compteurs.length === 0 ? (
      <div className="text-center py-12">
        <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun compteur configuré
        </h3>
        <p className="text-gray-600 mb-6">
          Configurez d'abord les compteurs d'eau pour cet immeuble
        </p>
        <button
          onClick={() => setActiveTab('compteurs')}
          className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          <Settings className="h-5 w-5 mr-2" />
          Gérer les compteurs
        </button>
      </div>
    ) : releves.length === 0 ? (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun relevé enregistré
        </h3>
        <p className="text-gray-600 mb-6">
          Commencez par saisir les index des compteurs
        </p>
        <button 
          onClick={() => setShowRelevesForm(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Saisir les relevés
        </button>
      </div>
    ) : (
      <>


        {/* ✅ NOUVEAU : Composant avec vue grille/liste */}
        <RelevesDisplay 
          releves={releves}
          viewMode={relevesViewMode}
          setViewMode={setRelevesViewMode}
        />
      </>
    )}
  </div>
)}
              </>
            )}
          </div>
        )}

        {/* Tab: Répartitions */}
        {activeTab === 'repartitions' && (
          <div className="p-6">
            <div className="mb-6">
              <ExportImportReleves 
                decompteId={id}
                repartitions={repartitions}
                onImportSuccess={loadData}
              />
            </div>
            
            {repartitions.length > 0 ? (
              <RepartitionsDisplay 
                repartitions={repartitions}
                viewMode={repartitionsViewMode}
                setViewMode={setRepartitionsViewMode}
              />
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucune répartition calculée
                </h3>
                <p className="text-gray-600">
                  Saisissez les relevés puis cliquez sur "Calculer les répartitions"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Gestion Compteurs */}
        {activeTab === 'compteurs' && (
          <div className="p-6">
            <GestionCompteursEau
              immeubleId={decompte.immeuble_id}
              decompteId={id}
              onUpdate={loadData}
            />
          </div>
        )}
      </div>

      {/* Modal Relevés */}
      {showRelevesForm && (
        <RelevesForm
          decompteId={id}
          compteurs={compteurs}
          onClose={() => setShowRelevesForm(false)}
          onSuccess={() => {
            setShowRelevesForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default DecompteDetail;
