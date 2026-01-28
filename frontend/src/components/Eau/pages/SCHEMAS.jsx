// =====================================================
// 🌊 SCHÉMAS VISUELS - 3 types de comptage
// frontend/src/components/Eau/schemas/
// =====================================================

// =====================================================
// CollectifSchema.jsx
// =====================================================
export function CollectifSchema() {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto">
      {/* Immeuble */}
      <rect x="100" y="80" width="100" height="100" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
      <rect x="110" y="90" width="15" height="15" fill="#0284c7" />
      <rect x="135" y="90" width="15" height="15" fill="#0284c7" />
      <rect x="160" y="90" width="15" height="15" fill="#0284c7" />
      <rect x="110" y="115" width="15" height="15" fill="#0284c7" />
      <rect x="135" y="115" width="15" height="15" fill="#0284c7" />
      <rect x="160" y="115" width="15" height="15" fill="#0284c7" />
      <rect x="110" y="140" width="15" height="15" fill="#0284c7" />
      <rect x="135" y="140" width="15" height="15" fill="#0284c7" />
      <rect x="160" y="140" width="15" height="15" fill="#0284c7" />
      <text x="150" y="75" textAnchor="middle" fontSize="12" fontWeight="bold">Immeuble</text>
      
      {/* Compteur collectif */}
      <circle cx="150" cy="40" r="20" fill="#10b981" stroke="#059669" strokeWidth="2" />
      <text x="150" y="45" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">💧</text>
      <text x="150" y="20" textAnchor="middle" fontSize="11" fontWeight="bold">Collectif</text>
      
      {/* Flèche */}
      <line x1="150" y1="60" x2="150" y2="80" stroke="#0284c7" strokeWidth="2" markerEnd="url(#arrowblue)" />
      
      {/* Arrow marker */}
      <defs>
        <marker id="arrowblue" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#0284c7" />
        </marker>
      </defs>
    </svg>
  );
}

// =====================================================
// DivisonnaireSchema.jsx
// =====================================================
export function DivisonnaireSchema() {
  return (
    <svg viewBox="0 0 300 250" className="w-full h-auto">
      {/* Compteur principal */}
      <circle cx="150" cy="30" r="20" fill="#6366f1" stroke="#4f46e5" strokeWidth="2" />
      <text x="150" y="35" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">💧</text>
      <text x="150" y="15" textAnchor="middle" fontSize="11" fontWeight="bold">Principal</text>
      
      {/* Immeuble */}
      <rect x="100" y="80" width="100" height="100" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
      <text x="150" y="75" textAnchor="middle" fontSize="11" fontWeight="bold">Immeuble</text>
      
      {/* Flèche principale */}
      <line x1="150" y1="50" x2="150" y2="80" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowpurple)" />
      
      {/* Compteurs divisionnaires */}
      <g>
        {/* Appt 1 */}
        <rect x="105" y="90" width="25" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="117" y="105" textAnchor="middle" fontSize="8" fontWeight="bold">101</text>
        <circle cx="117" cy="115" r="6" fill="#10b981" />
        <text x="117" y="118" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 2 */}
        <rect x="137" y="90" width="25" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="149" y="105" textAnchor="middle" fontSize="8" fontWeight="bold">102</text>
        <circle cx="149" cy="115" r="6" fill="#10b981" />
        <text x="149" y="118" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 3 */}
        <rect x="169" y="90" width="25" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="181" y="105" textAnchor="middle" fontSize="8" fontWeight="bold">103</text>
        <circle cx="181" cy="115" r="6" fill="#10b981" />
        <text x="181" y="118" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 4 */}
        <rect x="105" y="125" width="25" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="117" y="140" textAnchor="middle" fontSize="8" fontWeight="bold">201</text>
        <circle cx="117" cy="150" r="6" fill="#10b981" />
        <text x="117" y="153" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 5 */}
        <rect x="137" y="125" width="25" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="149" y="140" textAnchor="middle" fontSize="8" fontWeight="bold">202</text>
        <circle cx="149" cy="150" r="6" fill="#10b981" />
        <text x="149" y="153" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 6 */}
        <rect x="169" y="125" width="25" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="181" y="140" textAnchor="middle" fontSize="8" fontWeight="bold">203</text>
        <circle cx="181" cy="150" r="6" fill="#10b981" />
        <text x="181" y="153" textAnchor="middle" fontSize="7" fill="white">💧</text>
      </g>
      
      {/* Pertes */}
      <text x="150" y="200" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="bold">
        Pertes = Principal - Σ Divisionnaires
      </text>
      
      {/* Arrow markers */}
      <defs>
        <marker id="arrowpurple" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
        </marker>
      </defs>
    </svg>
  );
}

// =====================================================
// IndividuelSchema.jsx
// =====================================================
export function IndividuelSchema() {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto">
      {/* Immeuble */}
      <rect x="100" y="60" width="100" height="100" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
      <text x="150" y="55" textAnchor="middle" fontSize="11" fontWeight="bold">Immeuble</text>
      
      {/* Appartements avec compteurs individuels */}
      <g>
        {/* Appt 1 */}
        <rect x="105" y="70" width="28" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="119" y="85" textAnchor="middle" fontSize="8" fontWeight="bold">101</text>
        <circle cx="119" cy="95" r="7" fill="#10b981" />
        <text x="119" y="98" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 2 */}
        <rect x="136" y="70" width="28" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="150" y="85" textAnchor="middle" fontSize="8" fontWeight="bold">102</text>
        <circle cx="150" cy="95" r="7" fill="#10b981" />
        <text x="150" y="98" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 3 */}
        <rect x="167" y="70" width="28" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="181" y="85" textAnchor="middle" fontSize="8" fontWeight="bold">103</text>
        <circle cx="181" cy="95" r="7" fill="#10b981" />
        <text x="181" y="98" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 4 */}
        <rect x="105" y="103" width="28" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="119" y="118" textAnchor="middle" fontSize="8" fontWeight="bold">201</text>
        <circle cx="119" cy="128" r="7" fill="#10b981" />
        <text x="119" y="131" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 5 */}
        <rect x="136" y="103" width="28" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="150" y="118" textAnchor="middle" fontSize="8" fontWeight="bold">202</text>
        <circle cx="150" cy="128" r="7" fill="#10b981" />
        <text x="150" y="131" textAnchor="middle" fontSize="7" fill="white">💧</text>
        
        {/* Appt 6 */}
        <rect x="167" y="103" width="28" height="25" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="181" y="118" textAnchor="middle" fontSize="8" fontWeight="bold">203</text>
        <circle cx="181" cy="128" r="7" fill="#10b981" />
        <text x="181" y="131" textAnchor="middle" fontSize="7" fill="white">💧</text>
      </g>
      
      {/* Flèches vers fournisseur */}
      <text x="150" y="175" textAnchor="middle" fontSize="10" fontWeight="bold">↓ Facturation directe ↓</text>
      <text x="150" y="190" textAnchor="middle" fontSize="9" fill="#6366f1">Chaque locataire paie au fournisseur</text>
    </svg>
  );
}

// =====================================================
// EXPORTS
// =====================================================
export default {
  CollectifSchema,
  DivisonnaireSchema,
  IndividuelSchema
};
