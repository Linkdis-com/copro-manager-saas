import { useState, useEffect } from 'react';
import { 
  Gift, Users, Share2, Copy, Check, Facebook, Linkedin, Twitter, 
  Instagram, Mail, ExternalLink, Award, ChevronRight, Sparkles,
  MessageCircle, Camera, Clock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function ReferralPage() {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [socialShareStatus, setSocialShareStatus] = useState(null);
  const [discounts, setDiscounts] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [shareSubmitted, setShareSubmitted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Charger les données de parrainage
      const [statsRes, shareRes, discountsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/referral/stats`, { headers }),
        fetch(`${API_URL}/api/v1/referral/social-share/status`, { headers }),
        fetch(`${API_URL}/api/v1/referral/my-discounts`, { headers })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setReferralData(data);
      }

      if (shareRes.ok) {
        const data = await shareRes.json();
        setSocialShareStatus(data);
      }

      if (discountsRes.ok) {
        const data = await discountsRes.json();
        setDiscounts(data);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSocialShare = async (platform) => {
    setSelectedPlatform(platform);
    
    // Ouvrir la fenêtre de partage
    const shareUrl = referralData?.link || 'https://copromanager.be';
    const shareText = encodeURIComponent(
      `🏢 Je viens de découvrir Copro Manager, l'outil idéal pour gérer ma copropriété simplement ! Essayez gratuitement pendant 15 jours 👉 ${shareUrl}`
    );

    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${shareText}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${shareText}`;
        break;
      default:
        return;
    }

    // Ouvrir dans une popup
    window.open(url, '_blank', 'width=600,height=400');

    // Enregistrer la demande
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/referral/social-share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform })
      });

      if (res.ok) {
        setShareSubmitted(true);
        loadData(); // Recharger les données
      }
    } catch (error) {
      console.error('Error registering share:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const tiers = [
    { referrals: 1, discount: 30, reached: (referralData?.stats?.totalReferrals || 0) >= 1 },
    { referrals: 3, discount: 50, reached: (referralData?.stats?.totalReferrals || 0) >= 3 },
    { referrals: 5, discount: 100, reached: (referralData?.stats?.totalReferrals || 0) >= 5, label: '1 an gratuit' }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full mb-4">
          <Gift className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Programme de parrainage</h1>
        <p className="text-gray-600 mt-2">
          Parrainez vos amis et économisez jusqu'à <span className="font-bold text-primary-600">1 an gratuit !</span>
        </p>
      </div>

      {/* Réduction actuelle */}
      {discounts?.totalDiscount > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2" />
          <p className="text-lg">Votre réduction actuelle</p>
          <p className="text-4xl font-bold">{discounts.totalDiscount}%</p>
          <p className="text-green-100 mt-1">sur votre première année</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Section Parrainage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Parrainez vos amis</h2>
          </div>

          {/* Lien de parrainage */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre lien de parrainage
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralData?.link || ''}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={() => copyToClipboard(referralData?.link)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Code : <span className="font-mono font-bold">{referralData?.code}</span>
            </p>
          </div>

          {/* Statistiques */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Filleuls parrainés</p>
                <p className="text-3xl font-bold text-gray-900">
                  {referralData?.stats?.totalReferrals || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Réduction gagnée</p>
                <p className="text-3xl font-bold text-primary-600">
                  {referralData?.stats?.currentDiscount || 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Paliers */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Paliers de réduction</p>
            {tiers.map((tier, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                  tier.reached 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tier.reached ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tier.reached ? <Check className="h-4 w-4" /> : tier.referrals}
                  </div>
                  <span className="text-sm">
                    {tier.referrals} parrainage{tier.referrals > 1 ? 's' : ''}
                  </span>
                </div>
                <span className={`font-bold ${tier.reached ? 'text-green-600' : 'text-gray-600'}`}>
                  {tier.label || `${tier.discount}%`}
                </span>
              </div>
            ))}
          </div>

          {/* Prochain palier */}
          {referralData?.stats?.nextTier && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Plus que {referralData.stats.nextTier.referralsNeeded}</span> parrainage{referralData.stats.nextTier.referralsNeeded > 1 ? 's' : ''} pour atteindre{' '}
                <span className="font-bold">{referralData.stats.nextTier.discount}% de réduction !</span>
              </p>
            </div>
          )}

          {/* Liste des filleuls */}
          {referralData?.referrals?.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Vos filleuls</p>
              <div className="space-y-2">
                {referralData.referrals.map((referral, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm">{referral.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(referral.date).toLocaleDateString('fr-BE')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section Partage Social */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Partagez sur les réseaux</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Partagez Copro Manager sur vos réseaux sociaux et obtenez{' '}
            <span className="font-bold text-blue-600">20% de réduction</span> sur votre première année !
          </p>

          {/* Statut du partage */}
          {socialShareStatus?.hasRequested && (
            <div className={`mb-6 p-4 rounded-lg ${
              socialShareStatus.status === 'approved' 
                ? 'bg-green-50 border border-green-200'
                : socialShareStatus.status === 'pending'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {socialShareStatus.status === 'approved' ? (
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                ) : socialShareStatus.status === 'pending' ? (
                  <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                ) : (
                  <MessageCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${
                    socialShareStatus.status === 'approved' 
                      ? 'text-green-800' 
                      : socialShareStatus.status === 'pending'
                        ? 'text-amber-800'
                        : 'text-red-800'
                  }`}>
                    {socialShareStatus.status === 'approved' && '✅ Réduction activée !'}
                    {socialShareStatus.status === 'pending' && '⏳ En attente de vérification'}
                    {socialShareStatus.status === 'rejected' && '❌ Demande rejetée'}
                  </p>
                  <p className="text-sm mt-1">{socialShareStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Boutons de partage */}
          {(!socialShareStatus?.hasRequested || socialShareStatus?.status === 'rejected') && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => handleSocialShare('facebook')}
                  className="flex items-center justify-center gap-2 p-4 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                  Facebook
                </button>
                <button
                  onClick={() => handleSocialShare('linkedin')}
                  className="flex items-center justify-center gap-2 p-4 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                  LinkedIn
                </button>
                <button
                  onClick={() => handleSocialShare('twitter')}
                  className="flex items-center justify-center gap-2 p-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                  X (Twitter)
                </button>
                <button
                  onClick={() => {
                    setSelectedPlatform('instagram');
                    setShareSubmitted(true);
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Instagram className="h-5 w-5" />
                  Instagram
                </button>
              </div>

              {/* Instructions après partage */}
              {shareSubmitted && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Dernière étape !
                  </h3>
                  <ol className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      Faites une capture d'écran de votre publication
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      Envoyez-la par email avec votre adresse de compte
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      Votre réduction sera activée sous 24-48h
                    </li>
                  </ol>
                  
                  <a
                    href="mailto:promo@copromanager.be?subject=Demande réduction partage social&body=Bonjour,%0D%0A%0D%0AJ'ai partagé Copro Manager sur les réseaux sociaux.%0D%0AVoici ma capture d'écran en pièce jointe.%0D%0A%0D%0AMon email de compte : [VOTRE EMAIL]%0D%0A%0D%0AMerci !"
                    className="mt-4 flex items-center justify-center gap-2 w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    Envoyer à promo@copromanager.be
                  </a>
                </div>
              )}
            </>
          )}

          {/* Bonus filleul */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-800">Bonus Filleul</p>
                <p className="text-sm text-purple-700 mt-1">
                  Vos filleuls reçoivent automatiquement <span className="font-bold">20% de réduction</span> sur leur première année quand ils s'inscrivent avec votre lien !
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Comment ça marche */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Comment ça marche ?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-primary-600">1</span>
            </div>
            <h3 className="font-medium text-gray-900">Partagez votre lien</h3>
            <p className="text-sm text-gray-600 mt-1">
              Envoyez votre lien de parrainage à vos amis syndics ou copropriétaires
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-primary-600">2</span>
            </div>
            <h3 className="font-medium text-gray-900">Ils s'inscrivent</h3>
            <p className="text-sm text-gray-600 mt-1">
              Vos amis profitent de 15 jours d'essai gratuit + 20% de réduction
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-primary-600">3</span>
            </div>
            <h3 className="font-medium text-gray-900">Vous économisez</h3>
            <p className="text-sm text-gray-600 mt-1">
              Jusqu'à 1 an gratuit selon le nombre de parrainages !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferralPage;
