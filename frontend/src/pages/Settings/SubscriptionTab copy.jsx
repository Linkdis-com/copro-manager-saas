import { useState, useEffect } from 'react';
import { 
  CreditCard, Building2, Users, Calendar, ArrowRight, 
  AlertCircle, CheckCircle, Gift, FileText, Percent
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

function SubscriptionTab() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ immeubles: 0, unites: 0 });
  const [discounts, setDiscounts] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Charger les données en parallèle
      const [subRes, plansRes, discountsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/subscription/current`, { headers }),
        fetch(`${API_URL}/api/v1/plans`, { headers }),
        fetch(`${API_URL}/api/v1/referral/my-discounts`, { headers })
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data.subscription);
        setUsage(data.usage || { immeubles: 0, unites: 0 });
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }

      if (discountsRes.ok) {
        const data = await discountsRes.json();
        setDiscounts(data.discounts || []);
      }

    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculer le prix
  const calculatePrice = () => {
    if (!subscription?.plan) return { base: 0, discount: 0, vat: 0, total: 0 };

    const plan = subscription.plan;
    const units = usage.unites || 0;
    const pricePerUnit = parseFloat(plan.price_per_unit) || 0;
    const discountPercent = discounts.length > 0 
      ? Math.max(...discounts.map(d => d.percentage))
      : 0;

    const baseYearly = units * pricePerUnit * 12;
    const discountAmount = baseYearly * (discountPercent / 100);
    const subtotal = baseYearly - discountAmount;
    const vatRate = plan.is_professional ? 21 : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    return {
      units,
      pricePerUnit,
      baseYearly,
      discountPercent,
      discountAmount,
      subtotal,
      vatRate,
      vatAmount,
      total
    };
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-BE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status, trialEnd) => {
    if (status === 'trialing') {
      const daysLeft = trialEnd 
        ? Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24))
        : 0;
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          <Calendar className="h-4 w-4" />
          Essai gratuit ({daysLeft > 0 ? `${daysLeft} jours restants` : 'Expiré'})
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Actif
        </span>
      );
    }
    if (status === 'expired' || status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          <AlertCircle className="h-4 w-4" />
          {status === 'expired' ? 'Expiré' : 'Annulé'}
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const pricing = calculatePrice();
  const plan = subscription?.plan;
  const maxImmeubles = plan?.max_immeubles === -1 ? 'Illimité' : plan?.max_immeubles;

  return (
    <div className="space-y-6">
      {/* Plan actuel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary-600" />
            Votre abonnement
          </h2>
          {subscription && getStatusBadge(subscription.status, subscription.trial_end)}
        </div>

        {subscription ? (
          <div className="space-y-4">
            {/* Nom du plan */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${plan?.is_professional ? 'bg-purple-100' : 'bg-blue-100'}`}>
                <Building2 className={`h-6 w-6 ${plan?.is_professional ? 'text-purple-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">Plan {plan?.name}</p>
                <p className="text-gray-600">
                  {plan?.is_professional 
                    ? `${plan?.price_per_unit}€ HTVA/unité/mois + 21% TVA`
                    : `${plan?.price_per_unit}€ TTC/unité/mois`
                  }
                </p>
              </div>
            </div>

            {/* Alerte si essai expiré */}
            {subscription.status === 'trialing' && subscription.trial_end && new Date(subscription.trial_end) < new Date() && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Votre période d'essai est terminée</p>
                    <p className="text-sm text-red-700 mt-1">
                      Abonnez-vous pour continuer à utiliser toutes les fonctionnalités.
                    </p>
                    <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                      S'abonner maintenant
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Date de renouvellement */}
            {subscription.status === 'active' && subscription.current_period_end && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Renouvellement le {formatDate(subscription.current_period_end)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">Aucun abonnement actif</p>
        )}
      </div>

      {/* Utilisation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Votre utilisation</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">Immeubles</span>
              </div>
              <span className="font-bold text-gray-900">
                {usage.immeubles} / {maxImmeubles}
              </span>
            </div>
            {plan?.max_immeubles === 1 && usage.immeubles >= 1 && (
              <p className="text-xs text-amber-600 mt-2">
                Limite atteinte. Passez en Pro pour gérer plusieurs immeubles.
              </p>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">Unités (lots)</span>
              </div>
              <span className="font-bold text-gray-900">{usage.unites}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarif calculé */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Votre tarif annuel</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>{pricing.units} unités × {formatAmount(pricing.pricePerUnit)}/mois × 12</span>
            <span>{formatAmount(pricing.baseYearly)}</span>
          </div>
          
          {pricing.discountPercent > 0 && (
            <div className="flex justify-between text-green-600">
              <span className="flex items-center gap-1">
                <Percent className="h-4 w-4" />
                Réduction ({pricing.discountPercent}%)
              </span>
              <span>-{formatAmount(pricing.discountAmount)}</span>
            </div>
          )}
          
          {plan?.is_professional && (
            <>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-gray-600">
                <span>Sous-total HTVA</span>
                <span>{formatAmount(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>TVA ({pricing.vatRate}%)</span>
                <span>{formatAmount(pricing.vatAmount)}</span>
              </div>
            </>
          )}
          
          <div className="border-t-2 border-gray-900 pt-3 flex justify-between">
            <span className="font-bold text-gray-900">Total TTC / an</span>
            <span className="text-xl font-bold text-primary-600">{formatAmount(pricing.total)}</span>
          </div>
        </div>
      </div>

      {/* Réductions actives */}
      {discounts.length > 0 && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Vos réductions actives
          </h2>
          
          <div className="space-y-2">
            {discounts.map((discount, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{discount.reason || discount.type}</p>
                  {discount.expires_at && (
                    <p className="text-xs text-gray-500">
                      Expire le {formatDate(discount.expires_at)}
                    </p>
                  )}
                </div>
                <span className="font-bold text-green-600">-{discount.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparaison des plans */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparer les plans</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Plan Particulier */}
          <div className={`p-4 rounded-xl border-2 ${
            plan?.code === 'particulier' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-gray-900">Particulier</h3>
              {plan?.code === 'particulier' && (
                <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">Actuel</span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-3">
              2€ <span className="text-sm font-normal text-gray-500">TTC/unité/mois</span>
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                1 immeuble
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Décomptes eau illimités
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Export PDF
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Support email
              </li>
            </ul>
            {plan?.code !== 'particulier' && (
              <button className="mt-4 w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                Changer de plan
              </button>
            )}
          </div>

          {/* Plan Professionnel */}
          <div className={`p-4 rounded-xl border-2 ${
            plan?.code === 'professionnel' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-gray-900">Professionnel</h3>
              {plan?.code === 'professionnel' && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">Actuel</span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-3">
              4€ <span className="text-sm font-normal text-gray-500">HTVA/unité/mois</span>
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Multi-immeubles
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                TVA récupérable
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Tout le plan Particulier
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Support prioritaire
              </li>
            </ul>
            {plan?.code !== 'professionnel' && (
              <button className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                Passer en Pro
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lien vers factures */}
      <Link 
        to="/settings/invoices" 
        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Voir mes factures</span>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400" />
      </Link>
    </div>
  );
}

export default SubscriptionTab;
