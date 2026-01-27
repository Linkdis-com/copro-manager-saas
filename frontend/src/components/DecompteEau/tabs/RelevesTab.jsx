import { useState, useEffect } from 'react';
import { compteursEauService, relevesService } from '../../../services/api';
import { Activity, Calendar, Save, AlertCircle, Euro } from 'lucide-react';

export default function RelevesTab({ decompte, onUpdate, disabled }) {
  console.log('🟢 RelevesTab mounted, props:', { decompte: !!decompte, disabled });
  
  const [compteurs, setCompteurs] = useState([]);
  const [releves, setReleves] = useState({});
  const [dateReleve, setDateReleve] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tarifs, setTarifs] = useState({ 
    tarif_distribution: '', 
    tarif_assainissement: '', 
    redevance_fixe_annuelle: '', 
    tva_pourcent: '6.0' 
  });

  useEffect(() => {
    console.log('🟢 RelevesTab useEffect triggered');
    console.log('🟢 decompte:', decompte);
    console.log('🟢 decompte.immeuble_id:', decompte?.immeuble_id);
    
    if (decompte?.immeuble_id) {
      console.log('🟢 Loading compteurs...');
      loadCompteurs();
      setDateReleve(new Date().toISOString().split('T')[0]);
      
      if (decompte) {
        const newTarifs = { 
          tarif_distribution: decompte.tarif_distribution || '', 
          tarif_assainissement: decompte.tarif_assainissement || '', 
          redevance_fixe_annuelle: decompte.redevance_fixe_annuelle || '', 
          tva_pourcent: decompte.tva_pourcent || '6.0' 
        };
        console.log('🟢 Setting tarifs:', newTarifs);
        setTarifs(newTarifs);
      }
    } else {
      console.warn('⚠️ No immeuble_id in decompte');
      setLoading(false);
    }
  }, [decompte?.immeuble_id]);

  const loadCompteurs = async () => {
    try {
      console.log('🟢 loadCompteurs called for immeuble:', decompte.immeuble_id);
      setLoading(true);
      setError(null);
      
      const data = await compteursEauService.getAll(decompte.immeuble_id);
      console.log('✅ Compteurs API response:', data);
      
      const compteursData = data.compteurs || [];
      console.log('✅ Compteurs data:', compteursData);
      
      const compteursDivisionnaires = compteursData.filter(c => c.type_compteur === 'divisionnaire');
      console.log('✅ Compteurs divisionnaires:', compteursDivisionnaires);
      
      setCompteurs(compteursDivisionnaires);
      
      const initialReleves = {};
      compteursDivisionnaires.forEach(c => { 
        initialReleves[c.id] = { 
          digits: ['0','0','0','0','0','0','0','0','0','0'], 
          index_precedent: c.index_precedent || 0 
        }; 
      });
      console.log('✅ Initial releves:', initialReleves);
      setReleves(initialReleves);
      
    } catch (error) {
      console.error('❌ Error loading compteurs:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      setError(error.response?.data?.message || error.message || 'Erreur lors du chargement des compteurs');
    } finally {
      setLoading(false);
      console.log('🟢 loadCompteurs finished');
    }
  };

  const handleDigitChange = (compteurId, digitIndex, value) => {
    if (!/^\d*$/.test(value)) return;
    
    console.log('🟢 Digit change:', { compteurId, digitIndex, value });
    
    setReleves(prev => ({ 
      ...prev, 
      [compteurId]: { 
        ...prev[compteurId], 
        digits: prev[compteurId].digits.map((d, i) => i === digitIndex ? value.slice(-1) : d) 
      } 
    }));
  };

  const calculateIndex = (digits) => {
    const integerPart = digits.slice(0, 6).join('');
    const decimalPart = digits.slice(6, 10).join('');
    return parseFloat(`${integerPart}.${decimalPart}`);
  };

  const handleTarifsChange = (field, value) => {
    console.log('🟢 Tarifs change:', { field, value });
    const newTarifs = { ...tarifs, [field]: value };
    setTarifs(newTarifs);
    onUpdate({ ...decompte, ...newTarifs });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('🟢 Saving releves for decompte:', decompte.id);
      
      const relevesData = Object.keys(releves).map(compteurId => ({ 
        compteur_id: parseInt(compteurId), 
        date_releve: dateReleve, 
        index: calculateIndex(releves[compteurId].digits) 
      }));
      
      console.log('🟢 Releves data to save:', relevesData);
      
      await relevesService.bulkImport(decompte.id, relevesData);
      console.log('✅ Releves saved');
      alert('Relevés sauvegardés avec succès');
      
    } catch (error) {
      console.error('❌ Error saving releves:', error);
      console.error('❌ Error response:', error.response);
      alert('Erreur lors de la sauvegarde: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  console.log('🟢 RelevesTab render state:', { loading, error, compteursCount: compteurs.length });

  if (loading) {
    console.log('🟢 Rendering loading state');
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mb-3"></div>
        <p className="text-gray-600 text-sm">Chargement des compteurs...</p>
      </div>
    );
  }

  if (error) {
    console.log('🟢 Rendering error state:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900 mb-1">Erreur de chargement</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={loadCompteurs}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!decompte?.immeuble_id) {
    console.log('🟢 Rendering no immeuble state');
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <Activity className="h-12 w-12 text-blue-400 mx-auto mb-3" />
        <p className="font-medium text-blue-900 mb-2">Aucun immeuble sélectionné</p>
        <p className="text-sm text-blue-700">
          Créez d'abord les compteurs pour cet immeuble.
        </p>
      </div>
    );
  }
  
  if (compteurs.length === 0) {
    console.log('🟢 Rendering no compteurs state');
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
        <p className="font-medium text-amber-900 mb-2">Aucun compteur divisionnaire</p>
        <p className="text-sm text-amber-700 mb-4">
          Créez d'abord des compteurs divisionnaires dans la configuration des compteurs.
        </p>
        <button
          onClick={() => window.location.href = `/immeubles/${decompte.immeuble_id}/compteurs`}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
        >
          Aller à la configuration des compteurs
        </button>
      </div>
    );
  }

  console.log('🟢 Rendering main view with', compteurs.length, 'compteurs');

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Relevé d'index en date du :
          </label>
          <input 
            type="date" 
            value={dateReleve} 
            onChange={(e) => setDateReleve(e.target.value)} 
            disabled={disabled} 
            className="px-4 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-lg" 
          />
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Euro className="h-5 w-5 text-green-600" />
            Tarifs de facturation
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVD - Tarif distribution (€/m³)
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={tarifs.tarif_distribution} 
                onChange={(e) => handleTarifsChange('tarif_distribution', e.target.value)} 
                disabled={disabled} 
                placeholder="Ex: 2.60" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVA - Tarif assainissement (€/m³)
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={tarifs.tarif_assainissement} 
                onChange={(e) => handleTarifsChange('tarif_assainissement', e.target.value)} 
                disabled={disabled} 
                placeholder="Ex: 2.615" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redevance fixe annuelle (€)
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={tarifs.redevance_fixe_annuelle} 
                onChange={(e) => handleTarifsChange('redevance_fixe_annuelle', e.target.value)} 
                disabled={disabled} 
                placeholder="Ex: 30.00" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TVA (%)
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={tarifs.tva_pourcent} 
                onChange={(e) => handleTarifsChange('tva_pourcent', e.target.value)} 
                disabled={disabled} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {compteurs.map((compteur, index) => {
          console.log(`🟢 Rendering compteur ${index + 1}/${compteurs.length}:`, compteur.id);
          
          const nomPersonne = compteur.locataire_nom 
            ? `${compteur.locataire_prenom || ''} ${compteur.locataire_nom}`.trim() 
            : compteur.proprietaire_nom 
            ? `${compteur.proprietaire_prenom || ''} ${compteur.proprietaire_nom}`.trim() 
            : 'N/A';
          
          const indexPrecedent = releves[compteur.id]?.index_precedent || 0;
          const indexActuel = calculateIndex(releves[compteur.id]?.digits || []);
          const consommation = Math.max(0, indexActuel - indexPrecedent);

          return (
            <div key={compteur.id} className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium min-w-[120px] text-center shadow">
                    Compteur :
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-xl">{nomPersonne}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-600">
                        <span className="font-medium text-blue-600">N° {compteur.numero_compteur}</span>
                      </span>
                      {compteur.emplacement && (
                        <span className="text-xs text-gray-500">📍 {compteur.emplacement}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    Index année précédente : <span className="font-semibold text-gray-900">{indexPrecedent.toFixed(4)} m³</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center py-4 bg-gray-50 rounded-lg">
                {releves[compteur.id]?.digits.slice(0, 6).map((digit, digitIdx) => (
                  <input 
                    key={`int-${digitIdx}`} 
                    type="text" 
                    inputMode="numeric" 
                    maxLength={1} 
                    value={digit} 
                    onChange={(e) => handleDigitChange(compteur.id, digitIdx, e.target.value)} 
                    disabled={disabled} 
                    className="w-12 h-14 text-center text-2xl font-mono border-2 border-blue-400 bg-blue-50 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 transition-all" 
                  />
                ))}
                
                <span className="text-4xl font-bold text-gray-500 mx-1">,</span>
                
                {releves[compteur.id]?.digits.slice(6, 10).map((digit, digitIdx) => (
                  <input 
                    key={`dec-${digitIdx}`} 
                    type="text" 
                    inputMode="numeric" 
                    maxLength={1} 
                    value={digit} 
                    onChange={(e) => handleDigitChange(compteur.id, 6 + digitIdx, e.target.value)} 
                    disabled={disabled} 
                    className="w-12 h-14 text-center text-2xl font-mono border-2 border-green-400 bg-green-50 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:bg-gray-100 transition-all" 
                  />
                ))}
                
                <span className="ml-3 text-xl text-gray-700 font-medium">m³</span>
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Index actuel</p>
                    <p className="font-bold text-blue-900 text-lg">{indexActuel.toFixed(4)} m³</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Index précédent</p>
                    <p className="font-bold text-gray-900 text-lg">{indexPrecedent.toFixed(4)} m³</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Consommation</p>
                    <p className="font-bold text-green-700 text-lg">{consommation.toFixed(4)} m³</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!disabled && (
        <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
          <button 
            onClick={handleSave} 
            disabled={saving || !dateReleve} 
            className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Sauvegarde en cours...' : 'Enregistrer les relevés'}
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Conseil :</strong> Les cases bleues représentent les m³ entiers, les cases vertes les décimales. 
          Saisissez les valeurs exactement comme sur votre compteur.
        </p>
      </div>
    </div>
  );
}
