// =====================================================
// 👤 SCHÉMA INDIVIDUEL
// frontend/src/components/Eau/schemas/IndividuelSchema.jsx
// =====================================================
export default function IndividuelSchema() {
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
