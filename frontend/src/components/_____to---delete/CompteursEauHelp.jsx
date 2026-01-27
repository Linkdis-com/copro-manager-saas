import { Info } from 'lucide-react';

export default function CompteursEauHelp({ selectedType, onTypeSelect }) {
  const schemas = {
    divisionnaire: {
      title: "Système Divisionnaire",
      description: "1 compteur principal + des sous-compteurs par appartement",
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Compteur principal */}
          <rect x="20" y="80" width="40" height="40" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" rx="4" />
          <text x="40" y="105" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">CP</text>
          
          {/* Tuyau principal */}
          <line x1="60" y1="100" x2="120" y2="100" stroke="#fbbf24" strokeWidth="6" />
          
          {/* Division */}
          <line x1="120" y1="100" x2="120" y2="40" stroke="#fbbf24" strokeWidth="4" />
          <line x1="120" y1="100" x2="120" y2="100" stroke="#fbbf24" strokeWidth="4" />
          <line x1="120" y1="100" x2="120" y2="160" stroke="#fbbf24" strokeWidth="4" />
          
          {/* Compteurs divisionnaires */}
          <line x1="120" y1="40" x2="180" y2="40" stroke="#fbbf24" strokeWidth="3" />
          <rect x="180" y="20" width="30" height="30" fill="#0ea5e9" stroke="#0284c7" strokeWidth="2" rx="3" />
          <rect x="215" y="20" width="60" height="30" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1" rx="3" />
          <text x="245" y="40" textAnchor="middle" fontSize="10">Appt 1</text>
          
          <line x1="120" y1="100" x2="180" y2="100" stroke="#fbbf24" strokeWidth="3" />
          <rect x="180" y="85" width="30" height="30" fill="#0ea5e9" stroke="#0284c7" strokeWidth="2" rx="3" />
          <rect x="215" y="85" width="60" height="30" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1" rx="3" />
          <text x="245" y="105" textAnchor="middle" fontSize="10">Appt 2</text>
          
          <line x1="120" y1="160" x2="180" y2="160" stroke="#fbbf24" strokeWidth="3" />
          <rect x="180" y="145" width="30" height="30" fill="#0ea5e9" stroke="#0284c7" strokeWidth="2" rx="3" />
          <rect x="215" y="145" width="60" height="30" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1" rx="3" />
          <text x="245" y="165" textAnchor="middle" fontSize="10">Appt 3</text>
          
          {/* Légende */}
          <text x="40" y="135" textAnchor="middle" fontSize="9" fill="#0891b2" fontWeight="bold">Principal</text>
          <text x="195" y="10" fontSize="9" fill="#0284c7" fontWeight="bold">Divisionnaires</text>
        </svg>
      ),
      useCases: [
        "✅ Vous avez UN compteur général au pied de l'immeuble",
        "✅ Chaque appartement a son propre sous-compteur",
        "✅ Vous voulez facturer la consommation réelle de chaque logement"
      ]
    },
    
    collectif: {
      title: "Compteur Collectif",
      description: "1 compteur pour TOUT l'immeuble, répartition au prorata",
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Compteur collectif */}
          <rect x="30" y="80" width="50" height="50" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="2" rx="4" />
          <text x="55" y="110" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">COLLECTIF</text>
          
          {/* Tuyau */}
          <line x1="80" y1="105" x2="140" y2="105" stroke="#fbbf24" strokeWidth="6" />
          
          {/* Distribution */}
          <line x1="140" y1="105" x2="140" y2="40" stroke="#fbbf24" strokeWidth="4" />
          <line x1="140" y1="105" x2="140" y2="105" stroke="#fbbf24" strokeWidth="4" />
          <line x1="140" y1="105" x2="140" y2="170" stroke="#fbbf24" strokeWidth="4" />
          
          {/* Appartements sans compteur */}
          <line x1="140" y1="40" x2="180" y2="40" stroke="#fbbf24" strokeWidth="3" />
          <rect x="180" y="20" width="80" height="40" fill="#f3e8ff" stroke="#7c3aed" strokeWidth="2" rx="3" />
          <text x="220" y="35" textAnchor="middle" fontSize="10">Appt 1</text>
          <text x="220" y="50" textAnchor="middle" fontSize="8" fill="#7c3aed">(sans compteur)</text>
          
          <line x1="140" y1="105" x2="180" y2="105" stroke="#fbbf24" strokeWidth="3" />
          <rect x="180" y="85" width="80" height="40" fill="#f3e8ff" stroke="#7c3aed" strokeWidth="2" rx="3" />
          <text x="220" y="100" textAnchor="middle" fontSize="10">Appt 2</text>
          <text x="220" y="115" textAnchor="middle" fontSize="8" fill="#7c3aed">(sans compteur)</text>
          
          <line x1="140" y1="170" x2="180" y2="170" stroke="#fbbf24" strokeWidth="3" />
          <rect x="180" y="150" width="80" height="40" fill="#f3e8ff" stroke="#7c3aed" strokeWidth="2" rx="3" />
          <text x="220" y="165" textAnchor="middle" fontSize="10">Appt 3</text>
          <text x="220" y="180" textAnchor="middle" fontSize="8" fill="#7c3aed">(sans compteur)</text>
          
          {/* Légende */}
          <text x="55" y="145" textAnchor="middle" fontSize="9" fill="#7c3aed" fontWeight="bold">1 seul compteur</text>
        </svg>
      ),
      useCases: [
        "✅ UN SEUL compteur pour tout l'immeuble",
        "✅ PAS de compteurs individuels par appartement",
        "✅ Répartition selon millièmes ou tantièmes"
      ]
    },
    
    principal: {
      title: "Compteur Principal",
      description: "Le compteur général au pied de l'immeuble",
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Rue */}
          <rect x="0" y="150" width="100" height="50" fill="#94a3b8" />
          <text x="50" y="180" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">RUE</text>
          
          {/* Tuyau d'arrivée */}
          <line x1="100" y1="175" x2="140" y2="175" stroke="#3b82f6" strokeWidth="8" />
          <polygon points="135,170 145,175 135,180" fill="#3b82f6" />
          
          {/* Compteur principal - GROS */}
          <rect x="140" y="150" width="70" height="50" fill="#06b6d4" stroke="#0891b2" strokeWidth="3" rx="5" />
          <text x="175" y="170" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">COMPTEUR</text>
          <text x="175" y="185" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">PRINCIPAL</text>
          
          {/* Tuyau vers immeuble */}
          <line x1="210" y1="175" x2="250" y2="175" stroke="#fbbf24" strokeWidth="8" />
          <polygon points="245,170 255,175 245,180" fill="#fbbf24" />
          
          {/* Immeuble */}
          <rect x="250" y="100" width="40" height="100" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <rect x="255" y="110" width="10" height="15" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          <rect x="275" y="110" width="10" height="15" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          <rect x="255" y="140" width="10" height="15" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          <rect x="275" y="140" width="10" height="15" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          <rect x="255" y="170" width="10" height="15" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          <rect x="275" y="170" width="10" height="15" fill="#93c5fd" stroke="#3b82f6" strokeWidth="1" />
          
          {/* Labels */}
          <text x="50" y="140" fontSize="10" fill="#475569" fontWeight="bold">Arrivée d'eau</text>
          <text x="175" y="140" textAnchor="middle" fontSize="10" fill="#0891b2" fontWeight="bold">Compteur du fournisseur</text>
          <text x="270" y="90" textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold">Immeuble</text>
        </svg>
      ),
      useCases: [
        "✅ C'est le PREMIER compteur à créer",
        "✅ Il mesure TOUTE l'eau entrant dans l'immeuble",
        "✅ Il sert de référence pour calculer les pertes du réseau"
      ]
    },
    
    individuel: {
      title: "Compteur Individuel",
      description: "Facturation directe par le fournisseur (hors copropriété)",
      svg: (
        <svg viewBox="0 0 300 200" className="w-full h-auto">
          {/* Plusieurs raccordements indépendants */}
          {/* Appt 1 */}
          <line x1="20" y1="40" x2="80" y2="40" stroke="#3b82f6" strokeWidth="4" />
          <rect x="80" y="25" width="30" height="30" fill="#10b981" stroke="#059669" strokeWidth="2" rx="3" />
          <line x1="110" y1="40" x2="150" y2="40" stroke="#fbbf24" strokeWidth="3" />
          <rect x="150" y="25" width="60" height="30" fill="#d1fae5" stroke="#059669" strokeWidth="1" rx="3" />
          <text x="180" y="45" textAnchor="middle" fontSize="10">Appt 1</text>
          
          {/* Appt 2 */}
          <line x1="20" y1="100" x2="80" y2="100" stroke="#3b82f6" strokeWidth="4" />
          <rect x="80" y="85" width="30" height="30" fill="#10b981" stroke="#059669" strokeWidth="2" rx="3" />
          <line x1="110" y1="100" x2="150" y2="100" stroke="#fbbf24" strokeWidth="3" />
          <rect x="150" y="85" width="60" height="30" fill="#d1fae5" stroke="#059669" strokeWidth="1" rx="3" />
          <text x="180" y="105" textAnchor="middle" fontSize="10">Appt 2</text>
          
          {/* Appt 3 */}
          <line x1="20" y1="160" x2="80" y2="160" stroke="#3b82f6" strokeWidth="4" />
          <rect x="80" y="145" width="30" height="30" fill="#10b981" stroke="#059669" strokeWidth="2" rx="3" />
          <line x1="110" y1="160" x2="150" y2="160" stroke="#fbbf24" strokeWidth="3" />
          <rect x="150" y="145" width="60" height="30" fill="#d1fae5" stroke="#059669" strokeWidth="1" rx="3" />
          <text x="180" y="165" textAnchor="middle" fontSize="10">Appt 3</text>
          
          {/* Fournisseur */}
          <text x="10" y="15" fontSize="10" fill="#3b82f6" fontWeight="bold">Fournisseur</text>
          <line x1="10" y1="20" x2="10" y2="180" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" />
          
          {/* Labels */}
          <text x="95" y="10" textAnchor="middle" fontSize="8" fill="#059669" fontWeight="bold">Compteurs individuels</text>
          <text x="230" y="100" fontSize="9" fill="#059669">Chaque appt paie</text>
          <text x="230" y="112" fontSize="9" fill="#059669">directement le</text>
          <text x="230" y="124" fontSize="9" fill="#059669">fournisseur</text>
        </svg>
      ),
      useCases: [
        "✅ Chaque appartement a son propre contrat avec le fournisseur",
        "✅ Facturation DIRECTE par VIVAQUA/SWDE/etc.",
        "✅ PAS géré par la copropriété"
      ]
    }
  };

  const currentSchema = schemas[selectedType] || schemas.divisionnaire;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {currentSchema.title}
          </h3>
          <p className="text-sm text-gray-600">
            {currentSchema.description}
          </p>
        </div>
      </div>

      {/* Schema visuel */}
      <div className="bg-white rounded-lg p-6 mb-4 shadow-sm border border-gray-200">
        {currentSchema.svg}
      </div>

      {/* Use cases */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">📋 Votre situation :</p>
        {currentSchema.useCases.map((useCase, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-green-600 text-lg leading-none">•</span>
            <p className="text-sm text-gray-700">{useCase}</p>
          </div>
        ))}
      </div>

      {/* Quick type selector */}
      <div className="mt-6 pt-4 border-t border-blue-200">
        <p className="text-xs text-gray-600 mb-3">Voir un autre schéma :</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(schemas).map(([key, schema]) => (
            <button
              key={key}
              type="button"
              onClick={() => onTypeSelect(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedType === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {schema.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
