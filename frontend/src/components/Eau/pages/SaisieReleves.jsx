// =====================================================
// 📊 PAGE SAISIE RELEVÉS
// frontend/src/components/Eau/pages/SaisieReleves.jsx
// =====================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Save, AlertTriangle, CheckCircle, Droplets } from 'lucide-react';

export default function SaisieReleves() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [compteurs, setCompteurs] = useState([]);
  
  const [periode, setPeriode] = useState({
    debut: '',
    fin: ''
  });
  
  const [releves, setReleves] = useState({});
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [immeubleId]);

  useEffect(() => {
    if (config?.type_comptage === 'divisionnaire' && Object.keys(releves).length > 0) {
      validatePertes();
    }
  }, [releves]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Config
      const configRes = await fetch(`/api/v1/eau/configuration/${immeubleId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const configData = await configRes.json();
      setConfig(configData.config);
      
      // Compteurs
      const compteursRes = await fetch(`/api/v1/immeubles/${immeubleId}/compteurs-eau`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const compteursData = await compteursRes.json();
      const cmpts = compteursData.compteurs || [];
      setCompteurs(cmpts);
      
      // Initialiser relevés
      const initReleves = {};
      cmpts.forEach(c => {
        initReleves[c.id] = {
          index_debut: '',
          index_fin: '',
          consommation: 0
        };
      });
      setReleves(initReleves);
      
      // Période par défaut (année en cours)
      const now = new Date();
      setPeriode({
        debut: `${now.getFullYear()}-01-01`,
        fin: `${now.getFullYear()}-12-31`
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleReleveChange = (compteurId, field, value) => {
    const newReleves = {
      ...releves,
      [compteurId]: {
        ...releves[compteurId],
        [field]: value
      }
    };
    
    // Calculer consommation
    if (field === 'index_debut' || field === 'index_fin') {
      const debut = parseFloat(field === 'index_debut' ? value : newReleves[compteurId].index_debut) || 0;
      const fin = parseFloat(field === 'index_fin' ? value : newReleves[compteurId].index_fin) || 0;
      newReleves[compteurId].consommation = Math.max(0, fin - debut);
    }
    
    setReleves(newReleves);
  };

  const validatePertes = () => {
    const principal = compteurs.find(c => c.type_compteur === 'principal');
    const divisionnaires = compteurs.filter(c => c.type_compteur === 'divisionnaire');
    
    if (!principal || divisionnaires.length === 0) return;
    
    const consoPrincipal = releves[principal.id]?.consommation || 0;
    const sommeDivisionnaires = divisionnaires.reduce((sum, c) => {
      return sum + (releves[c.id]?.consommation || 0);
    }, 0);
    
    if (consoPrincipal === 0 || sommeDivisionnaires === 0) {
      setValidation(null);
      return;
    }
    
    const pertes = consoPrincipal - sommeDivisionnaires;
    const pourcentagePertes = (pertes / consoPrincipal) * 100;
    
    setValidation({
      pertes,
      pourcentage: pourcentagePertes,
      valid: sommeDivisionnaires <= consoPrincipal,
      warning: pourcentagePertes > 10
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Validation
      if (!periode.debut || !periode.fin) {
        setError('Période requise');
        return;
      }
      
      // Vérifier que tous les relevés sont remplis
      const allFilled = compteurs.every(c => {
        const r = releves[c.id];
        return r && r.index_debut !== '' && r.index_fin !== '';
      });
      
      if (!allFilled) {
        setError('Tous les relevés doivent être remplis');
        return;
      }
      
      // Vérifier validation pertes
      if (validation && !validation.valid) {
        setError('Erreur : La somme des divisionnaires est supérieure au principal');
        return;
      }
      
      // Sauvegarder chaque relevé
      const promises = compteurs.map(async (compteur) => {
        const releve = releves[compteur.id];
        
        return fetch(`/api/v1/eau/releves/${immeubleId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            compteur_id: compteur.id,
            periode_debut: periode.debut,
            periode_fin: periode.fin,
            index_debut: parseFloat(releve.index_debut),
            index_fin: parseFloat(releve.index_fin),
            notes: ''
          })
        });
      });
      
      const responses = await Promise.all(promises);
      const allSuccess = responses.every(r => r.ok);
      
      if (!allSuccess) {
        throw new Error('Erreur lors de la sauvegarde de certains relevés');
      }
      
      setSuccess(true);
      
      // Rediriger après 2s
      setTimeout(() => {
        navigate(`/immeubles/${immeubleId}/eau/decomptes`);
      }, 2000);
      
    } catch (error) {
      console.error('Error saving releves:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config || compteurs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            ⚠️ Vous devez d'abord configurer les compteurs
          </p>
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}/eau/compteurs`)}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Configurer les compteurs
          </button>
        </div>
      </div>
    );
  }

  const principal = compteurs.find(c => c.type_compteur === 'principal');
  const divisionnaires = compteurs.filter(c => c.type_compteur === 'divisionnaire');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/immeubles/${immeubleId}/eau/compteurs`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            Saisie des Relevés
          </h1>
          <p className="text-gray-600 mt-1">
            Période annuelle • {compteurs.length} compteur{compteurs.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-800">✅ Relevés enregistrés ! Redirection...</p>
        </div>
      )}

      {/* Période */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Période de facturation</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date de début *</label>
            <input
              type="date"
              value={periode.debut}
              onChange={(e) => setPeriode({...periode, debut: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date de fin *</label>
            <input
              type="date"
              value={periode.fin}
              onChange={(e) => setPeriode({...periode, fin: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Relevés */}
      <div className="space-y-4">
        {/* Principal */}
        {principal && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-400 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">{principal.numero_compteur}</h3>
                <span className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-full">PRINCIPAL</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Index début (m³) *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={releves[principal.id]?.index_debut || ''}
                  onChange={(e) => handleReleveChange(principal.id, 'index_debut', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Index fin (m³) *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={releves[principal.id]?.index_fin || ''}
                  onChange={(e) => handleReleveChange(principal.id, 'index_fin', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Consommation</label>
                <div className="px-3 py-2 bg-white border rounded-lg font-bold text-indigo-900">
                  {releves[principal.id]?.consommation.toFixed(4) || '0.0000'} m³
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divisionnaires */}
        {divisionnaires.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg">Compteurs Divisionnaires</h3>
            
            {divisionnaires.map(c => (
              <div key={c.id} className="bg-white border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Droplets className="h-5 w-5 text-cyan-600" />
                  <div>
                    <h4 className="font-medium">{c.numero_compteur}</h4>
                    {c.emplacement && (
                      <p className="text-xs text-gray-500">📍 {c.emplacement}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Index début *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={releves[c.id]?.index_debut || ''}
                      onChange={(e) => handleReleveChange(c.id, 'index_debut', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                      placeholder="0.0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Index fin *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={releves[c.id]?.index_fin || ''}
                      onChange={(e) => handleReleveChange(c.id, 'index_fin', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                      placeholder="0.0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Consommation</label>
                    <div className="px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg font-medium text-cyan-900">
                      {releves[c.id]?.consommation.toFixed(4) || '0.0000'} m³
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation pertes */}
      {validation && (
        <div className={`mt-6 rounded-xl border-2 p-6 ${
          !validation.valid 
            ? 'bg-red-50 border-red-400' 
            : validation.warning 
            ? 'bg-yellow-50 border-yellow-400' 
            : 'bg-green-50 border-green-400'
        }`}>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            {!validation.valid ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
             validation.warning ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> :
             <CheckCircle className="h-5 w-5 text-green-600" />}
            Validation des pertes
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Compteur principal :</span>
              <span className="font-bold">{releves[principal?.id]?.consommation.toFixed(4)} m³</span>
            </div>
            <div className="flex justify-between">
              <span>Somme divisionnaires :</span>
              <span className="font-bold">
                {divisionnaires.reduce((sum, c) => sum + (releves[c.id]?.consommation || 0), 0).toFixed(4)} m³
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-bold">Pertes :</span>
              <span className={`font-bold ${validation.pertes < 0 ? 'text-red-600' : ''}`}>
                {validation.pertes.toFixed(4)} m³ ({validation.pourcentage.toFixed(2)}%)
              </span>
            </div>
          </div>

          {!validation.valid && (
            <p className="mt-3 text-sm text-red-700 font-medium">
              ❌ Erreur : La somme des divisionnaires ne peut pas dépasser le principal
            </p>
          )}
          {validation.valid && validation.warning && (
            <p className="mt-3 text-sm text-yellow-700 font-medium">
              ⚠️ Attention : Les pertes dépassent 10%. Vérifiez les relevés.
            </p>
          )}
          {validation.valid && !validation.warning && (
            <p className="mt-3 text-sm text-green-700 font-medium">
              ✅ Validation OK • Pertes normales
            </p>
          )}
        </div>
      )}

      {/* Bouton sauvegarder */}
      <button
        onClick={handleSave}
        disabled={saving || (validation && !validation.valid) || !periode.debut || !periode.fin}
        className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
      >
        <Save className="h-5 w-5" />
        {saving ? 'Enregistrement...' : 'Enregistrer et Calculer les Décomptes'}
      </button>
    </div>
  );
}
