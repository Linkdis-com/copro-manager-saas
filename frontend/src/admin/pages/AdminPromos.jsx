import { useState, useEffect } from 'react';
import { 
  Plus, Search, Tag, Share2, Users, CheckCircle, 
  XCircle, Eye, Copy, Calendar, Gift, Image as ImageIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

function AdminPromos() {
  const [activeTab, setActiveTab] = useState('promos'); // promos, referrals, social
  const [promos, setPromos] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [socialRequests, setSocialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      
      if (activeTab === 'promos') {
        const res = await fetch(`${API_URL}/api/v1/admin/promos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPromos(data.promos || []);
        }
      } else if (activeTab === 'referrals') {
        const res = await fetch(`${API_URL}/api/v1/admin/referrals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReferrals(data.referrals || []);
        }
      } else if (activeTab === 'social') {
        const res = await fetch(`${API_URL}/api/v1/admin/social-shares`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSocialRequests(data.requests || []);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`✅ Code "${code}" copié`);
  };

  const handleApproveSocialShare = async (requestId) => {
    if (!confirm('Approuver ce partage social ?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/v1/admin/social-shares/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('✅ Partage approuvé - Réduction de 20% activée');
        loadData();
      } else {
        alert('❌ Erreur lors de l\'approbation');
      }
    } catch (error) {
      alert('❌ Erreur serveur');
    }
  };

  const handleRejectSocialShare = async (requestId) => {
    const reason = prompt('Raison du rejet (facultatif):');
    
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/api/v1/admin/social-shares/${requestId}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (res.ok) {
        alert('❌ Partage rejeté');
        loadData();
      }
    } catch (error) {
      alert('❌ Erreur serveur');
    }
  };

  const getReferralTier = (count) => {
    if (count >= 5) return { label: '1 AN GRATUIT', color: 'text-purple-600', discount: 100 };
    if (count >= 3) return { label: '50% 1ère année', color: 'text-green-600', discount: 50 };
    if (count >= 1) return { label: '30% 1ère année', color: 'text-blue-600', discount: 30 };
    return { label: 'Aucun parrainage', color: 'text-gray-500', discount: 0 };
  };

  const filteredData = () => {
    if (activeTab === 'promos') {
      return promos.filter(p => 
        p.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else if (activeTab === 'referrals') {
      return referrals.filter(r => 
        r.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return socialRequests.filter(s => 
        s.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Marketing & Promotions</h2>
        <p className="text-sm text-gray-600 mt-1">
          Gérez les codes promo, parrainages et partages sociaux
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('promos')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'promos'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Tag className="h-4 w-4" />
          Codes promo
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'referrals'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-4 w-4" />
          Parrainages
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'social'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Share2 className="h-4 w-4" />
          Partages sociaux
          {socialRequests.filter(s => s.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
              {socialRequests.filter(s => s.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'promos' ? 'Rechercher un code...' :
              activeTab === 'referrals' ? 'Rechercher un parrain...' :
              'Rechercher une demande...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'promos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Codes promo classiques</h3>
            <button
              onClick={() => alert('Créer un code promo - À implémenter')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Plus className="h-5 w-5" />
              Nouveau code
            </button>
          </div>

          {filteredData().length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun code promo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData().map((promo) => (
                <div key={promo.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Gift className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-semibold text-gray-900">
                          {promo.code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {promo.discount_value}% de réduction
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {promo.current_uses || 0} utilisations
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Programme de parrainage
          </h3>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 font-medium">Paliers de réduction :</p>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              <p>• 1 filleul = <strong>30% 1ère année</strong></p>
              <p>• 3 filleuls = <strong>50% 1ère année</strong></p>
              <p>• 5+ filleuls = <strong>1 AN GRATUIT</strong></p>
              <p className="text-xs text-blue-600 mt-2">+ Filleul reçoit automatiquement 20%</p>
            </div>
          </div>

          {filteredData().length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun parrainage actif</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData().map((referral) => {
                const tier = getReferralTier(referral.successful_referrals);
                return (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{referral.user_email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs font-mono bg-white px-2 py-1 rounded border">
                            ref={referral.referral_code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(`https://copromanager.be/inscription?ref=${referral.referral_code}`)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copier le lien"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tier.color}`}>
                        {tier.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {referral.successful_referrals} filleul{referral.successful_referrals > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'social' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Demandes de partage social (20% réduction)
          </h3>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-900">
              Les utilisateurs doivent partager sur FB/LinkedIn/Twitter/Instagram et envoyer un screenshot à <strong>promo@copromanager.be</strong>
            </p>
          </div>

          {filteredData().length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune demande de partage</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredData().map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{request.user_email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Plateforme: {request.platform} • {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      request.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      request.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {request.status === 'pending' ? 'En attente' :
                       request.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  </div>

                  {request.screenshot_url && (
                    <div className="mb-3">
                      <a
                        href={request.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Voir le screenshot
                      </a>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleApproveSocialShare(request.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approuver
                      </button>
                      <button
                        onClick={() => handleRejectSocialShare(request.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </button>
                    </div>
                  )}

                  {request.status === 'rejected' && request.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">
                      Raison: {request.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPromos;
