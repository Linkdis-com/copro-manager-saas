import { useState, useEffect, useMemo } from 'react';
import {
  Coins, PiggyBank, AlertTriangle, Plus, Edit2, Trash2, X, Save,
  ChevronDown, ChevronUp, Users, Calculator, Calendar, RefreshCw,
  Clock, CheckCircle, Info, Settings
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Types de charges avec labels et icônes
const CHARGE_TYPES = {
  fonds_roulement: { label: 'Fonds de roulement', icon: Coins, color: 'blue', description: 'Provisions pour charges courantes (nettoyage, électricité, syndic, assurance...)' },
  fonds_reserve: { label: 'Fonds de réserve', icon: PiggyBank, color: 'green', description: 'Épargne pour dépenses non périodiques (toiture, chaudière, ascenseur...)' },
  charges_speciales: { label: 'Charges spéciales', icon: AlertTriangle, color: 'orange', description: 'Charges ponctuelles avec durée limitée (prêt ascenseur, travaux façade...)' },
};

const FREQUENCES = {
  mensuel: { label: 'Mensuel', diviseur: 12 },
  trimestriel: { label: 'Trimestriel', diviseur: 4 },
  semestriel: { label: 'Semestriel', diviseur: 2 },
  annuel: { label: 'Annuel', diviseur: 1 },
};

const REPARTITIONS = {
  milliemes: { label: 'Par millièmes', description: 'Proportionnel aux millièmes de chaque propriétaire' },
  egalitaire: { label: 'Égalitaire', description: 'Montant identique pour chaque propriétaire' },
  custom: { label: 'Personnalisé', description: 'Quote-part définie manuellement par propriétaire' },
};

function ChargesRecurrentes({ immeubleId, proprietaires = [] }) {
  const [charges, setCharges] = useState([]);
  const [repartition, setRepartition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Accordéons ouverts
  const [openSections, setOpenSections] = useState({
    fonds_roulement: true,
    fonds_reserve: true,
    charges_speciales: true,
  });

  // Charger données
  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [chargesRes, repartRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/immeubles/${immeubleId}/charges-recurrentes`, { headers }),
        fetch(`${API_URL}/api/v1/immeubles/${immeubleId}/charges-recurrentes/repartition`, { headers }),
      ]);

      if (chargesRes.ok) {
        const data = await chargesRes.json();
        setCharges(data);
      }
      if (repartRes.ok) {
        const data = await repartRes.json();
        setRepartition(data);
      }
    } catch (err) {
      setError('Erreur de chargement des charges');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immeubleId) loadData();
  }, [immeubleId]);

  // Grouper charges par type
  const chargesByType = useMemo(() => {
    const grouped = {
      fonds_roulement: [],
      fonds_reserve: [],
      charges_speciales: [],
    };
    charges.forEach(c => {
      if (grouped[c.type]) {
        grouped[c.type].push(c);
      }
    });
    return grouped;
  }, [charges]);

  // Total annuel par type
  const totauxParType = useMemo(() => {
    const totaux = {};
    Object.keys(CHARGE_TYPES).forEach(type => {
      totaux[type] = chargesByType[type]
        ?.filter(c => c.actif)
        .reduce((sum, c) => sum + parseFloat(c.montant_annuel || 0), 0) || 0;
    });
    totaux.total = Object.values(totaux).reduce((s, v) => s + v, 0);
    return totaux;
  }, [chargesByType]);

  const toggleSection = (type) => {
    setOpenSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleDelete = async (chargeId) => {
    if (!confirm('Supprimer cette charge ?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/immeubles/${immeubleId}/charges-recurrentes/${chargeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (charge) => {
    setEditingCharge(charge);
    setShowForm(true);
  };

  const handleAdd = (type) => {
    setEditingCharge({ type });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-primary-600 mr-3" />
        <span className="text-gray-600">Chargement des charges...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header avec totaux */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Charges de copropriété</h3>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les fonds et charges de l'immeuble
          </p>
        </div>
      </div>

      {/* Cards résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(CHARGE_TYPES).map(([type, config]) => {
          const Icon = config.icon;
          const colorMap = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            green: 'bg-green-50 text-green-700 border-green-200',
            orange: 'bg-orange-50 text-orange-700 border-orange-200',
          };
          return (
            <div key={type} className={`rounded-xl border p-4 ${colorMap[config.color]}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{config.label}</span>
              </div>
              <p className="text-2xl font-bold">
                {totauxParType[type]?.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-xs opacity-70">/an</p>
            </div>
          );
        })}
        <div className="rounded-xl border p-4 bg-gray-50 text-gray-700 border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-bold">
            {totauxParType.total?.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs opacity-70">/an • {(totauxParType.total / 12).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}/mois</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Sections accordéon par type */}
      {Object.entries(CHARGE_TYPES).map(([type, config]) => {
        const Icon = config.icon;
        const typeCharges = chargesByType[type] || [];
        const isOpen = openSections[type];
        const colorMap = {
          blue: { header: 'bg-blue-50 hover:bg-blue-100 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
          green: { header: 'bg-green-50 hover:bg-green-100 border-green-200', badge: 'bg-green-100 text-green-700' },
          orange: { header: 'bg-orange-50 hover:bg-orange-100 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
        };
        const colors = colorMap[config.color];

        return (
          <div key={type} className="border rounded-xl overflow-hidden">
            {/* Header accordéon */}
            <button
              onClick={() => toggleSection(type)}
              className={`w-full flex items-center justify-between px-5 py-4 ${colors.header} transition-colors`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <span className="font-semibold text-gray-900">{config.label}</span>
                  <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {typeCharges.length} charge{typeCharges.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {totauxParType[type]?.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}/an
                </span>
                {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
              </div>
            </button>

            {/* Contenu */}
            {isOpen && (
              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-500 mb-3">{config.description}</p>

                {typeCharges.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune charge définie</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {typeCharges.map(charge => (
                      <ChargeCard
                        key={charge.id}
                        charge={charge}
                        proprietaires={proprietaires}
                        onEdit={() => handleEdit(charge)}
                        onDelete={() => handleDelete(charge.id)}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleAdd(type)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une charge {config.label.toLowerCase()}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Tableau récapitulatif par propriétaire */}
      {repartition && repartition.repartition && repartition.repartition.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <span className="font-semibold text-gray-900">Récapitulatif par propriétaire</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Propriétaire</th>
                  <th className="text-right px-3 py-3 font-medium">Millièmes</th>
                  <th className="text-right px-3 py-3 font-medium">Total annuel</th>
                  <th className="text-right px-5 py-3 font-medium">Total mensuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {repartition.repartition.map(r => (
                  <tr key={r.proprietaireId} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.prenom} {r.nom}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{r.milliemes}</td>
                    <td className="px-3 py-3 text-right font-medium">
                      {r.totalAnnuel.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-primary-700">
                      {r.totalMensuel.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-5 py-3">Total</td>
                  <td className="px-3 py-3 text-right">{repartition.totalMilliemes}</td>
                  <td className="px-3 py-3 text-right">
                    {totauxParType.total.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-5 py-3 text-right text-primary-700">
                    {(totauxParType.total / 12).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {showForm && (
        <ChargeForm
          immeubleId={immeubleId}
          charge={editingCharge}
          proprietaires={proprietaires}
          onClose={() => { setShowForm(false); setEditingCharge(null); }}
          onSuccess={() => { setShowForm(false); setEditingCharge(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ===== CHARGE CARD =====
function ChargeCard({ charge, proprietaires, onEdit, onDelete }) {
  const [showDetail, setShowDetail] = useState(false);
  const config = CHARGE_TYPES[charge.type] || {};
  const freq = FREQUENCES[charge.frequence] || {};
  const montantPeriodique = parseFloat(charge.montant_annuel) / (freq.diviseur || 12);
  const isActive = charge.actif && (!charge.date_fin || new Date(charge.date_fin) >= new Date());

  // Durée restante pour charges spéciales
  let dureeInfo = null;
  if (charge.type === 'charges_speciales' && charge.date_debut && charge.date_fin) {
    const debut = new Date(charge.date_debut);
    const fin = new Date(charge.date_fin);
    const now = new Date();
    const totalMois = (fin.getFullYear() - debut.getFullYear()) * 12 + fin.getMonth() - debut.getMonth();
    const resteMois = Math.max(0, (fin.getFullYear() - now.getFullYear()) * 12 + fin.getMonth() - now.getMonth());
    dureeInfo = { totalMois, resteMois };
  }

  const exclusions = charge.exclusions || [];
  const nbExclus = exclusions.filter(e => e.proprietaire_id).length;

  return (
    <div className={`border rounded-lg p-4 ${isActive ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900">{charge.libelle}</h4>
            {!isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Inactif</span>
            )}
            {nbExclus > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                {nbExclus} exclu{nbExclus > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {charge.description && (
            <p className="text-sm text-gray-500 mt-0.5">{charge.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
            <span className="font-semibold text-gray-900">
              {parseFloat(charge.montant_annuel).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}/an
            </span>
            <span className="text-gray-400">•</span>
            <span>
              {montantPeriodique.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}/{freq.label?.toLowerCase() || 'mois'}
            </span>
            <span className="text-gray-400">•</span>
            <span className="capitalize">{REPARTITIONS[charge.cle_repartition]?.label || charge.cle_repartition}</span>
          </div>
          {dureeInfo && (
            <div className="mt-2 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>
                    {new Date(charge.date_debut).toLocaleDateString('fr-BE')} → {new Date(charge.date_fin).toLocaleDateString('fr-BE')}
                  </span>
                  <span>{dureeInfo.resteMois} mois restants</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.max(5, ((dureeInfo.totalMois - dureeInfo.resteMois) / dureeInfo.totalMois) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-3">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== FORMULAIRE CHARGE =====
function ChargeForm({ immeubleId, charge, proprietaires, onClose, onSuccess }) {
  const isEditing = charge?.id;
  const [form, setForm] = useState({
    type: charge?.type || 'fonds_roulement',
    libelle: charge?.libelle || '',
    description: charge?.description || '',
    montantAnnuel: charge?.montant_annuel || '',
    frequence: charge?.frequence || 'trimestriel',
    cleRepartition: charge?.cle_repartition || 'milliemes',
    actif: charge?.actif !== false,
    dateDebut: charge?.date_debut ? charge.date_debut.split('T')[0] : '',
    dateFin: charge?.date_fin ? charge.date_fin.split('T')[0] : '',
  });
  const [exclusions, setExclusions] = useState(
    (charge?.exclusions || []).filter(e => e.proprietaire_id).map(e => e.proprietaire_id)
  );
  const [quotesParts, setQuotesParts] = useState(() => {
    if (charge?.quotes_parts) {
      const qpMap = {};
      charge.quotes_parts.filter(q => q.proprietaire_id).forEach(q => {
        qpMap[q.proprietaire_id] = q.quote_part;
      });
      return qpMap;
    }
    return {};
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleExclusion = (propId) => {
    setExclusions(prev =>
      prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.libelle || !form.montantAnnuel) {
      setError('Libellé et montant sont obligatoires');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const body = {
        ...form,
        montantAnnuel: parseFloat(form.montantAnnuel),
        exclusions: exclusions.map(propId => ({ proprietaireId: propId })),
        quotesParts: form.cleRepartition === 'custom'
          ? Object.entries(quotesParts).map(([propId, qp]) => ({
              proprietaireId: propId,
              quotePart: parseFloat(qp)
            }))
          : [],
      };

      const url = isEditing
        ? `${API_URL}/api/v1/immeubles/${immeubleId}/charges-recurrentes/${charge.id}`
        : `${API_URL}/api/v1/immeubles/${immeubleId}/charges-recurrentes`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur serveur');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const freq = FREQUENCES[form.frequence];
  const montantPeriodique = form.montantAnnuel ? parseFloat(form.montantAnnuel) / (freq?.diviseur || 12) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Modifier la charge' : 'Nouvelle charge'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de charge</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(CHARGE_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChange('type', type)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                      form.type === type
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-sm">{config.label}</span>
                      <p className="text-xs text-gray-500">{config.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Libellé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
            <input
              type="text"
              value={form.libelle}
              onChange={e => handleChange('libelle', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ex: Charges communes 2025, Prêt ascenseur..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={2}
              placeholder="Description optionnelle..."
            />
          </div>

          {/* Montant + Fréquence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant annuel (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.montantAnnuel}
                onChange={e => handleChange('montantAnnuel', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="12000.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select
                value={form.frequence}
                onChange={e => handleChange('frequence', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {Object.entries(FREQUENCES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Montant par période calculé */}
          {form.montantAnnuel > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-blue-700">
                <Calculator className="h-4 w-4" />
                <span>
                  = <strong>{montantPeriodique.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' })}</strong>
                  {' '}{form.frequence === 'mensuel' ? '/mois' : `/${freq?.label?.toLowerCase()}`}
                </span>
              </div>
            </div>
          )}

          {/* Clé de répartition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Clé de répartition</label>
            <div className="space-y-2">
              {Object.entries(REPARTITIONS).map(([key, val]) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    form.cleRepartition === key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="cleRepartition"
                    value={key}
                    checked={form.cleRepartition === key}
                    onChange={e => handleChange('cleRepartition', e.target.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-sm">{val.label}</span>
                    <p className="text-xs text-gray-500">{val.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quotes-parts custom */}
          {form.cleRepartition === 'custom' && proprietaires.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quote-parts personnalisées (%)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {proprietaires.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{p.prenom} {p.nom}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={quotesParts[p.id] || ''}
                      onChange={e => setQuotesParts(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total: {Object.values(quotesParts).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)}%
              </p>
            </div>
          )}

          {/* Dates pour charges spéciales */}
          {form.type === 'charges_speciales' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={form.dateDebut}
                  onChange={e => handleChange('dateDebut', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={form.dateFin}
                  onChange={e => handleChange('dateFin', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Exclusions (pour charges spéciales surtout) */}
          {proprietaires.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Propriétaires exclus
                <span className="text-gray-400 font-normal ml-1">(ex: RDC pour ascenseur)</span>
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {proprietaires.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exclusions.includes(p.id)}
                      onChange={() => toggleExclusion(p.id)}
                      className="rounded text-primary-600"
                    />
                    <span className="text-sm">{p.prenom} {p.nom}</span>
                    <span className="text-xs text-gray-400 ml-auto">{p.milliemes} mill.</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actif */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={e => handleChange('actif', e.target.checked)}
              className="rounded text-primary-600"
            />
            <span className="text-sm text-gray-700">Charge active</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? 'Enregistrer' : 'Créer la charge'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChargesRecurrentes;
