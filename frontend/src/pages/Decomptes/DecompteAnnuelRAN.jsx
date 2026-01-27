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
  CreditCard
} from 'lucide-react';
import {
  immeublesService,
  exercicesService
} from '../../services/api';
import * as XLSX from 'xlsx';

function DecompteAnnuelRAN() {
  const { immeubleId, exerciceId, proprietaireId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decompte, setDecompte] = useState(null);

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

  const handlePrint = () => {
    window.print();
  };

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
      ['A. REPORT À NOUVEAU (solde exercice précédent)'],
      ['Solde reporté:', formatMontant(decompte.reportANouveau?.solde)],
      ['Type:', decompte.reportANouveau?.type],
      [''],
      ['B. CHARGES DE L\'EXERCICE'],
      ...decompte.charges?.detail?.map(c => [c.categorie, formatMontant(c.total)]) || [],
      ['TOTAL CHARGES:', formatMontant(decompte.charges?.total)],
      [''],
      ['C. VERSEMENTS (PROVISIONS)'],
      ...decompte.versements?.detail?.map(v => [
        v.libelle,
        formatDate(v.date_appel),
        formatMontant(v.montant_du),
        formatMontant(v.montant_paye)
      ]) || [],
      ['TOTAL VERSEMENTS:', formatMontant(decompte.versements?.total)],
      [''],
      ['D. AJUSTEMENTS'],
      ['Ajustements:', formatMontant(decompte.ajustements)],
      [''],
      ['═══════════════════════════════════════════'],
      [''],
      ['E. SOLDE FINAL'],
      ['Calcul:', `${formatMontant(decompte.reportANouveau?.solde)} + ${formatMontant(decompte.versements?.total)} - ${formatMontant(decompte.charges?.total)}`],
      ['SOLDE:', formatMontant(decompte.soldeFinal?.montant)],
      ['Status:', decompte.soldeFinal?.type],
      [''],
      [decompte.soldeFinal?.message],
      [''],
      ['Document généré le:', new Date().toLocaleDateString('fr-BE')]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Décompte');
    
    const filename = `decompte_${decompte.exercice?.annee}_${decompte.proprietaire?.nom}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleExportPDF = () => {
    // Pour un vrai export PDF, utiliser une librairie comme jsPDF ou html2pdf
    // Pour l'instant, on utilise l'impression
    handlePrint();
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

      {/* Contenu du décompte - Imprimable */}
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

        {/* Section B: Charges */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">B. Charges de l'exercice</h4>
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
            <p className="text-gray-500 italic mb-4">Aucune charge enregistrée</p>
          )}
          
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <span className="font-medium text-gray-700">Total des charges</span>
            <span className="text-lg font-bold text-red-600">
              -{formatMontant(decompte.charges?.total)}
            </span>
          </div>
        </div>

        {/* Section C: Versements */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">C. Versements (Provisions)</h4>
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

        {/* Section D: Ajustements (si présents) */}
        {decompte.ajustements !== 0 && (
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">D. Ajustements</h4>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="font-medium text-gray-700">Régularisations</span>
              <span className={`text-lg font-bold ${decompte.ajustements >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {decompte.ajustements >= 0 ? '+' : ''}{formatMontant(decompte.ajustements)}
              </span>
            </div>
          </div>
        )}

        {/* Section E: Solde Final */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-primary-600" />
            <h4 className="font-semibold text-gray-900">E. Solde Final</h4>
          </div>
          
          {/* Calcul détaillé */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 font-mono text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600">Report À Nouveau</span>
              <span className="text-right">{formatMontant(ran)}</span>
              
              <span className="text-gray-600">+ Versements</span>
              <span className="text-right text-green-600">+{formatMontant(decompte.versements?.total)}</span>
              
              <span className="text-gray-600">- Charges</span>
              <span className="text-right text-red-600">-{formatMontant(decompte.charges?.total)}</span>
              
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

        {/* Comparaison avec immeuble */}
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
          body * {
            visibility: hidden;
          }
          #root {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:text-gray-800 {
            color: #1f2937 !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DecompteAnnuelRAN;
