// =====================================================
// 📊 PAGE RÉSULTATS DÉCOMPTE
// frontend/src/components/Eau/pages/ResultatsDecompte.jsx
// VERSION CORRIGÉE AVEC AXIOS
// =====================================================
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Table as TableIcon, Loader } from 'lucide-react';
import { calculerWallonie, calculerBruxelles, calculerFlandre, calculerM3Gratuits } from '../calculs';
import { eauConfigService, compteursEauService, eauRelevesService, proprietairesService } from '../../../services/api';

export default function ResultatsDecompte() {
  const { immeubleId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [compteurs, setCompteurs] = useState([]);
  const [releves, setReleves] = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [totaux, setTotaux] = useState(null);
  const [pertes, setPertes] = useState(null);

  useEffect(() => {
    loadAndCalculate();
  }, [immeubleId]);

  // ✅ CORRIGÉ : loadAndCalculate avec AXIOS
  const loadAndCalculate = async () => {
    try {
      setLoading(true);
      
      // ✅ Charger toutes les données en parallèle avec axios
      const [configRes, compteursRes, relevesRes, propRes] = await Promise.all([
        eauConfigService.getConfig(immeubleId),
        compteursEauService.getByImmeuble(immeubleId),
        eauRelevesService.getReleves(immeubleId),
        proprietairesService.getByImmeuble(immeubleId)
      ]);
      
      const cfg = configRes.data.config;
      const cmpts = compteursRes.data.compteurs || [];
      const rels = relevesRes.data.releves || [];
      const props = propRes.data.proprietaires || [];
      
      setConfig(cfg);
      setCompteurs(cmpts);
      setReleves(rels);
      setProprietaires(props);
      
      // Calculer décomptes
      await calculateDecomptes(cfg, cmpts, rels, props);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDecomptes = async (cfg, cmpts, rels, props) => {
    if (!cfg || cmpts.length === 0 || rels.length === 0) return;
    
    const principal = cmpts.find(c => c.type_compteur === 'principal');
    const divisionnaires = cmpts.filter(c => c.type_compteur === 'divisionnaire');
    
    // Calculer pertes si divisionnaire
    let pertesTotales = 0;
    if (principal && divisionnaires.length > 0) {
      const relevePrincipal = rels.find(r => r.compteur_id === principal.id);
      const consoPrincipal = relevePrincipal?.consommation || 0;
      const sommeDivisionnaires = divisionnaires.reduce((sum, c) => {
        const releve = rels.find(r => r.compteur_id === c.id);
        return sum + (releve?.consommation || 0);
      }, 0);
      
      pertesTotales = consoPrincipal - sommeDivisionnaires;
      
      setPertes({
        total: pertesTotales,
        pourcentage: consoPrincipal > 0 ? (pertesTotales / consoPrincipal) * 100 : 0
      });
    }
    
    // Calculer pour chaque compteur divisionnaire
    const results = [];
    let montantTotal = 0;
    
    for (const compteur of divisionnaires) {
      const releve = rels.find(r => r.compteur_id === compteur.id);
      if (!releve) continue;
      
      const prop = props.find(p => p.id === compteur.proprietaire_id);
      if (!prop) continue;
      
      const consommation = releve.consommation;
      const nombreHabitants = prop.nombre_habitants || 1;
      
      // Calculer m³ gratuits (si Wallonie)
      let m3Gratuits = 0;
      if (cfg.region === 'wallonie') {
        m3Gratuits = calculerM3Gratuits({
          nombre_habitants: nombreHabitants,
          m3_gratuits_par_habitant: cfg.m3_gratuits_par_habitant || 15,
          max_habitants_gratuits: cfg.max_habitants_gratuits || 5
        });
      }
      
      // Part de pertes au prorata
      const partPertes = divisionnaires.length > 0 
        ? (consommation / divisionnaires.reduce((sum, c) => {
            const r = rels.find(rel => rel.compteur_id === c.id);
            return sum + (r?.consommation || 0);
          }, 0)) * pertesTotales
        : 0;
      
      const consommationAvecPertes = consommation + partPertes;
      
      // Calculer selon région
      let calcul;
      if (cfg.region === 'wallonie') {
        calcul = calculerWallonie({
          consommation: consommationAvecPertes,
          tarif_distribution: cfg.tarif_distribution,
          tarif_assainissement: cfg.tarif_assainissement,
          redevance_fixe: cfg.redevance_fixe / divisionnaires.length,
          tva_pourcent: cfg.tva_pourcent,
          m3_gratuits
        });
      } else if (cfg.region === 'bruxelles') {
        calcul = calculerBruxelles({
          consommation: consommationAvecPertes,
          tarif_unique: cfg.tarif_distribution,
          redevance_fixe: cfg.redevance_fixe / divisionnaires.length,
          tva_pourcent: cfg.tva_pourcent,
          m3_gratuits
        });
      } else if (cfg.region === 'flandre') {
        calcul = calculerFlandre({
          consommation: consommationAvecPertes,
          nombre_habitants: nombreHabitants,
          tarif_base: cfg.tarif_base,
          tarif_confort: cfg.tarif_confort,
          m3_base_par_habitant: cfg.m3_base_par_habitant,
          redevance_fixe: cfg.redevance_fixe / divisionnaires.length,
          tva_pourcent: cfg.tva_pourcent,
          m3_gratuits
        });
      }
      
      results.push({
        compteur,
        proprietaire: prop,
        releve,
        consommation_compteur: consommation,
        m3_gratuits,
        part_pertes: partPertes,
        consommation_avec_pertes: consommationAvecPertes,
        calcul,
        montant: calcul.total_ttc
      });
      
      montantTotal += calcul.total_ttc;
    }
    
    setResultats(results);
    setTotaux({
      montant_total: montantTotal,
      consommation_totale: results.reduce((sum, r) => sum + r.consommation_avec_pertes, 0),
      nombre_logements: results.length
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Calcul des décomptes...</p>
        </div>
      </div>
    );
  }

  if (!config || resultats.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            ⚠️ Aucun décompte disponible. Vérifiez que vous avez saisi les relevés.
          </p>
          <button
            onClick={() => navigate(`/immeubles/${immeubleId}/eau/releves`)}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Saisir les relevés
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/immeubles/${immeubleId}/eau`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TableIcon className="h-8 w-8 text-blue-600" />
            Décompte Eau
          </h1>
          <p className="text-gray-600 mt-1">
            {config.region} • {resultats.length} logement{resultats.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Boutons export */}
        <div className="flex gap-2">
          <button
            onClick={() => alert('Export PDF en développement')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={() => alert('Export Excel en développement')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Consommation Totale</p>
          <p className="text-2xl font-bold text-blue-900">
            {totaux?.consommation_totale.toFixed(2)} m³
          </p>
        </div>
        
        {pertes && (
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium mb-1">Pertes</p>
            <p className="text-2xl font-bold text-red-900">
              {pertes.total.toFixed(2)} m³
              <span className="text-sm ml-2">({pertes.pourcentage.toFixed(1)}%)</span>
            </p>
          </div>
        )}
        
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Montant Total</p>
          <p className="text-2xl font-bold text-green-900">
            {totaux?.montant_total.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Tableau décompte */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propriétaire</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compteur</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conso.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">M³ Gratuits</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pertes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {resultats.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.proprietaire.prenom} {r.proprietaire.nom}</div>
                    {r.proprietaire.numero_appartement && (
                      <div className="text-xs text-gray-500">Appt {r.proprietaire.numero_appartement}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{r.compteur.numero_compteur}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.consommation_compteur.toFixed(2)} m³</td>
                  <td className="px-4 py-3 text-right text-green-600">-{r.m3_gratuits.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-red-600">+{r.part_pertes.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.consommation_avec_pertes.toFixed(2)} m³</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-900">{r.montant.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan="6" className="px-4 py-3 text-right font-bold">TOTAL</td>
                <td className="px-4 py-3 text-right text-xl font-bold text-blue-900">
                  {totaux?.montant_total.toFixed(2)} €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Détails calcul (exemple premier résultat) */}
      {resultats.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-xl border p-6">
          <h3 className="font-bold mb-4">Détail du calcul (exemple : {resultats[0].proprietaire.prenom} {resultats[0].proprietaire.nom})</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Consommation compteur</p>
              <p className="font-medium">{resultats[0].consommation_compteur.toFixed(4)} m³</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">M³ gratuits déduits</p>
              <p className="font-medium text-green-600">-{resultats[0].m3_gratuits.toFixed(4)} m³</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Part de pertes (prorata)</p>
              <p className="font-medium text-red-600">+{resultats[0].part_pertes.toFixed(4)} m³</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Consommation facturée</p>
              <p className="font-medium">{resultats[0].calcul.m3_facturables.toFixed(4)} m³</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Sous-total HTVA</p>
              <p className="font-medium">{resultats[0].calcul.sous_total_htva.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">TVA ({config.tva_pourcent}%)</p>
              <p className="font-medium">{resultats[0].calcul.montant_tva.toFixed(2)} €</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-600 mb-1">Total TTC</p>
              <p className="text-xl font-bold text-blue-900">{resultats[0].calcul.total_ttc.toFixed(2)} €</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
