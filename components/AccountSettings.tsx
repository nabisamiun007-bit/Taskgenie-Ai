import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { updateUserProfile, changeUserPassword, deleteUserAccount } from '../services/dataService';
import { UserCog, Lock, Trash2, Save, LogOut, Shield, User as UserIcon, AlertTriangle, Sparkles, Key, Check } from 'lucide-react';

interface AccountSettingsProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onClose: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdateUser, onLogout, onClose }) => {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'ai'>('profile');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load existing key from local storage
    const storedKey = localStorage.getItem('user_gemini_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await updateUserProfile(username);
      if (res.success) {
        onUpdateUser({ ...user, username });
        setStatus({ type: 'success', msg: 'Profile updated successfully' });
      } else {
        setStatus({ type: 'error', msg: res.error || 'Failed to update' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'An error occurred' });
    } finally {
        setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        setStatus({ type: 'error', msg: 'Password must be at least 6 characters' });
        return;
    }
    setStatus(null);
    setLoading(true);
    try {
      const res = await changeUserPassword(password);
      if (res.success) {
        setStatus({ type: 'success', msg: 'Password changed successfully' });
        setPassword('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'Failed to change password' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'An error occurred' });
    } finally {
        setLoading(false);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
        localStorage.setItem('user_gemini_api_key', apiKey.trim());
        setStatus({ type: 'success', msg: 'API Key saved locally!' });
    } else {
        localStorage.removeItem('user_gemini_api_key');
        setStatus({ type: 'success', msg: 'API Key removed.' });
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("DANGER: Are you sure you want to delete your account? All data will be lost permanently.")) {
        await deleteUserAccount(user.id);
        onLogout();
    }
  };

  const InitialsAvatar = () => (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
        {user.username.substring(0, 2).toUpperCase()}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-[500px]">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-50 p-4 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col gap-2">
        <div className="mb-6 flex flex-col items-center text-center">
             {user.avatar ? <img src={user.avatar} className="w-16 h-16 rounded-full mb-3" /> : <InitialsAvatar />}
             <h3 className="font-semibold text-gray-900">{user.username}</h3>
             <p className="text-xs text-gray-500 truncate max-w-full px-2">{user.email}</p>
        </div>

        <button
          onClick={() => { setActiveTab('profile'); setStatus(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <UserIcon size={18} /> Profile
        </button>
        <button
          onClick={() => { setActiveTab('security'); setStatus(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'security' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Shield size={18} /> Security
        </button>
        <button
          onClick={() => { setActiveTab('ai'); setStatus(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'ai' ? 'bg-white text-purple-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Sparkles size={18} /> AI Config
        </button>

        <div className="mt-auto pt-4 border-t border-gray-200">
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            >
                <LogOut size={18} /> Sign Out
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {activeTab === 'profile' ? 'Edit Profile' : activeTab === 'security' ? 'Security Settings' : 'AI Configuration'}
        </h2>

        {status && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
               {status.type === 'error' && <AlertTriangle size={20} className="shrink-0" />}
               {status.type === 'success' && <Check size={20} className="shrink-0" />}
               <span className="text-sm font-medium">{status.msg}</span>
            </div>
        )}

        {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <div className="relative">
                        <UserCog size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400">To change your email, please contact support.</p>
                </div>
                
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium shadow-lg shadow-primary-200"
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>
            </form>
        )}

        {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!password || loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                         {loading ? 'Updating...' : <><Lock size={16} /> Update Password</>}
                    </button>
                </form>

                <div className="pt-8 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-red-600 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={16}/> Danger Zone
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Deleting your account is permanent. All your tasks and data will be wiped immediately.
                    </p>
                    <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                        <Trash2 size={16} /> Delete My Account
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <h3 className="font-semibold text-purple-900 flex items-center gap-2 mb-2">
                        <Sparkles size={18} /> Google Gemini AI
                    </h3>
                    <p className="text-sm text-purple-800">
                        TaskGenie uses Gemini AI to auto-generate tasks. If you see an "API Key Missing" error, you can paste your own personal API key below.
                    </p>
                    <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 underline mt-2 inline-block font-medium"
                    >
                        Get a free API Key from Google AI Studio &rarr;
                    </a>
                </div>

                <form onSubmit={handleSaveApiKey} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Custom API Key</label>
                        <div className="relative">
                            <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-400">
                            This key is stored locally on your device browser.
                        </p>
                    </div>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium shadow-lg shadow-purple-200"
                    >
                         <Save size={18} /> Save API Key
                    </button>
                </form>
            </div>
        )}

      </div>
    </div>
  );
};

export default AccountSettings;