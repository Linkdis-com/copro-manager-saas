import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  FileText,
  Download,
  Printer,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  UserCircle,
  Coins,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Mail,
  Eye
} from 'lucide-react';
import {
  immeublesService,
  proprietairesService,
  transactionsService
} from '../../services/api';
import * as XLSX from 'xlsx';

// Couleurs pour les propriétaires
const PROPRIETAIRE_COLORS = [
  { border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' },
  { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
];

function DecomptesAnnuels() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [immeuble, setImmeuble] = useState(null);
  const [proprietaires, setProprietaires] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedProprietaires, setExpandedProprietaires] = useState({});
  const [selectedForExport, setSelectedForExport] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const printRef = useRef(null);
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  useEffect(() => {
    loadData();
  }, [immeubleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [immeubleRes, proprietairesRes, transRes] = await Promise.all([
        immeublesService.getOne(immeubleId),
        proprietairesService.getByImmeuble(immeubleId),
        transactionsService.getAll(immeubleId, { limit: 1000 })
      ]);

      setImmeuble(immeubleRes.data.immeuble);
      setProprietaires(proprietairesRes.data.proprietaires || []);
      setTransactions(transRes.data.transactions || []);
      
      // Sélectionner tous les propriétaires par défaut
      setSelectedForExport((proprietairesRes.data.proprietaires || []).map(p => p.id));

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Vérifier si une transaction est des frais
  const isFrais = (transaction) => {
    const description = (transaction.description || transaction.communication || '').toLowerCase();
    return description.includes('frais') ||
      description.includes('non-execute') ||
      description.includes('non execute') ||
      description.includes('participation aux frais');
  };

  // Transactions de l'année sélectionnée
  const transactionsForYear = useMemo(() => {
    return transactions.filter(t => {
      const dateField = t.date_transaction || t.date_comptabilisation || t.created_at;
      if (!dateField) return false;
      return new Date(dateField).getFullYear() === selectedYear;
    });
  }, [transactions, selectedYear]);

  // Calculer les décomptes pour tous les propriétaires
  const decomptes = useMemo(() => {
    const totalParts = proprietaires.reduce((sum, p) => sum + (p.nombre_parts || p.milliemes || 0), 0);
    
    // Totaux globaux
    const totalCharges = transactionsForYear
      .filter(t => t.type === 'charge' && !isFrais(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
    
    const totalFrais = transactionsForYear
      .filter(t => t.type === 'charge' && isFrais(t))
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);
    
    const totalDepots = transactionsForYear
      .filter(t => t.type !== 'charge')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);

    return proprietaires.map((prop, index) => {
      const parts = prop.nombre_parts || prop.milliemes || 0;
      const pourcentage = totalParts > 0 ? (parts / totalParts) : 0;

      const chargesProprietaire = totalCharges * pourcentage;
      const fraisProprietaire = totalFrais * pourcentage;

      // Dépôts du propriétaire
      const depotsProprietaire = transactionsForYear
        .filter(t => {
          if (t.type === 'charge') return false;
          const contrepartie = (t.nom_contrepartie || '').toLowerCase();
          const communication = (t.communication || t.description || '').toLowerCase();
          return contrepartie.includes(prop.nom.toLowerCase()) ||
            communication.includes(prop.nom.toLowerCase());
        })
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.montant || 0)), 0);

      const soldeFinal = depotsProprietaire - chargesProprietaire - fraisProprietaire;

      // Détail des transactions
      const detailTransactions = transactionsForYear.map(t => {
        const isCharge = t.type === 'charge';
        const montantTotal = Math.abs(parseFloat(t.montant || 0));
        
        if (!isCharge) {
          const contrepartie = (t.nom_contrepartie || '').toLowerCase();
          const communication = (t.communication || t.description || '').toLowerCase();
          const isOwn = contrepartie.includes(prop.nom.toLowerCase()) ||
            communication.includes(prop.nom.toLowerCase());
          
          if (!isOwn) return null;
          
          return {
            ...t,
            montantProprietaire: montantTotal,
            type: 'depot',
            displayType: 'Dépôt'
          };
        }

        return {
          ...t,
          montantProprietaire: montantTotal * pourcentage,
          montantTotal,
          type: isFrais(t) ? 'frais' : 'charge',
          displayType: isFrais(t) ? 'Frais' : 'Charge'
        };
      }).filter(Boolean).sort((a, b) => {
        const dateA = new Date(a.date_transaction || a.date_comptabilisation);
        const dateB = new Date(b.date_transaction || b.date_comptabilisation);
        return dateA - dateB;
      });

      return {
        id: prop.id,
        nom: `${prop.prenom || ''} ${prop.nom}`.trim(),
        email: prop.email,
        telephone: prop.telephone,
        adresse: prop.adresse,
        parts,
        totalParts,
        pourcentage: (pourcentage * 100).toFixed(2),
        charges: chargesProprietaire,
        frais: fraisProprietaire,
        depots: depotsProprietaire,
        soldeFinal,
        statut: soldeFinal >= 0 ? 'a_jour' : 'attention',
        transactions: detailTransactions,
        color: PROPRIETAIRE_COLORS[index % PROPRIETAIRE_COLORS.length]
      };
    });
  }, [proprietaires, transactionsForYear]);

  // Totaux globaux
  const totaux = useMemo(() => {
    return decomptes.reduce((acc, d) => ({
      charges: acc.charges + d.charges,
      frais: acc.frais + d.frais,
      depots: acc.depots + d.depots,
      soldeFinal: acc.soldeFinal + d.soldeFinal
    }), { charges: 0, frais: 0, depots: 0, soldeFinal: 0 });
  }, [decomptes]);

  // Formatage
  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-BE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant || 0) + ' €';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-BE');
  };

  // Toggle expansion
  const toggleExpand = (propId) => {
    setExpandedProprietaires(prev => ({
      ...prev,
      [propId]: !prev[propId]
    }));
  };

  // Toggle sélection pour export
  const toggleSelect = (propId) => {
    setSelectedForExport(prev => 
      prev.includes(propId)
        ? prev.filter(id => id !== propId)
        : [...prev, propId]
    );
  };

  const selectAll = () => {
    setSelectedForExport(decomptes.map(d => d.id));
  };

  const selectNone = () => {
    setSelectedForExport([]);
  };

  // Export Excel global
  const exportExcelAll = () => {
    const wb = XLSX.utils.book_new();
    
    // Résumé général
    const summaryData = [
      ['DÉCOMPTE ANNUEL - ' + immeuble?.nom],
      ['Année: ' + selectedYear],
      [''],
      ['Propriétaire', 'Millièmes', '%', 'Charges', 'Frais', 'Dépôts', 'Solde', 'Statut']
    ];
    
    decomptes.forEach(d => {
      if (selectedForExport.includes(d.id)) {
        summaryData.push([
          d.nom,
          `${d.parts}/${d.totalParts}`,
          d.pourcentage + '%',
          formatMontant(d.charges),
          formatMontant(d.frais),
          formatMontant(d.depots),
          formatMontant(d.soldeFinal),
          d.statut === 'a_jour' ? 'À jour' : 'Attention'
        ]);
      }
    });
    
    summaryData.push([]);
    summaryData.push(['TOTAUX', '', '', formatMontant(totaux.charges), formatMontant(totaux.frais), formatMontant(totaux.depots), formatMontant(totaux.soldeFinal)]);
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');
    
    // Feuille détaillée par propriétaire
    decomptes.forEach(d => {
      if (selectedForExport.includes(d.id)) {
        const propData = [
          [`DÉCOMPTE ${selectedYear} - ${d.nom}`],
          [`Millièmes: ${d.parts}/${d.totalParts} (${d.pourcentage}%)`],
          [''],
          ['Date', 'Description', 'Type', 'Total', 'Quote-part']
        ];
        
        d.transactions.forEach(t => {
          propData.push([
            formatDate(t.date_transaction || t.date_comptabilisation),
            t.description || t.communication || '-',
            t.displayType,
            t.montantTotal ? formatMontant(t.montantTotal) : '-',
            (t.type === 'depot' ? '+' : '-') + formatMontant(t.montantProprietaire)
          ]);
        });
        
        propData.push([]);
        propData.push(['', '', '', 'Charges:', formatMontant(d.charges)]);
        propData.push(['', '', '', 'Frais:', formatMontant(d.frais)]);
        propData.push(['', '', '', 'Dépôts:', formatMontant(d.depots)]);
        propData.push(['', '', '', 'SOLDE:', formatMontant(d.soldeFinal)]);
        
        const ws = XLSX.utils.aoa_to_sheet(propData);
        const sheetName = d.nom.substring(0, 31).replace(/[\\\/\*\?\[\]]/g, '');
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });
    
    XLSX.writeFile(wb, `decomptes_${immeuble?.nom}_${selectedYear}.xlsx`);
  };

  // Export PDF (impression)
  const printDecomptes = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">{error}</h3>
      </div>
    );
  }

  const nbAJour = decomptes.filter(d => d.statut === 'a_jour').length;
  const nbAttention = decomptes.filter(d => d.statut === 'attention').length;

  return (
    <div className="space-y-6">
      {/* Styles pour impression */}
      <style>{`
        @media screen {
          #print-area { display: none; }
        }
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          #print-area { display: block !important; }
          .print-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/immeubles/${immeubleId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Décomptes Annuels</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {immeuble?.nom}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white font-semibold text-primary-700"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 no-print">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Propriétaires</p>
          <p className="text-2xl font-bold text-gray-900">{decomptes.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Total Charges</p>
          <p className="text-xl font-bold text-red-600">{formatMontant(totaux.charges)}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Total Dépôts</p>
          <p className="text-xl font-bold text-green-600">{formatMontant(totaux.depots)}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">À jour</p>
          <p className="text-2xl font-bold text-green-600">{nbAJour}</p>
        </div>
        <div className="bg-amber-50 rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Attention</p>
          <p className="text-2xl font-bold text-amber-600">{nbAttention}</p>
        </div>
      </div>

      {/* Actions d'export */}
      <div className="bg-white rounded-lg shadow p-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedForExport.length}/{decomptes.length} sélectionnés
            </span>
            <button onClick={selectAll} className="text-sm text-primary-600 hover:text-primary-700">
              Tout sélectionner
            </button>
            <button onClick={selectNone} className="text-sm text-gray-500 hover:text-gray-700">
              Aucun
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportExcelAll}
              disabled={selectedForExport.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={printDecomptes}
              disabled={selectedForExport.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimer PDF
            </button>
          </div>
        </div>
      </div>

      {/* Liste des décomptes */}
      <div className="space-y-4 no-print">
        {decomptes.map((decompte) => (
          <div
            key={decompte.id}
            className={`bg-white rounded-lg shadow overflow-hidden ${
              decompte.soldeFinal < 0 ? 'border-l-4 border-red-500' : ''
            }`}
          >
            {/* En-tête du décompte */}
            <div className="p-4 flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedForExport.includes(decompte.id)}
                onChange={() => toggleSelect(decompte.id)}
                className="h-5 w-5 text-primary-600 rounded"
              />
              
              <div
                className={`w-1 h-12 rounded ${decompte.color.border.replace('border-l-', 'bg-')}`}
              ></div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{decompte.nom}</h3>
                  {decompte.statut === 'a_jour' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {decompte.parts}/{decompte.totalParts} millièmes ({decompte.pourcentage}%)
                </p>
              </div>
              
              <div className="text-right">
                <p className={`text-xl font-bold ${decompte.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMontant(decompte.soldeFinal)}
                </p>
                <p className="text-xs text-gray-500">Solde {selectedYear}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/immeubles/${immeubleId}/proprietaires/${decompte.id}`)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  title="Voir le détail"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => toggleExpand(decompte.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  {expandedProprietaires[decompte.id] ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Détail expandable */}
            {expandedProprietaires[decompte.id] && (
              <div className="border-t bg-gray-50 p-4">
                {/* Résumé */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-xs text-gray-500">Charges</p>
                    <p className="font-bold text-red-600">{formatMontant(decompte.charges)}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-xs text-gray-500">Frais</p>
                    <p className="font-bold text-amber-600">{formatMontant(decompte.frais)}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-xs text-gray-500">Dépôts</p>
                    <p className="font-bold text-green-600">{formatMontant(decompte.depots)}</p>
                  </div>
                  <div className={`text-center p-2 rounded ${decompte.soldeFinal >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="text-xs text-gray-500">Solde</p>
                    <p className={`font-bold ${decompte.soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMontant(decompte.soldeFinal)}
                    </p>
                  </div>
                </div>
                
                {/* Transactions */}
                {decompte.transactions.length > 0 && (
                  <div className="bg-white rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Quote-part</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {decompte.transactions.slice(0, 10).map((t, idx) => (
                          <tr key={idx} className={
                            t.type === 'depot' ? 'bg-green-50/50' :
                            t.type === 'frais' ? 'bg-amber-50/50' : 'bg-red-50/50'
                          }>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                              {formatDate(t.date_transaction || t.date_comptabilisation)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="truncate block max-w-xs" title={t.description || t.communication}>
                                {t.description || t.communication || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 text-xs rounded ${
                                t.type === 'depot' ? 'bg-green-500 text-white' :
                                t.type === 'frais' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                              }`}>
                                {t.displayType}
                              </span>
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${
                              t.type === 'depot' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {t.type === 'depot' ? '+' : '-'}{formatMontant(t.montantProprietaire)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {decompte.transactions.length > 10 && (
                      <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                        +{decompte.transactions.length - 10} autres transactions
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Zone d'impression */}
      <div id="print-area">
        {/* Page de garde */}
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{immeuble?.nom}</h1>
            <p className="text-gray-600">{immeuble?.adresse}</p>
            <div className="mt-6 inline-block px-6 py-2 bg-primary-100 rounded-lg">
              <p className="text-2xl font-bold text-primary-700">Décomptes de charges {selectedYear}</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Résumé général</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Propriétaire</th>
                  <th className="border p-2 text-center">Millièmes</th>
                  <th className="border p-2 text-right">Charges</th>
                  <th className="border p-2 text-right">Dépôts</th>
                  <th className="border p-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {decomptes.filter(d => selectedForExport.includes(d.id)).map(d => (
                  <tr key={d.id}>
                    <td className="border p-2">{d.nom}</td>
                    <td className="border p-2 text-center">{d.parts}/{d.totalParts}</td>
                    <td className="border p-2 text-right">{formatMontant(d.charges + d.frais)}</td>
                    <td className="border p-2 text-right">{formatMontant(d.depots)}</td>
                    <td className={`border p-2 text-right font-bold ${d.soldeFinal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatMontant(d.soldeFinal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td className="border p-2">TOTAUX</td>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-right">{formatMontant(totaux.charges + totaux.frais)}</td>
                  <td className="border p-2 text-right">{formatMontant(totaux.depots)}</td>
                  <td className={`border p-2 text-right ${totaux.soldeFinal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatMontant(totaux.soldeFinal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>Document généré le {new Date().toLocaleDateString('fr-BE')}</p>
          </div>
        </div>

        {/* Pages individuelles */}
        {decomptes.filter(d => selectedForExport.includes(d.id)).map((decompte, idx) => (
          <div key={decompte.id} className={idx > 0 ? 'print-break' : ''}>
            <div className="p-8 print-avoid-break">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{decompte.nom}</h2>
                  <p className="text-gray-600">{decompte.parts}/{decompte.totalParts} millièmes ({decompte.pourcentage}%)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Décompte {selectedYear}</p>
                  <p className="text-xl font-bold">{immeuble?.nom}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6 text-center">
                <div className="p-3 bg-gray-100 rounded">
                  <p className="text-xs text-gray-500">Charges</p>
                  <p className="font-bold">{formatMontant(decompte.charges)}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  <p className="text-xs text-gray-500">Frais</p>
                  <p className="font-bold">{formatMontant(decompte.frais)}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded">
                  <p className="text-xs text-gray-500">Dépôts</p>
                  <p className="font-bold">{formatMontant(decompte.depots)}</p>
                </div>
                <div className={`p-3 rounded ${decompte.soldeFinal >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className="text-xs text-gray-500">Solde</p>
                  <p className={`font-bold ${decompte.soldeFinal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatMontant(decompte.soldeFinal)}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-center">Type</th>
                    <th className="border p-2 text-right">Total</th>
                    <th className="border p-2 text-right">Quote-part</th>
                  </tr>
                </thead>
                <tbody>
                  {decompte.transactions.map((t, tidx) => (
                    <tr key={tidx}>
                      <td className="border p-1">{formatDate(t.date_transaction || t.date_comptabilisation)}</td>
                      <td className="border p-1 max-w-xs truncate">{t.description || t.communication || '-'}</td>
                      <td className="border p-1 text-center">{t.displayType}</td>
                      <td className="border p-1 text-right">{t.montantTotal ? formatMontant(t.montantTotal) : '-'}</td>
                      <td className={`border p-1 text-right font-medium ${t.type === 'depot' ? 'text-green-700' : 'text-red-700'}`}>
                        {t.type === 'depot' ? '+' : '-'}{formatMontant(t.montantProprietaire)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="4" className="border p-2 text-right">SOLDE FINAL</td>
                    <td className={`border p-2 text-right ${decompte.soldeFinal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatMontant(decompte.soldeFinal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DecomptesAnnuels;