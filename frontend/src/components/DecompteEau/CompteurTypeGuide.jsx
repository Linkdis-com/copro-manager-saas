import { Info } from 'lucide-react';

export default function CompteurTypeGuide({ selectedType, onTypeChange }) {
  const types = [
    {
      value: 'divisionnaire',
      label: 'Système Divisionnaire',
      color: 'blue',
      description: 'Le plus courant en copropriété',
      situation: '1 compteur principal (pied d\'immeuble) + 1 compteur par appartement',
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Compteur principal */}
          <rect x="20" y="80" width="60" height="40" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" rx="4" />
          <text x="50" y="105" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Principal</text>
          
          {/* Tuyau vertical */}
          <line x1="80" y1="100" x2="120" y2="100" stroke="#FCD34D" strokeWidth="6" />
          <line x1="120" y1="100" x2="120" y2="170" stroke="#FCD34D" strokeWidth="6" />
          
          {/* Tuyaux horizontaux vers appartements */}
          <line x1="120" y1="50" x2="150" y2="50" stroke="#FCD34D" strokeWidth="4" />
          <line x1="120" y1="100" x2="150" y2="100" stroke="#FCD34D" strokeWidth="4" />
          <line x1="120" y1="150" x2="150" y2="150" stroke="#FCD34D" strokeWidth="4" />
          <line x1="120" y1="20" x2="120" y2="170" stroke="#FCD34D" strokeWidth="6" />
          
          {/* Compteurs divisionnaires */}
          <circle cx="165" cy="50" r="8" fill="#06B6D4" stroke="#0891B2" strokeWidth="2" />
          <rect x="180" y="40" width="100" height="20" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" rx="2" />
          <text x="230" y="53" textAnchor="middle" fontSize="9">Appt 1</text>
          
          <circle cx="165" cy="100" r="8" fill="#06B6D4" stroke="#0891B2" strokeWidth="2" />
          <rect x="180" y="90" width="100" height="20" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" rx="2" />
          <text x="230" y="103" textAnchor="middle" fontSize="9">Appt 2</text>
          
          <circle cx="165" cy="150" r="8" fill="#06B6D4" stroke="#0891B2" strokeWidth="2" />
          <rect x="180" y="140" width="100" height="20" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" rx="2" />
          <text x="230" y="153" textAnchor="middle" fontSize="9">Appt 3</text>
          
          {/* Légende */}
          <text x="150" y="185" textAnchor="middle" fontSize="10" fill="#6B7280">Compteur de contrôle</text>
        </svg>
      ),
      avantages: ['Décompte précis par logement', 'Détection des fuites', 'Équitable selon consommation réelle'],
      suited: 'Immeubles de 3+ appartements'
    },
    {
      value: 'principal',
      label: 'Compteur Principal uniquement',
      color: 'indigo',
      description: 'Compteur général au pied de l\'immeuble',
      situation: '1 seul compteur pour tout l\'immeuble (avant division)',
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Compteur principal seul */}
          <rect x="100" y="70" width="100" height="60" fill="#6366F1" stroke="#4338CA" strokeWidth="3" rx="6" />
          <text x="150" y="95" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">PRINCIPAL</text>
          <text x="150" y="110" textAnchor="middle" fill="white" fontSize="9">Compteur général</text>
          
          {/* Tuyau d'arrivée */}
          <line x1="20" y1="100" x2="100" y2="100" stroke="#FCD34D" strokeWidth="8" />
          <polygon points="20,100 35,95 35,105" fill="#FCD34D" />
          
          {/* Tuyau de sortie vers immeuble */}
          <line x1="200" y1="100" x2="280" y2="100" stroke="#FCD34D" strokeWidth="8" />
          <rect x="260" y="60" width="40" height="80" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
          <text x="280" y="105" textAnchor="middle" fontSize="10">🏢</text>
          
          {/* Légende */}
          <text x="150" y="160" textAnchor="middle" fontSize="10" fill="#6B7280">Arrivée d'eau → Compteur → Immeuble</text>
        </svg>
      ),
      avantages: ['Simple à gérer', 'Pas de sous-compteurs'],
      suited: 'À créer en premier dans un système divisionnaire'
    },
    {
      value: 'collectif',
      label: 'Compteur Collectif',
      color: 'amber',
      description: 'Partagé entre plusieurs logements',
      situation: '1 compteur pour 2-3 appartements spécifiques',
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Compteur collectif */}
          <rect x="100" y="80" width="80" height="50" fill="#F59E0B" stroke="#D97706" strokeWidth="2" rx="4" />
          <text x="140" y="100" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Collectif</text>
          <text x="140" y="115" textAnchor="middle" fill="white" fontSize="8">Appt 1 + 2</text>
          
          {/* Tuyau d'arrivée */}
          <line x1="20" y1="105" x2="100" y2="105" stroke="#FCD34D" strokeWidth="6" />
          
          {/* Distribution vers 2 appartements */}
          <line x1="180" y1="105" x2="220" y2="105" stroke="#FCD34D" strokeWidth="6" />
          <line x1="220" y1="105" x2="220" y2="140" stroke="#FCD34D" strokeWidth="6" />
          <line x1="220" y1="80" x2="220" y2="140" stroke="#FCD34D" strokeWidth="6" />
          
          {/* Appart 1 */}
          <line x1="220" y1="80" x2="250" y2="80" stroke="#FCD34D" strokeWidth="4" />
          <rect x="250" y="65" width="40" height="30" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
          <text x="270" y="83" textAnchor="middle" fontSize="9">Appt 1</text>
          
          {/* Appart 2 */}
          <line x1="220" y1="130" x2="250" y2="130" stroke="#FCD34D" strokeWidth="4" />
          <rect x="250" y="115" width="40" height="30" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
          <text x="270" y="133" textAnchor="middle" fontSize="9">Appt 2</text>
          
          {/* Légende */}
          <text x="150" y="175" textAnchor="middle" fontSize="10" fill="#6B7280">Répartition au prorata (millièmes)</text>
        </svg>
      ),
      avantages: ['Entre collectif et individuel', 'Répartition selon millièmes'],
      suited: 'Configuration rare, cas particuliers'
    },
    {
      value: 'individuel',
      label: 'Compteur Individuel',
      color: 'green',
      description: 'Facturation directe au fournisseur',
      situation: 'Chaque logement paie sa facture directement (hors copropriété)',
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* 3 compteurs individuels séparés */}
          <g>
            {/* Compteur 1 */}
            <rect x="20" y="20" width="70" height="40" fill="#10B981" stroke="#059669" strokeWidth="2" rx="4" />
            <text x="55" y="38" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Individuel</text>
            <text x="55" y="50" textAnchor="middle" fill="white" fontSize="7">Appt 1</text>
            <line x1="90" y1="40" x2="120" y2="40" stroke="#FCD34D" strokeWidth="4" />
            <rect x="120" y="25" width="40" height="30" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
            <text x="140" y="43" textAnchor="middle" fontSize="8">🏠</text>
            <text x="180" y="43" textAnchor="middle" fontSize="8" fill="#059669">→ Facture directe</text>
            
            {/* Compteur 2 */}
            <rect x="20" y="80" width="70" height="40" fill="#10B981" stroke="#059669" strokeWidth="2" rx="4" />
            <text x="55" y="98" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Individuel</text>
            <text x="55" y="110" textAnchor="middle" fill="white" fontSize="7">Appt 2</text>
            <line x1="90" y1="100" x2="120" y2="100" stroke="#FCD34D" strokeWidth="4" />
            <rect x="120" y="85" width="40" height="30" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
            <text x="140" y="103" textAnchor="middle" fontSize="8">🏠</text>
            <text x="180" y="103" textAnchor="middle" fontSize="8" fill="#059669">→ Facture directe</text>
            
            {/* Compteur 3 */}
            <rect x="20" y="140" width="70" height="40" fill="#10B981" stroke="#059669" strokeWidth="2" rx="4" />
            <text x="55" y="158" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Individuel</text>
            <text x="55" y="170" textAnchor="middle" fill="white" fontSize="7">Appt 3</text>
            <line x1="90" y1="160" x2="120" y2="160" stroke="#FCD34D" strokeWidth="4" />
            <rect x="120" y="145" width="40" height="30" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
            <text x="140" y="163" textAnchor="middle" fontSize="8">🏠</text>
            <text x="180" y="163" textAnchor="middle" fontSize="8" fill="#059669">→ Facture directe</text>
          </g>
        </svg>
      ),
      avantages: ['Aucune gestion par la copro', 'Chacun paie sa facture'],
      suited: 'Immeubles sans gestion commune de l\'eau'
    }
  ];

  const selectedTypeInfo = types.find(t => t.value === selectedType);

  return (
    <div className="space-y-4">
      {/* Sélecteur de type avec visuels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {types.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onTypeChange(type.value)}
            className={`
              relative p-4 rounded-lg border-2 transition-all text-left
              ${selectedType === type.value 
                ? `border-${type.color}-500 bg-${type.color}-50` 
                : 'border-gray-200 bg-white hover:border-gray-300'}
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-3 h-3 rounded-full mt-1 flex-shrink-0
                ${selectedType === type.value ? `bg-${type.color}-500` : 'bg-gray-300'}
              `} />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{type.label}</h4>
                <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                <p className="text-xs text-gray-500 italic">{type.situation}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Schéma détaillé du type sélectionné */}
      {selectedTypeInfo && (
        <div className={`bg-${selectedTypeInfo.color}-50 border border-${selectedTypeInfo.color}-200 rounded-lg p-6`}>
          <div className="flex items-start gap-3 mb-4">
            <Info className={`h-5 w-5 text-${selectedTypeInfo.color}-600 flex-shrink-0 mt-0.5`} />
            <div>
              <h4 className={`font-medium text-${selectedTypeInfo.color}-900 mb-1`}>
                {selectedTypeInfo.label}
              </h4>
              <p className={`text-sm text-${selectedTypeInfo.color}-800`}>
                {selectedTypeInfo.situation}
              </p>
            </div>
          </div>

          {/* Schéma SVG */}
          <div className="bg-white rounded-lg p-4 mb-4">
            {selectedTypeInfo.svg}
          </div>

          {/* Avantages */}
          <div className="space-y-2">
            <p className={`text-sm font-medium text-${selectedTypeInfo.color}-900`}>
              ✓ Avantages :
            </p>
            <ul className="space-y-1">
              {selectedTypeInfo.avantages.map((avantage, index) => (
                <li key={index} className={`text-sm text-${selectedTypeInfo.color}-800 flex items-start`}>
                  <span className="mr-2">•</span>
                  <span>{avantage}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pour qui */}
          <div className={`mt-4 pt-4 border-t border-${selectedTypeInfo.color}-200`}>
            <p className={`text-xs text-${selectedTypeInfo.color}-700`}>
              <strong>Adapté pour :</strong> {selectedTypeInfo.suited}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
