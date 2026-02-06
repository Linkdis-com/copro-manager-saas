import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  ArrowRightLeft,
  Wallet,
  Receipt,
  CreditCard,
  Coins,
  PiggyBank,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import {
  immeublesService,
  exercicesService
} from '../../services/api';
import * as XLSX from 'xlsx';

// Styles par type de fonds
const FONDS_CONFIG = {
  fondsRoulement: {
    label: 'Fonds de roulement',
    sectionLabel: 'B1',
    icon: Coins,
    color: 'blue',
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    headerBg: 'bg-blue-600', iconBg: 'bg-blue-100', iconText: 'text-blue-600',
  },
  fondsReserve: {
    label: 'Fonds de réserve',
    sectionLabel: 'B2',
    icon: PiggyBank,
    color: 'emerald',
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
    headerBg: 'bg-emerald-600', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600',
  },
  chargesSpeciales: {
    label: 'Charges spéciales',
    sectionLabel: 'B3',
    icon: AlertTriangle,
    color: 'orange',
    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700',
    headerBg: 'bg-orange-600', iconBg: 'bg-orange-100', iconText: 'text-orange-600',
  },
};

function DecompteAnnuelRAN() {
  const { immeubleId, exerciceId, proprietaireId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decompte, setDecompte] = useState(null);
  const [expandedFonds, setExpandedFonds] = useState({
    fondsRoulement: true,
    fondsReserve: true,
    chargesSpeciales: true,
  });

  useEffect(() => {
    loadDecompte();
  }, [immeubleId, exerciceId, proprietaireId]);

  const loadDecompte = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await exercicesService.getDecompteAnnuel(immeubleId, exerciceId, proprietaireId);
      setDecompte(res.data.decompte);
    } catch (err) {
      console.error('Error loading decompte:', err);
      setError('Erreur lors du chargement du décompte');
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-BE');
  };

  const formatPeriode = (debut, fin) => {
    if (!debut || !fin) return '-';
    const d = new Date(debut);
    const f = new Date(fin);
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${mois[d.getMonth()]} ${d.getFullYear()} → ${mois[f.getMonth()]} ${f.getFullYear()}`;
  };

  const toggleFonds = (key) => {
    setExpandedFonds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (!decompte) return;

    const data = [
      ['DÉCOMPTE ANNUEL DE CHARGES'],
      [''],
      ['Immeuble:', decompte.immeuble?.nom],
      ['Adresse:', decompte.immeuble?.adresse],
      [''],
      ['Exercice:', decompte.exercice?.annee],
      ['Période:', `${formatDate(decompte.exercice?.dateDebut)} - ${formatDate(decompte.exercice?.dateFin)}`],
      [''],
      ['PROPRIÉTAIRE'],
      ['Nom:', `${decompte.proprietaire?.prenom || ''} ${decompte.proprietaire?.nom}`],
      ['Appartement:', decompte.proprietaire?.appartement],
      ['Millièmes:', `${decompte.proprietaire?.milliemes}/1000 (${decompte.proprietaire?.pourcentage}%)`],
      [''],
      ['═══════════════════════════════════════════'],
      [''],
      ['A. REPORT À NOUVEAU'],
      ['Solde reporté:', formatMontant(decompte.reportANouveau?.solde)],
      [''],
    ];

    // B1: Fonds de roulement
    const addFondsToExcel = (fondsData, label, sectionLabel) => {
      if (!fondsData || fondsData.totalAppele === 0) return;
      data.push([`${sectionLabel}. ${label}`]);
      (fondsData.chargesGroupees || []).forEach(cg => {
        data.push([`  ${cg.libelle}`, '', formatMontant(cg.totalAppele), formatMontant(cg.totalPaye)]);
      });
      data.push([`  Total ${label}:`, '', formatMontant(fondsData.totalAppele), formatMontant(fondsData.totalPaye)]);
      data.push(['']);
    };

    addFondsToExcel(decompte.fondsRoulement, 'Fonds de roulement', 'B1');
    addFondsToExcel(decompte.fondsReserve, 'Fonds de réserve', 'B2');
    addFondsToExcel(decompte.chargesSpeciales, 'Charges spéciales', 'B3');

    // C: Charges comptables
    data.push(['C. CHARGES COMPTABLES']);
    (decompte.charges?.detail || []).forEach(c => {
      data.push([`  ${c.categorie}`, '', formatMontant(c.total)]);
    });
    data.push(['  Total charges comptables:', '', formatMontant(decompte.charges?.total)]);
    data.push(['']);

    // D: Versements
    data.push(['D. VERSEMENTS']);
    (decompte.versements?.detail || []).forEach(v => {
      data.push([`  ${v.libelle}`, formatDate(v.date_appel), formatMontant(v.montant_du), formatMontant(v.montant_paye)]);
    });
    data.push(['  Total versements:', '', formatMontant(decompte.versements?.total)]);
    data.push(['']);

    // E: Solde final
    data.push(['═══════════════════════════════════════════']);
    data.push(['E. SOLDE FINAL:', formatMontant(decompte.soldeFinal?.montant)]);
    data.push([decompte.soldeFinal?.message]);
    data.push(['']);
    data.push(['Document généré le:', new Date().toLocaleDateString('fr-BE')]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Décompte');
    XLSX.writeFile(wb, `decompte_${decompte.exercice?.annee}_${decompte.proprietaire?.nom}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !decompte) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error || 'Décompte non trouvé'}</span>
        </div>
      </div>
    );
  }

  const ran = decompte.reportANouveau?.solde || 0;
  const soldeFinal = decompte.soldeFinal?.montant || 0;
  const recap = decompte.recapitulatif || {};

  // Vérifier s'il y a des charges récurrentes
  const hasChargesRecurrentes = (decompte.fondsRoulement?.totalAppele > 0) ||
    (decompte.fondsReserve?.totalAppele > 0) ||
    (decompte.chargesSpeciales?.totalAppele > 0);

  // Composant section fonds réutilisable
  const FondsSection = ({ fondsKey, fondsData }) => {
    if (!fondsData || fondsData.totalAppele === 0) return null;
    const config = FONDS_CONFIG[fondsKey];
    const Icon = config.icon;
    const isExpanded = expandedFonds[fondsKey];

    return (
      <div className="p-6 border-b">
        <button
          onClick={() => toggleFonds(fondsKey)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.iconBg}`}>
              <Icon className={`w-4 h-4 ${config.iconText}`} />
            </div>
            <h4 className="font-semibold text-gray-900">
              {config.sectionLabel}. {config.label}
            </h4>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-red-600">
              {formatMontant(fondsData.totalAppele)}
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {isExpanded && (
          <div className="space-y-3">
            {(fondsData.chargesGroupees || []).map((charge, idx) => (
              <div key={idx} className={`rounded-lg border ${config.border} overflow-hidden`}>
                <div className={`px-4 py-2 ${config.bg} flex justify-between items-center`}>
                  <div>
                    <span className={`font-medium text-sm ${config.text}`}>{charge.libelle}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({charge.frequence} • {charge.periodes?.length || 0} périodes)
                    </span>
                  </div>
                  <span className={`font-bold text-sm ${config.text}`}>{formatMontant(charge.totalAppele)}</span>
                </div>
                
                {(charge.periodes || []).length > 1 && (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-gray-500">Période</th>
                        <th className="px-3 py-1.5 text-right text-gray-500">Appelé</th>
                        <th className="px-3 py-1.5 text-right text-gray-500">Payé</th>
                        <th className="px-3 py-1.5 text-center text-gray-500">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {charge.periodes.map((p, pidx) => (
                        <tr key={pidx}>
                          <td className="px-3 py-1.5 text-gray-600">
                            {formatPeriode(p.periodeDebut, p.periodeFin)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-red-600">{formatMontant(p.montantAppele)}</td>
                          <td className="px-3 py-1.5 text-right text-green-600">{formatMontant(p.montantPaye)}</td>
                          <td className="px-3 py-1.5 text-center">
                            {p.statut === 'paye' ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            ) : p.statut === 'en_retard' ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {/* Total du fonds */}
            <div className={`flex justify-between items-center p-3 rounded-lg ${config.bg} border ${config.border}`}>
              <span className={`font-medium text-sm ${config.text}`}>Total {config.label}</span>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-red-600">Appelé: <strong>{formatMontant(fondsData.totalAppele)}</strong></span>
                <span className="text-green-600">Payé: <strong>{formatMontant(fondsData.totalPaye)}</strong></span>
                <span className={`font-bold ${fondsData.solde >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Solde: {formatMontant(fondsData.solde)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header - Non imprimable */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Décompte Annuel {decompte.exercice?.annee}
              </h1>
              <p className="text-gray-600">
                {decompte.proprietaire?.prenom} {decompte.proprietaire?.nom}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Contenu du décompte */}
      <div ref={printRef} className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none print:border-none">
        {/* En-tête document */}
        <div className="p-6 border-b bg-gray-50 print:bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {decompte.immeuble?.nom}
              </h2>
              <p className="text-gray-600">{decompte.immeuble?.adresse}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-2 bg-primary-100 rounded-lg print:bg-gray-100">
                <p className="text-lg font-bold text-primary-700 print:text-gray-800">
                  Décompte {decompte.exercice?.annee}
                </p>
                <p className="text-sm text-primary-600 print:text-gray-600">
                  {formatDate(decompte.exercice?.dateDebut)} - {formatDate(decompte.exercice?.dateFin)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info propriétaire */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {decompte.proprietaire?.prenom} {decompte.proprietaire?.nom}
              </h3>
              <p className="text-sm text-gray-500">
                Appartement {decompte.proprietaire?.appartement} • 
                {decompte.proprietaire?.milliemes}/1000 millièmes ({decompte.proprietaire?.pourcentage}%)
              </p>
            </div>
          </div>
        </div>

        {/* Section A: Report À Nouveau */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">A. Report À Nouveau</h4>
            <span className="text-sm text-gray-500">(Solde exercice {decompte.exercice?.annee - 1})</span>
          </div>
          
          <div className={`p-4 rounded-lg ${ran >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Solde reporté de l'exercice précédent</span>
              <span className={`text-xl font-bold ${ran >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatMontant(ran)}
              </span>
            </div>
            <p className={`text-sm mt-1 ${ran >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {ran >= 0 ? '→ Solde créditeur' : '→ Solde débiteur à régulariser'}
            </p>
          </div>
        </div>

        {/* ✅ Sections B1/B2/B3: Charges récurrentes par type de fonds */}
        {hasChargesRecurrentes && (
          <>
            <FondsSection fondsKey="fondsRoulement" fondsData={decompte.fondsRoulement} />
            <FondsSection fondsKey="fondsReserve" fondsData={decompte.fondsReserve} />
            <FondsSection fondsKey="chargesSpeciales" fondsData={decompte.chargesSpeciales} />
          </>
        )}

        {/* Section C: Charges comptables classiques */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">
              {hasChargesRecurrentes ? 'C' : 'B'}. Charges comptables
            </h4>
          </div>
          
          {decompte.charges?.detail?.length > 0 ? (
            <table className="w-full mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm text-gray-500">Catégorie</th>
                  <th className="text-right py-2 text-sm text-gray-500">Nb factures</th>
                  <th className="text-right py-2 text-sm text-gray-500">Quote-part</th>
                </tr>
              </thead>
              <tbody>
                {decompte.charges.detail.map((charge, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{charge.categorie || 'Autres'}</td>
                    <td className="py-2 text-right text-gray-500">{charge.nb_factures}</td>
                    <td className="py-2 text-right text-red-600">{formatMontant(charge.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic mb-4">Aucune charge comptable enregistrée</p>
          )}
          
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <span className="font-medium text-gray-700">Total des charges comptables</span>
            <span className="text-lg font-bold text-red-600">
              -{formatMontant(decompte.charges?.total)}
            </span>
          </div>
        </div>

        {/* Section D: Versements */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">
              {hasChargesRecurrentes ? 'D' : 'C'}. Versements (Provisions)
            </h4>
          </div>
          
          {decompte.versements?.detail?.length > 0 ? (
            <table className="w-full mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm text-gray-500">Appel</th>
                  <th className="text-center py-2 text-sm text-gray-500">Date</th>
                  <th className="text-right py-2 text-sm text-gray-500">Dû</th>
                  <th className="text-right py-2 text-sm text-gray-500">Payé</th>
                </tr>
              </thead>
              <tbody>
                {decompte.versements.detail.map((versement, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{versement.libelle}</td>
                    <td className="py-2 text-center text-gray-500">{formatDate(versement.date_paiement)}</td>
                    <td className="py-2 text-right text-gray-500">{formatMontant(versement.montant_du)}</td>
                    <td className="py-2 text-right text-green-600">{formatMontant(versement.montant_paye)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic mb-4">Aucun versement enregistré</p>
          )}
          
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="font-medium text-gray-700">Total des versements</span>
            <span className="text-lg font-bold text-green-600">
              +{formatMontant(decompte.versements?.total)}
            </span>
          </div>
        </div>

        {/* Section E: Ajustements */}
        {decompte.ajustements !== 0 && (
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">
                {hasChargesRecurrentes ? 'E' : 'D'}. Ajustements
              </h4>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="font-medium text-gray-700">Régularisations</span>
              <span className={`text-lg font-bold ${decompte.ajustements >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {decompte.ajustements >= 0 ? '+' : ''}{formatMontant(decompte.ajustements)}
              </span>
            </div>
          </div>
        )}

        {/* Section F: Solde Final */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-primary-600" />
            <h4 className="font-semibold text-gray-900">
              {hasChargesRecurrentes 
                ? (decompte.ajustements !== 0 ? 'F' : 'E') 
                : (decompte.ajustements !== 0 ? 'E' : 'D')
              }. Solde Final
            </h4>
          </div>
          
          {/* Calcul détaillé */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Report À Nouveau</span>
              <span className="text-right">{formatMontant(ran)}</span>

              {/* Charges récurrentes si présentes */}
              {hasChargesRecurrentes && (
                <>
                  {decompte.fondsRoulement?.totalAppele > 0 && (
                    <>
                      <span className="text-gray-600 pl-2">- Fonds roulement (appelé)</span>
                      <span className="text-right text-red-600">-{formatMontant(decompte.fondsRoulement.totalAppele)}</span>
                      <span className="text-gray-600 pl-2">+ Fonds roulement (payé)</span>
                      <span className="text-right text-green-600">+{formatMontant(decompte.fondsRoulement.totalPaye)}</span>
                    </>
                  )}
                  {decompte.fondsReserve?.totalAppele > 0 && (
                    <>
                      <span className="text-gray-600 pl-2">- Fonds réserve (appelé)</span>
                      <span className="text-right text-red-600">-{formatMontant(decompte.fondsReserve.totalAppele)}</span>
                      <span className="text-gray-600 pl-2">+ Fonds réserve (payé)</span>
                      <span className="text-right text-green-600">+{formatMontant(decompte.fondsReserve.totalPaye)}</span>
                    </>
                  )}
                  {decompte.chargesSpeciales?.totalAppele > 0 && (
                    <>
                      <span className="text-gray-600 pl-2">- Charges spéciales (appelé)</span>
                      <span className="text-right text-red-600">-{formatMontant(decompte.chargesSpeciales.totalAppele)}</span>
                      <span className="text-gray-600 pl-2">+ Charges spéciales (payé)</span>
                      <span className="text-right text-green-600">+{formatMontant(decompte.chargesSpeciales.totalPaye)}</span>
                    </>
                  )}
                </>
              )}
              
              {decompte.charges?.total > 0 && (
                <>
                  <span className="text-gray-600">- Charges comptables</span>
                  <span className="text-right text-red-600">-{formatMontant(decompte.charges?.total)}</span>
                </>
              )}

              <span className="text-gray-600">+ Versements</span>
              <span className="text-right text-green-600">+{formatMontant(decompte.versements?.total)}</span>
              
              {decompte.ajustements !== 0 && (
                <>
                  <span className="text-gray-600">± Ajustements</span>
                  <span className="text-right">{formatMontant(decompte.ajustements)}</span>
                </>
              )}
              
              <div className="col-span-2 border-t border-gray-300 my-2"></div>
              
              <span className="font-bold">= SOLDE FINAL</span>
              <span className={`text-right font-bold ${soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMontant(soldeFinal)}
              </span>
            </div>
          </div>
          
          {/* Résultat */}
          <div className={`p-6 rounded-xl ${soldeFinal >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-semibold ${soldeFinal >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  Solde {decompte.soldeFinal?.type}
                </p>
                <p className={`text-sm ${soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {decompte.soldeFinal?.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {soldeFinal >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-500" />
                )}
                <span className={`text-3xl font-bold ${soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMontant(soldeFinal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparaison */}
        {decompte.comparaison && (
          <div className="p-6 bg-gray-50 border-t">
            <h4 className="font-medium text-gray-700 mb-3">Comparaison avec l'immeuble</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total charges immeuble</span>
                <p className="font-medium">{formatMontant(decompte.comparaison.totalChargesImmeuble)}</p>
              </div>
              <div>
                <span className="text-gray-500">Votre part</span>
                <p className="font-medium">{decompte.comparaison.partProprietaire}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-gray-100 text-center text-sm text-gray-500 print:bg-white">
          Document généré le {new Date().toLocaleDateString('fr-BE')} à {new Date().toLocaleTimeString('fr-BE')}
        </div>
      </div>

      {/* Styles d'impression */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root { visibility: visible; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:bg-white { background-color: white !important; }
        }
      `}</style>
    </div>
  );
}

export default DecompteAnnuelRAN;
