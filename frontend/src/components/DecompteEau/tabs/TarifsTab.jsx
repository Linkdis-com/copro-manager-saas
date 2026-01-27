import { useState, useEffect } from 'react';
import { Euro } from 'lucide-react';

export default function TarifsTab({ decompte, onUpdate, disabled }) {
  const [formData, setFormData] = useState({
    // Wallonie (progressive)
    tarifDistribution: '',
    tarifAssainissement: '',
    fondsSocial: '',
    seuilTranche1: 30,
    coeffTranche1: 0.5,
    coeffTranche2: 1.0,
    
    // Bruxelles (linéaire)
    tarifUnique: '',
    
    // Flandre (base + confort)
    tarifBase: '',
    tarifConfort: '',
    m3BaseFix: 40,
    
    // Commun
    m3GratuitsParHabitant: 15,
    maxHabitantsGratuits: 5,
    redevanceFixeAnnuelle: 0,
    redevanceParLogement: true,
    tvaPourcent: 6.0
  });

  useEffect(() => {
    if (decompte) {
      setFormData({
        tarifDistribution: decompte.tarif_distribution || '',
        tarifAssainissement: decompte.tarif_assainissement || '',
        fondsSocial: decompte.fonds_social || '',
        seuilTranche1: decompte.seuil_tranche1 || 30,
        coeffTranche1: decompte.coeff_tranche1 || 0.5,
        coeffTranche2: decompte.coeff_tranche2 || 1.0,
        tarifUnique: decompte.tarif_unique || '',
        tarifBase: decompte.tarif_base || '',
        tarifConfort: decompte.tarif_confort || '',
        m3BaseFix: decompte.m3_base_fix || 40,
        m3GratuitsParHabitant: decompte.m3_gratuits_par_habitant || 15,
        maxHabitantsGratuits: decompte.max_habitants_gratuits || 5,
        redevanceFixeAnnuelle: decompte.redevance_fixe_annuelle || 0,
        redevanceParLogement: decompte.redevance_par_logement !== false,
        tvaPourcent: decompte.tva_pourcent || 6.0
      });
    }
  }, [decompte]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    onUpdate({
      ...decompte,
      [name]: newValue
    });
  };

  const region = decompte?.region || 'brussels';
  const fournisseur = decompte?.fournisseur_eau || '';

  return (
    <div className="space-y-6">
      {/* Info Région/Fournisseur */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Euro className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Configuration {region === 'wallonia' ? 'Wallonie' : region === 'flanders' ? 'Flandre' : 'Bruxelles'}
              {fournisseur && ` - ${fournisseur}`}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {region === 'wallonia' && 'Tarification progressive (CVD + CVA) avec m³ gratuits'}
              {region === 'brussels' && 'Tarification linéaire VIVAQUA'}
              {region === 'flanders' && 'Tarification base + confort'}
            </p>
          </div>
        </div>
      </div>

      {/* WALLONIE */}
      {region === 'wallonia' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tarifs Wallonie (SWDE, CILE, INASEP...)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVD - Distribution (€/m³) *
                </label>
                <input
                  type="number"
                  name="tarifDistribution"
                  value={formData.tarifDistribution}
                  onChange={handleChange}
                  disabled={disabled}
                  step="0.0001"
                  placeholder="Ex: 2.60"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVA - Assainissement (€/m³) *
                </label>
                <input
                  type="number"
                  name="tarifAssainissement"
                  value={formData.tarifAssainissement}
                  onChange={handleChange}
                  disabled={disabled}
                  step="0.0001"
                  placeholder="Ex: 2.615"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonds social (€/m³)
                </label>
                <input
                  type="number"
                  name="fondsSocial"
                  value={formData.fondsSocial}
                  onChange={handleChange}
                  disabled={disabled}
                  step="0.0001"
                  placeholder="Ex: 0.0332"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Tarification progressive */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Tarification progressive
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil tranche 1 (m³)
                  </label>
                  <input
                    type="number"
                    name="seuilTranche1"
                    value={formData.seuilTranche1}
                    onChange={handleChange}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coeff. tranche 1
                  </label>
                  <input
                    type="number"
                    name="coeffTranche1"
                    value={formData.coeffTranche1}
                    onChange={handleChange}
                    disabled={disabled}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">CVD × 0.5</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coeff. tranche 2+
                  </label>
                  <input
                    type="number"
                    name="coeffTranche2"
                    value={formData.coeffTranche2}
                    onChange={handleChange}
                    disabled={disabled}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">CVD × 1.0</p>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-white rounded p-3">
                <p className="font-medium mb-1">Calcul exemple (avec CVD={formData.tarifDistribution || '?'}, CVA={formData.tarifAssainissement || '?'}) :</p>
                <p>• 0-{formData.seuilTranche1} m³ : (CVD × {formData.coeffTranche1}) + CVA = {formData.tarifDistribution && formData.tarifAssainissement ? ((parseFloat(formData.tarifDistribution) * parseFloat(formData.coeffTranche1)) + parseFloat(formData.tarifAssainissement)).toFixed(2) : '?'} €/m³</p>
                <p>• {formData.seuilTranche1}+ m³ : (CVD × {formData.coeffTranche2}) + CVA = {formData.tarifDistribution && formData.tarifAssainissement ? ((parseFloat(formData.tarifDistribution) * parseFloat(formData.coeffTranche2)) + parseFloat(formData.tarifAssainissement)).toFixed(2) : '?'} €/m³</p>
              </div>
            </div>
          </div>

          {/* m³ gratuits */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              m³ gratuits (Wallonie)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  m³ gratuits par habitant
                </label>
                <input
                  type="number"
                  name="m3GratuitsParHabitant"
                  value={formData.m3GratuitsParHabitant}
                  onChange={handleChange}
                  disabled={disabled}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 15 m³/habitant</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum habitants pris en compte
                </label>
                <input
                  type="number"
                  name="maxHabitantsGratuits"
                  value={formData.maxHabitantsGratuits}
                  onChange={handleChange}
                  disabled={disabled}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Plafonné à 5 habitants</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BRUXELLES */}
      {region === 'brussels' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tarifs Bruxelles (VIVAQUA)
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarif unique (€/m³) *
              </label>
              <input
                type="number"
                name="tarifUnique"
                value={formData.tarifUnique}
                onChange={handleChange}
                disabled={disabled}
                step="0.01"
                placeholder="Ex: 4.49"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <p className="text-sm text-gray-500 mt-1">
                Tarif linéaire VIVAQUA (distribution + assainissement)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FLANDRE */}
      {region === 'flanders' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tarifs Flandre (De Watergroep, Farys...)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarif de base (€/m³) *
                </label>
                <input
                  type="number"
                  name="tarifBase"
                  value={formData.tarifBase}
                  onChange={handleChange}
                  disabled={disabled}
                  step="0.01"
                  placeholder="Ex: 6.98"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarif confort (€/m³) *
                </label>
                <input
                  type="number"
                  name="tarifConfort"
                  value={formData.tarifConfort}
                  onChange={handleChange}
                  disabled={disabled}
                  step="0.01"
                  placeholder="Ex: 13.95"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume de base fixe (m³)
                </label>
                <input
                  type="number"
                  name="m3BaseFix"
                  value={formData.m3BaseFix}
                  onChange={handleChange}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 40 m³</p>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-gray-50 rounded p-3 mt-4">
              <p className="font-medium mb-1">Calcul :</p>
              <p>• 0-{formData.m3BaseFix} m³ : {formData.tarifBase} €/m³ (tarif de base)</p>
              <p>• {formData.m3BaseFix}+ m³ : {formData.tarifConfort} €/m³ (tarif confort)</p>
            </div>
          </div>
        </div>
      )}

      {/* Frais communs */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Frais communs
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Redevance fixe annuelle (€)
              </label>
              <input
                type="number"
                name="redevanceFixeAnnuelle"
                value={formData.redevanceFixeAnnuelle}
                onChange={handleChange}
                disabled={disabled}
                step="0.01"
                placeholder="Ex: 50.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TVA (%)
              </label>
              <input
                type="number"
                name="tvaPourcent"
                value={formData.tvaPourcent}
                onChange={handleChange}
                disabled={disabled}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="redevanceParLogement"
              checked={formData.redevanceParLogement}
              onChange={handleChange}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Redevance fixe par logement (sinon : par immeuble)
            </label>
          </div>
        </div>
      </div>

      {/* Navigation hint */}
      {!disabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            ⏭️ <strong>Étape suivante :</strong> Passez à l'onglet <strong>"Calcul"</strong> pour voir 
            les répartitions et valider le décompte.
          </p>
        </div>
      )}
    </div>
  );
}
