import { useState, useEffect } from 'react';

export default function InfosTab({ decompte, onUpdate, disabled }) {
  const [formData, setFormData] = useState({
    region: '',
    fournisseurEau: '',
    systemeRepartition: '',
    periodeDebut: '',
    periodeFin: ''
  });

  useEffect(() => {
    if (decompte) {
      setFormData({
        region: decompte.region || 'brussels',
        fournisseurEau: decompte.fournisseur_eau || '',
        systemeRepartition: decompte.systeme_repartition || 'milliemes',
        periodeDebut: decompte.periode_debut || '',
        periodeFin: decompte.periode_fin || ''
      });
    }
  }, [decompte]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    onUpdate({
      ...decompte,
      [name]: value
    });
  };

  // Fournisseurs par région
  const fournisseursParRegion = {
    'wallonia': [
      { value: 'SWDE', label: 'SWDE' },
      { value: 'CILE', label: 'CILE' },
      { value: 'INASEP', label: 'INASEP' }
    ],
    'brussels': [
      { value: 'VIVAQUA', label: 'VIVAQUA' }
    ],
    'flanders': [
      { value: 'De Watergroep', label: 'De Watergroep' },
      { value: 'Farys', label: 'Farys' },
      { value: 'PIDPA', label: 'PIDPA' },
      { value: 'Water-link', label: 'Water-link' }
    ]
  };

  const fournisseursDisponibles = fournisseursParRegion[formData.region] || [];

  return (
    <div className="space-y-6">
      {/* Période */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Période du décompte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              name="periodeDebut"
              value={formData.periodeDebut}
              onChange={handleChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              name="periodeFin"
              value={formData.periodeFin}
              onChange={handleChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Configuration Eau */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration de l'eau</h3>
        
        <div className="space-y-4">
          {/* Région */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Région *
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="wallonia">🇧🇪 Wallonie</option>
              <option value="brussels">🇧🇪 Bruxelles</option>
              <option value="flanders">🇧🇪 Flandre</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Détermine les règles de tarification applicables
            </p>
          </div>

          {/* Fournisseur - FILTRÉ PAR RÉGION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur d'eau *
            </label>
            <select
              name="fournisseurEau"
              value={formData.fournisseurEau}
              onChange={handleChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">-- Sélectionner --</option>
              {fournisseursDisponibles.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Système de répartition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Système de répartition
            </label>
            <select
              name="systemeRepartition"
              value={formData.systemeRepartition}
              onChange={handleChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="milliemes">Millièmes</option>
              <option value="tantiemes">Tantièmes</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Pour les charges communes (entretien compteur principal, pertes, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Configuration par exercice :</strong> Ces paramètres sont spécifiques à cet exercice {decompte?.annee || 'annuel'}. 
          Vous pouvez les modifier d'une année à l'autre si votre fournisseur change.
        </p>
      </div>

      {/* Navigation hint */}
      {!disabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            ⏭️ <strong>Étape suivante :</strong> Passez à l'onglet <strong>"Compteurs"</strong> pour configurer 
            le mode de comptage et gérer vos compteurs.
          </p>
        </div>
      )}
    </div>
  );
}
