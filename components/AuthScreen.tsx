import React, { useState } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, CheckCircle2, Cloud, HardDrive, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { loginUser, registerUser, isCloudEnabled } from '../services/dataService';

interface AuthScreenProps {
  onLogin: (user: UserType) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await loginUser(email, password);
      } else {
        result = await registerUser(email, password, username);
      }

      if (result.error) {
        setError(result.error);
      } else if (result.user) {
        onLogin(result.user);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-8 text-center text-white relative">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2">TaskGenie AI</h1>
          <p className="text-primary-100 mb-4">Smart task management for everyone</p>
          
          <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-xs font-medium">
            {isCloudEnabled ? (
                <>
                    <Cloud size={12} />
                    <span>Cloud Sync Active</span>
                </>
            ) : (
                <>
                    <HardDrive size={12} />
                    <span>Local Mode (Device Only)</span>
                </>
            )}
          </div>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-8 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="johndoe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div className="text-sm text-red-600">
                        <span className="font-semibold block mb-0.5">Authentication Error</span>
                        {error}
                        {error.includes("Email not confirmed") && (
                            <span className="block mt-1 text-xs text-red-500">
                                Tip: You can disable email confirmation in your Supabase Dashboard under Auth → Providers → Email.
                            </span>
                        )}
                    </div>
                </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>
          
           {!isCloudEnabled && (
               <div className="mt-6 text-xs text-center text-gray-400 bg-gray-50 p-2 rounded border border-gray-100">
                   <p>Note: Without Supabase keys configured,</p>
                   <p>tasks are only saved to this device's browser.</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;