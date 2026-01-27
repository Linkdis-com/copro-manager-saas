import { useState } from 'react';
import { relevesService } from '../../services/api';
import { Download, Upload, FileDown, AlertCircle, FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function ExportImportReleves({ decompteId, repartitions, onImportSuccess }) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  // Export CSV des répartitions
  const handleExportCSV = () => {
    if (!repartitions || repartitions.length === 0) {
      alert('Aucune répartition à exporter');
      return;
    }

    const headers = [
      'Locataire/Propriétaire',
      'Habitants',
      'Consommation (m³)',
      'M³ gratuits',
      'M³ facturés',
      'Montant eau (€)',
      'Assainissement (€)',
      'Redevance (€)',
      'TVA (€)',
      'Total TTC (€)'
    ];

const rows = repartitions.map(r => [
  r.locataire_nom ? `${r.locataire_prenom} ${r.locataire_nom}` : 
  r.proprietaire_nom ? `${r.proprietaire_prenom} ${r.proprietaire_nom}` : 'Non assigné',
  r.habitants,
  r.m3_consommes,
  r.m3_gratuits || 0,
parseFloat(r.montant_eau || 0).toFixed(2),
parseFloat(r.montant_assainissement || 0).toFixed(2),
parseFloat(r.montant_redevance_fixe || 0).toFixed(2),
parseFloat(r.montant_tva || 0).toFixed(2),
parseFloat(r.montant_total_ttc || 0).toFixed(2)
]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repartitions_eau_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Excel (CSV compatible Excel)
  const handleExportExcel = () => {
    if (!repartitions || repartitions.length === 0) {
      alert('Aucune répartition à exporter');
      return;
    }

    const headers = [
      'Locataire/Propriétaire',
      'Habitants',
      'Consommation (m³)',
      'M³ gratuits',
      'M³ facturés',
      'Montant eau (€)',
      'Assainissement (€)',
      'Redevance (€)',
      'TVA (€)',
      'Total TTC (€)'
    ];

    const rows = repartitions.map(r => [
  r.locataire_nom ? `${r.locataire_prenom} ${r.locataire_nom}` : 
  r.proprietaire_nom ? `${r.proprietaire_prenom} ${r.proprietaire_nom}` : 'Non assigné',
  r.habitants,
  r.m3_consommes,
  r.m3_gratuits || 0,
  parseFloat(r.montant_eau || 0).toFixed(2),
  parseFloat(r.montant_assainissement || 0).toFixed(2),
  parseFloat(r.montant_redevance_fixe || 0).toFixed(2),
  parseFloat(r.montant_tva || 0).toFixed(2),
  parseFloat(r.montant_total_ttc || 0).toFixed(2)
]);

    // Total
    const total = repartitions.reduce((sum, r) => sum + parseFloat(r.montant_total_ttc), 0);
    rows.push(['', '', '', '', '', '', '', '', 'TOTAL:', total.toFixed(2)]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repartitions_eau_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF des répartitions
  const handleExportPDF = () => {
    if (!repartitions || repartitions.length === 0) {
      alert('Aucune répartition à exporter');
      return;
    }

    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(16);
    doc.text('Répartitions Eau', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

    // Table
    const headers = [
      'Occupant',
      'Hab.',
      'Conso\n(m³)',
      'Gratuits\n(m³)',
      'Eau\n(€)',
      'Assain.\n(€)',
      'Redev.\n(€)',
      'TVA\n(€)',
      'Total TTC\n(€)'
    ];

    const rows = repartitions.map(r => [
  r.locataire_nom ? `${r.locataire_prenom} ${r.locataire_nom}` : 
  r.proprietaire_nom ? `${r.proprietaire_prenom} ${r.proprietaire_nom}` : 'Non assigné',
  r.habitants,
  r.m3_consommes,
  r.m3_gratuits || 0,
  parseFloat(r.montant_eau || 0).toFixed(2),
  parseFloat(r.montant_assainissement || 0).toFixed(2),
  parseFloat(r.montant_redevance_fixe || 0).toFixed(2),
  parseFloat(r.montant_tva || 0).toFixed(2),
  parseFloat(r.montant_total_ttc || 0).toFixed(2)
]);

    // Total
    const total = repartitions.reduce((sum, r) => sum + parseFloat(r.montant_total_ttc), 0);
    rows.push(['TOTAL', '', '', '', '', '', '', '', total.toFixed(2)]);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`repartitions_eau_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Télécharger template CSV pour import
  const handleDownloadTemplate = async () => {
    try {
      const res = await relevesService.getTemplate(decompteId);
      const template = res.data.template;

      const csv = [template.headers, ...template.rows.map(r => [
        r.numeroCompteur,
        r.occupant,
        r.emplacement,
        '', // Index Précédent (à remplir)
        '', // Index Actuel (à remplir)
        ''  // Notes
      ])]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_releves_${template.immeuble.replace(/\s+/g, '_')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('Erreur lors du téléchargement du template');
    }
  };

  // Import CSV des relevés
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        if (!headers.includes('Index Précédent') || !headers.includes('Index Actuel')) {
          setError('Format CSV invalide. Téléchargez et utilisez le template fourni.');
          setImporting(false);
          return;
        }

        const releves = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          if (values.length < headers.length) continue;

          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });

          const indexPrecedent = parseFloat(row['Index Précédent']);
          const indexActuel = parseFloat(row['Index Actuel']);

          if (isNaN(indexPrecedent) || isNaN(indexActuel)) continue;

          releves.push({
            numeroCompteur: row['Numéro Compteur'],
            indexPrecedent,
            indexActuel,
            notes: row['Notes'] || ''
          });
        }

        if (releves.length === 0) {
          setError('Aucun relevé valide trouvé dans le fichier');
          setImporting(false);
          return;
        }

        await relevesService.bulkImport(decompteId, releves);
        alert(`✅ ${releves.length} relevé(s) importé(s) avec succès`);
        if (onImportSuccess) onImportSuccess();
      } catch (err) {
        console.error('Error importing CSV:', err);
        setError(err.response?.data?.message || 'Erreur lors de l\'import');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Export des Répartitions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Exporter les répartitions
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPDF}
            disabled={!repartitions || repartitions.length === 0}
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!repartitions || repartitions.length === 0}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!repartitions || repartitions.length === 0}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="h-4 w-4 mr-2" />
            CSV
          </button>
        </div>
      </div>

      {/* Import des Relevés */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <Upload className="h-4 w-4 mr-2" />
          Importer les relevés (CSV)
        </h4>
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            1. Téléchargez le template CSV pré-rempli<br/>
            2. Complétez les index dans Excel<br/>
            3. Sauvegardez et importez le fichier
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Télécharger le template
            </button>
            <label className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Import en cours...' : 'Importer le CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportImportReleves;
