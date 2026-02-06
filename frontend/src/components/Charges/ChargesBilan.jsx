import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  PiggyBank,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Layers
} from 'lucide-react';
import { exercicesService } from '../../services/api';

// Couleurs par type de fonds
const FONDS_STYLES = {
  fonds_roulement: { 
    label: 'Fonds de roulement',
    icon: Coins,
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    iconBg: 'bg-blue-100', iconText: 'text-blue-600',
    headerBg: 'bg-blue-600',
  },
  fonds_reserve: { 
    label: 'Fonds de réserve',
    icon: PiggyBank,
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
    iconBg: 'bg-emerald-100', iconText: 'text-emerald-600',
    headerBg: 'bg-emerald-600',
  },
  charges_speciales: { 
    label: 'Charges spéciales',
    icon: AlertTriangle,
    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700',
    iconBg: 'bg-orange-100', iconText: 'text-orange-600',
    headerBg: 'bg-orange-600',
  },
};

function ChargesBilan({ immeubleId, exerciceId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bilan, setBilan] = useState(null);
  const [viewMode, setViewMode] = useState('type'); // 'type' ou 'proprietaire'
  const [expandedSections, setExpandedSections] = useState({
    fonds_roulement: true,
    fonds_reserve: false,
    charges_speciales: false,
  });

  useEffect(() => {
    if (exerciceId) loadBilan();
    else { setLoading(false); setBilan(null); }
  }, [immeubleId, exerciceId]);

  const loadBilan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await exercicesService.getBilanCharges(immeubleId, exerciceId);
      setBilan(res.data);
    } catch (err) {
      console.error('Error loading bilan charges:', err);
      if (err.response?.status === 404) {
        setBilan(null); // Pas encore de données
      } else {
        setError('Erreur lors du chargement du bilan');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant || 0) + ' €';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600 text-sm">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-red-700 text-sm">{error}</span>
      </div>
    );
  }

  if (!bilan || !bilan.totalGlobal || bilan.totalGlobal.appele === 0) {
    return (
      <div className="p-6 text-center">
        <Coins className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Aucun appel de charges récurrentes pour cet exercice</p>
        <p className="text-gray-400 text-xs mt-1">Les appels sont générés automatiquement à la création d'un exercice</p>
      </div>
    );
  }

  const { bilanParType, bilanParProprietaire, totalGlobal } = bilan;

  return (
    <div className="space-y-4 p-3">
      {/* Cards résumé par fonds */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(FONDS_STYLES).map(([key, style]) => {
          const data = bilanParType[key];
          if (!data) return null;
          const Icon = style.icon;
          const solde = (data.totalPaye || 0) - (data.totalAppele || 0);
          
          return (
            <div key={key} className={`p-3 rounded-lg border ${style.border} ${style.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${style.iconBg}`}>
                  <Icon className={`h-4 w-4 ${style.iconText}`} />
                </div>
                <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[10px] text-gray-500">Appelé</p>
                  <p className="text-xs font-bold text-red-600">{formatMontant(data.totalAppele)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Payé</p>
                  <p className="text-xs font-bold text-green-600">{formatMontant(data.totalPaye)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Solde</p>
                  <p className={`text-xs font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMontant(solde)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toggle vue */}
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={() => setViewMode('type')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
            viewMode === 'type'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Layers className="h-3 w-3" />
          Par type de fonds
        </button>
        <button
          onClick={() => setViewMode('proprietaire')}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
            viewMode === 'proprietaire'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="h-3 w-3" />
          Par propriétaire
        </button>
      </div>

      {/* ===== VUE PAR TYPE DE FONDS ===== */}
      {viewMode === 'type' && (
        <div className="space-y-3">
          {Object.entries(FONDS_STYLES).map(([key, style]) => {
            const data = bilanParType[key];
            if (!data || data.charges.length === 0) return null;
            const Icon = style.icon;
            const isExpanded = expandedSections[key];
            const solde = (data.totalPaye || 0) - (data.totalAppele || 0);

            // Regrouper par libellé
            const groupedByLibelle = {};
            data.charges.forEach(c => {
              if (!groupedByLibelle[c.libelle]) {
                groupedByLibelle[c.libelle] = { libelle: c.libelle, totalAppele: 0, totalPaye: 0, proprietaires: [] };
              }
              groupedByLibelle[c.libelle].totalAppele += c.totalAppele;
              groupedByLibelle[c.libelle].totalPaye += c.totalPaye;
              groupedByLibelle[c.libelle].proprietaires.push(c);
            });

            return (
              <div key={key} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(key)}
                  className={`w-full flex items-center justify-between p-3 ${style.headerBg} text-white`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{style.label}</span>
                    <span className="text-xs opacity-70">({data.charges.length} lignes)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{formatMontant(data.totalAppele)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-white">
                    {Object.values(groupedByLibelle).map((group, idx) => (
                      <div key={idx} className="border-b last:border-b-0">
                        <div className={`px-3 py-2 ${style.bg} flex justify-between items-center text-sm`}>
                          <span className={`font-medium ${style.text}`}>{group.libelle}</span>
                          <span className={`font-bold ${style.text}`}>{formatMontant(group.totalAppele)}</span>
                        </div>
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-gray-500">Propriétaire</th>
                              <th className="px-3 py-1.5 text-right text-gray-500">Appelé</th>
                              <th className="px-3 py-1.5 text-right text-gray-500">Payé</th>
                              <th className="px-3 py-1.5 text-right text-gray-500">Solde</th>
                              <th className="px-3 py-1.5 text-center text-gray-500">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.proprietaires.map((p, pidx) => {
                              const pSolde = p.totalPaye - p.totalAppele;
                              return (
                                <tr key={pidx} className="hover:bg-gray-50">
                                  <td className="px-3 py-1.5 text-gray-700">{p.proprietaireNom}</td>
                                  <td className="px-3 py-1.5 text-right text-red-600">{formatMontant(p.totalAppele)}</td>
                                  <td className="px-3 py-1.5 text-right text-green-600">{formatMontant(p.totalPaye)}</td>
                                  <td className={`px-3 py-1.5 text-right font-medium ${pSolde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatMontant(pSolde)}
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    {p.nbPayees === p.nbPeriodes ? (
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />
                                    ) : p.nbRetard > 0 ? (
                                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />
                                    ) : (
                                      <Clock className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    
                    {/* Totaux du fonds */}
                    <div className={`px-3 py-2 ${style.bg} flex justify-between items-center border-t`}>
                      <span className="text-xs font-bold text-gray-700">Total {style.label}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-red-600">Appelé: {formatMontant(data.totalAppele)}</span>
                        <span className="text-green-600">Payé: {formatMontant(data.totalPaye)}</span>
                        <span className={`font-bold ${solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          Solde: {formatMontant(solde)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== VUE PAR PROPRIÉTAIRE ===== */}
      {viewMode === 'proprietaire' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Propriétaire</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">Mill.</th>
                  <th className="px-3 py-2 text-right font-medium text-blue-600" title="Fonds de roulement">
                    <Coins className="h-3 w-3 inline mr-1" />Roul.
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-emerald-600" title="Fonds de réserve">
                    <PiggyBank className="h-3 w-3 inline mr-1" />Rés.
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-orange-600" title="Charges spéciales">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />Spéc.
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Total appelé</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Total payé</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bilanParProprietaire.map((bp) => {
                  const solde = bp.totalPaye - bp.totalAppele;
                  return (
                    <tr key={bp.proprietaireId} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-900">
                          {bp.prenom} {bp.nom}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{bp.milliemes}</td>
                      <td className="px-3 py-2 text-right text-blue-600">{formatMontant(bp.fondsRoulement.appele)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatMontant(bp.fondsReserve.appele)}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{formatMontant(bp.chargesSpeciales.appele)}</td>
                      <td className="px-3 py-2 text-right font-medium text-red-600">{formatMontant(bp.totalAppele)}</td>
                      <td className="px-3 py-2 text-right font-medium text-green-600">{formatMontant(bp.totalPaye)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMontant(solde)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-medium">
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-700" colSpan="5">TOTAL</td>
                  <td className="px-3 py-2 text-right font-bold text-red-600">{formatMontant(totalGlobal.appele)}</td>
                  <td className="px-3 py-2 text-right font-bold text-green-600">{formatMontant(totalGlobal.paye)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${totalGlobal.solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatMontant(totalGlobal.solde)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Total global */}
      <div className="p-3 bg-gray-100 rounded-lg flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">Total charges récurrentes</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-red-600">Appelé: <strong>{formatMontant(totalGlobal.appele)}</strong></span>
          <span className="text-green-600">Payé: <strong>{formatMontant(totalGlobal.paye)}</strong></span>
          <span className={`font-bold ${totalGlobal.solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Solde: {formatMontant(totalGlobal.solde)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ChargesBilan;
