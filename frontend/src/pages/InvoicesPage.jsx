import { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle, Clock, AlertCircle, 
  Calendar, Euro, Building2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      // TODO: Générer le PDF à la volée
      alert('Le PDF de cette facture n\'est pas encore disponible.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Payée
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" />
            En attente
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Annulée
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  // Calculer le total payé
  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileText className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mes factures</h1>
        </div>
        <p className="text-gray-600">
          Consultez et téléchargez l'historique de vos factures.
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total factures</p>
              <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Factures payées</p>
              <p className="text-xl font-bold text-gray-900">
                {invoices.filter(i => i.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Euro className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total payé</p>
              <p className="text-xl font-bold text-gray-900">{formatAmount(totalPaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des factures */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
          <p className="text-gray-600">
            Vous n'avez pas encore de factures. Elles apparaîtront ici après votre premier paiement.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-6 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <div>N° Facture</div>
            <div>Date</div>
            <div>Période</div>
            <div>Montant</div>
            <div>Statut</div>
            <div className="text-right">Action</div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                {/* Mobile view */}
                <div className="md:hidden space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-500">{formatDate(invoice.invoice_date)}</p>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        {invoice.plan_name} - {invoice.units_count} unités
                      </p>
                      <p className="font-bold text-gray-900">{formatAmount(invoice.total)}</p>
                    </div>
                    <button
                      onClick={() => downloadInvoice(invoice)}
                      className="flex items-center gap-1 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>

                {/* Desktop view */}
                <div className="hidden md:grid md:grid-cols-6 gap-4 items-center">
                  <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                  <div className="text-gray-600">{formatDate(invoice.invoice_date)}</div>
                  <div className="text-sm text-gray-600">
                    {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{formatAmount(invoice.total)}</p>
                    {invoice.discount_percentage > 0 && (
                      <p className="text-xs text-green-600">-{invoice.discount_percentage}% appliqué</p>
                    )}
                  </div>
                  <div>{getStatusBadge(invoice.status)}</div>
                  <div className="text-right">
                    <button
                      onClick={() => downloadInvoice(invoice)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info adresse facturation */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Adresse de facturation</p>
            <p className="text-sm text-blue-700 mt-1">
              Pour modifier votre adresse de facturation, rendez-vous dans{' '}
              <a href="/settings?tab=profile" className="underline">Paramètres &gt; Profil</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicesPage;
