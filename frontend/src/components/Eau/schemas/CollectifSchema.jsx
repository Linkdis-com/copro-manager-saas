// =====================================================
// 🏢 SCHÉMA COLLECTIF
// frontend/src/components/Eau/schemas/CollectifSchema.jsx
// =====================================================
export default function CollectifSchema() {
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
