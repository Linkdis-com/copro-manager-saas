import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Lock, Mail, AlertCircle, Shield } from 'lucide-react';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    await login(email, password);
    // ✅ Navigation APRÈS login réussi pour que le navigateur détecte la soumission
    navigate('/dashboard');
  } catch (err) {
    setError(err.message || 'Identifiants incorrects');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Administration
          </h1>
          <p className="text-gray-400">
            Espace réservé aux administrateurs
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
  {/* Error Message */}
  {error && (
    <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm">{error}</span>
    </div>
  )}

  {/* Email */}
  <div>
    <label htmlFor="admin-email" className="block text-sm font-medium text-gray-300 mb-2">
      Email
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Mail className="h-5 w-5 text-gray-500" />
      </div>
      <input
        id="admin-email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        placeholder="admin@copromanager.be"
        required
        autoComplete="username"
        autoFocus
      />
    </div>
  </div>

  {/* Password */}
  <div>
    <label htmlFor="admin-password" className="block text-sm font-medium text-gray-300 mb-2">
      Mot de passe
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Lock className="h-5 w-5 text-gray-500" />
      </div>
      <input
        id="admin-password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
    </div>
  </div>

  {/* Submit Button */}
  <button
    type="submit"
    disabled={loading}
    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {loading ? (
      <>
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
        Connexion...
      </>
    ) : (
      'Se connecter'
    )}
  </button>
</form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Accès sécurisé • Connexions enregistrées
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
