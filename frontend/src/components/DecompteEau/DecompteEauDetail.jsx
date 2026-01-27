import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decomptesEauService } from '../../services/api';
import { ArrowLeft, Activity, Calculator, Save, CheckCircle, AlertCircle } from 'lucide-react';
import RelevesTab from './tabs/RelevesTab';
import CalculTab from './tabs/CalculTab';

export default function DecompteEauDetail() {
  // Utilise "id" au lieu de "decompteId" car c'est ce qui est dans la route
  const { id } = useParams();
  const navigate = useNavigate();
  const [decompte, setDecompte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('releves');
  const [saving, setSaving] = useState(false);

  console.log('🔵 DecompteEauDetail mounted');
  console.log('🔵 URL params:', { id });

  useEffect(() => { 
    console.log('🔵 useEffect triggered, id:', id);
    if (id) {
      loadDecompte(); 
    } else {
      console.error('❌ No ID in URL params');
      setError('ID de décompte manquant');
      setLoading(false);
    }
  }, [id]);

  const loadDecompte = async () => {
    try {
      console.log('🔵 Loading decompte with id:', id);
      setLoading(true);
      setError(null);
      
      const response = await decomptesEauService.getById(id);
      console.log('✅ Decompte API response:', response);
      console.log('✅ Decompte data:', response.data);
      
      if (response.data && response.data.decompte) {
        console.log('✅ Setting decompte:', response.data.decompte);
        setDecompte(response.data.decompte);
      } else {
        console.error('❌ Invalid response format:', response.data);
        setError('Format de réponse invalide');
      }
    } catch (error) {
      console.error('❌ Error loading decompte:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      setError(error.response?.data?.message || error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
      console.log('🔵 Loading finished');
    }
  };

  const handleUpdate = (updatedDecompte) => { 
    console.log('🔵 Updating decompte:', updatedDecompte);
    setDecompte(updatedDecompte); 
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('🔵 Saving decompte:', decompte);
      await decomptesEauService.update(id, decompte);
      console.log('✅ Decompte saved');
      alert('Modifications sauvegardées avec succès');
    } catch (error) {
      console.error('❌ Error saving:', error);
      alert('Erreur lors de la sauvegarde: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!confirm('Valider ce décompte ? Cette action est irréversible.')) return;
    
    try {
      console.log('🔵 Validating decompte:', id);
      await decomptesEauService.validate(id);
      console.log('✅ Decompte validated');
      alert('Décompte validé avec succès');
      loadDecompte();
    } catch (error) {
      console.error('❌ Error validating:', error);
      alert('Erreur lors de la validation: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleBack = () => {
    console.log('🔵 Going back, decompte:', decompte);
    if (decompte?.immeuble_id) {
      navigate(`/immeubles/${decompte.immeuble_id}/decomptes-eau`);
    } else {
      navigate('/decomptes');
    }
  };

  const tabs = [
    { id: 'releves', label: 'Relevés', icon: Activity },
    { id: 'calcul', label: 'Calcul', icon: Calculator }
  ];

  console.log('🔵 Current state:', { loading, error, decompte: !!decompte, activeTab });

  // État de chargement
  if (loading) {
    console.log('🔵 Rendering loading state');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Chargement du décompte...</p>
        <p className="text-gray-400 text-sm mt-2">ID: {id}</p>
        <p className="text-gray-300 text-xs mt-4">Si cette page reste bloquée, ouvrez F12 et regardez la console</p>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    console.log('🔵 Rendering error state:', error);
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">Erreur de chargement</h3>
          <p className="text-red-700 mb-2">{error}</p>
          <p className="text-sm text-red-600 mb-6">ID demandé: {id}</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={loadDecompte}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
            <button 
              onClick={() => navigate('/decomptes')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Retour aux décomptes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Décompte introuvable
  if (!decompte) {
    console.log('🔵 Rendering not found state');
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-900 mb-2">Décompte introuvable</h3>
          <p className="text-amber-700 mb-6">Le décompte demandé n'existe pas ou a été supprimé.</p>
          <button 
            onClick={() => navigate('/decomptes')}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Retour aux décomptes
          </button>
        </div>
      </div>
    );
  }

  console.log('🔵 Rendering main view');
  const disabled = decompte.statut === 'valide' || decompte.statut === 'cloture';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button 
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour
        </button>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {decompte.nom || `Décompte ${decompte.annee}`}
            </h1>
            <p className="text-gray-600 mt-1">
              Période : {new Date(decompte.periode_debut).toLocaleDateString('fr-FR')}
              {' → '}
              {new Date(decompte.periode_fin).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div className="flex gap-2">
            {!disabled && (
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
            
            {disabled && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                <CheckCircle className="h-5 w-5" />
                {decompte.statut === 'valide' ? 'Validé' : 'Clôturé'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => {
                  console.log('🔵 Switching to tab:', tab.id);
                  setActiveTab(tab.id);
                }} 
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'releves' && (
          <>
            {console.log('🔵 Rendering RelevesTab')}
            <RelevesTab 
              decompte={decompte} 
              onUpdate={handleUpdate} 
              disabled={disabled} 
            />
          </>
        )}
        
        {activeTab === 'calcul' && (
          <>
            {console.log('🔵 Rendering CalculTab')}
            <CalculTab 
              decompte={decompte} 
              onValidate={handleValidate} 
              disabled={disabled} 
            />
          </>
        )}
      </div>

      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          {activeTab === 'releves' && (
            <>💡 <strong>Relevés :</strong> Saisissez les index comme sur vos compteurs. Les cases bleues sont pour les m³ entiers, les vertes pour les décimales.</>
          )}
          {activeTab === 'calcul' && (
            <>💡 <strong>Calcul :</strong> Calculez les répartitions basées sur les relevés saisis, puis validez pour envoyer en comptabilité.</>
          )}
        </p>
      </div>
    </div>
  );
}
