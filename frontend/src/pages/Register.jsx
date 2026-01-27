import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, User, Mail, Lock, Eye, EyeOff, CheckCircle, 
  AlertCircle, Gift, Briefcase, Home, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    accountType: 'particulier', // 'particulier' ou 'professionnel'
    companyName: '',
    vatNumber: '',
    vatCountry: 'BE',
    acceptTerms: false
  });
  
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState(null);
  const [referrerName, setReferrerName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vatError, setVatError] = useState('');

  // Détecter le code parrainage dans l'URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      checkReferralCode(refCode);
    }
  }, [searchParams]);

  // Vérifier le code parrainage
  const checkReferralCode = async (code) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/referral/check/${code}`);
      const data = await res.json();
      
      if (data.valid) {
        setReferralValid(true);
        setReferrerName(data.referrerName);
      } else {
        setReferralValid(false);
        setReferrerName('');
      }
    } catch (error) {
      console.error('Error checking referral code:', error);
      setReferralValid(false);
    }
  };

  // Valider le numéro TVA
  const validateVatNumber = (country, number) => {
    if (!number) return true; // Pas obligatoire si pas Pro
    
    const cleanNumber = number.replace(/[\s.]/g, '').toUpperCase();
    const fullVat = `${country}${cleanNumber}`;
    
    const patterns = {
      'BE': /^BE[0-9]{10}$/,
      'FR': /^FR[A-Z0-9]{2}[0-9]{9}$/,
      'DE': /^DE[0-9]{9}$/,
      'NL': /^NL[0-9]{9}B[0-9]{2}$/,
      'LU': /^LU[0-9]{8}$/,
      'IT': /^IT[0-9]{11}$/,
      'ES': /^ES[A-Z0-9]{9}$/
    };

    const pattern = patterns[country];
    if (!pattern) return true; // Pays non validé, on laisse passer
    
    return pattern.test(fullVat);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Valider TVA en temps réel si Pro
    if (name === 'vatNumber' || name === 'vatCountry') {
      const country = name === 'vatCountry' ? value : formData.vatCountry;
      const number = name === 'vatNumber' ? value : formData.vatNumber;
      
      if (formData.accountType === 'professionnel' && number) {
        if (!validateVatNumber(country, number)) {
          setVatError('Format de TVA invalide pour ce pays');
        } else {
          setVatError('');
        }
      } else {
        setVatError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validations
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions générales');
      setLoading(false);
      return;
    }

    // Validation Pro
    if (formData.accountType === 'professionnel') {
      if (!formData.companyName) {
        setError('Le nom de la société est obligatoire pour le plan Professionnel');
        setLoading(false);
        return;
      }
      if (!formData.vatNumber) {
        setError('Le numéro de TVA est obligatoire pour le plan Professionnel');
        setLoading(false);
        return;
      }
      if (!validateVatNumber(formData.vatCountry, formData.vatNumber)) {
        setError('Le numéro de TVA n\'est pas valide');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        accountType: formData.accountType,
        referralCode: referralValid ? referralCode : null
      };

      // Ajouter les infos Pro si nécessaire
      if (formData.accountType === 'professionnel') {
        payload.companyName = formData.companyName;
        payload.vatNumber = `${formData.vatCountry}${formData.vatNumber.replace(/[\s.]/g, '').toUpperCase()}`;
      }

      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

      // Enregistrer le parrainage si code valide
      if (referralValid && referralCode && data.user?.id) {
        try {
          await fetch(`${API_URL}/api/v1/referral/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode,
              referredUserId: data.user.id
            })
          });
        } catch (err) {
          console.error('Error registering referral:', err);
        }
      }

      // Connexion automatique
      if (data.token) {
        login(data.token, data.refreshToken, data.user);
        navigate('/dashboard');
      } else {
        navigate('/login?registered=true');
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const vatCountries = [
    { code: 'BE', name: 'Belgique', placeholder: '0123456789' },
    { code: 'FR', name: 'France', placeholder: 'XX123456789' },
    { code: 'DE', name: 'Allemagne', placeholder: '123456789' },
    { code: 'NL', name: 'Pays-Bas', placeholder: '123456789B01' },
    { code: 'LU', name: 'Luxembourg', placeholder: '12345678' },
    { code: 'IT', name: 'Italie', placeholder: '12345678901' },
    { code: 'ES', name: 'Espagne', placeholder: 'X12345678' }
  ];

  const selectedCountry = vatCountries.find(c => c.code === formData.vatCountry);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="text-gray-600 mt-1">Commencez votre essai gratuit de 15 jours</p>
        </div>

        {/* Bonus parrainage */}
        {referralValid && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  🎁 Vous êtes parrainé par {referrerName} !
                </p>
                <p className="text-sm text-green-700">
                  Vous bénéficiez de <strong>20% de réduction</strong> sur votre première année.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Erreur */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Choix du type de compte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de compte
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, accountType: 'particulier' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.accountType === 'particulier'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Home className={`h-6 w-6 mb-2 ${
                  formData.accountType === 'particulier' ? 'text-primary-600' : 'text-gray-400'
                }`} />
                <p className="font-medium text-gray-900">Particulier</p>
                <p className="text-xs text-gray-500 mt-1">Syndic bénévole</p>
                <p className="text-xs font-medium text-primary-600 mt-2">2€/unité/mois TTC</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, accountType: 'professionnel' }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.accountType === 'professionnel'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Briefcase className={`h-6 w-6 mb-2 ${
                  formData.accountType === 'professionnel' ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <p className="font-medium text-gray-900">Professionnel</p>
                <p className="text-xs text-gray-500 mt-1">Syndic société</p>
                <p className="text-xs font-medium text-purple-600 mt-2">4€/unité/mois HTVA</p>
              </button>
            </div>
          </div>

          {/* Infos personnelles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Dupont"
              />
            </div>
          </div>

          {/* Champs Pro */}
          {formData.accountType === 'professionnel' && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-sm font-medium text-purple-800">Informations société (obligatoires)</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la société *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required={formData.accountType === 'professionnel'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ma Société SRL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de TVA intracommunautaire *
                </label>
                <div className="flex gap-2">
                  <select
                    name="vatCountry"
                    value={formData.vatCountry}
                    onChange={handleChange}
                    className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {vatCountries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                    required={formData.accountType === 'professionnel'}
                    className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      vatError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={selectedCountry?.placeholder || '0123456789'}
                  />
                </div>
                {vatError && (
                  <p className="text-xs text-red-600 mt-1">{vatError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format : {formData.vatCountry}{selectedCountry?.placeholder}
                </p>
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="jean@exemple.be"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
          </div>

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Code parrainage manuel */}
          {!referralValid && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code parrainage (optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="CODE2025"
                />
                <button
                  type="button"
                  onClick={() => checkReferralCode(referralCode)}
                  disabled={!referralCode}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Vérifier
                </button>
              </div>
              {referralValid === false && referralCode && (
                <p className="text-xs text-red-600 mt-1">Code invalide</p>
              )}
            </div>
          )}

          {/* CGV */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="acceptTerms"
              id="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="acceptTerms" className="text-sm text-gray-600">
              J'accepte les{' '}
              <a href="/cgv" className="text-primary-600 hover:underline">conditions générales</a>
              {' '}et la{' '}
              <a href="/privacy" className="text-primary-600 hover:underline">politique de confidentialité</a>
            </label>
          </div>

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Création en cours...
              </>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          {/* Récap plan */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Plan {formData.accountType === 'particulier' ? 'Particulier' : 'Professionnel'}
                </p>
                <p className="text-sm text-gray-600">
                  {formData.accountType === 'particulier' 
                    ? '2€/unité/mois TTC • 1 immeuble'
                    : '4€/unité/mois HTVA • Multi-immeubles'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Essai gratuit</p>
                <p className="font-bold text-green-600">15 jours</p>
              </div>
            </div>
          </div>

          {/* Lien connexion */}
          <p className="text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
