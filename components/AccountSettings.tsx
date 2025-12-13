import React, { useState, useRef } from 'react';
import { User } from '../types';
import { updateUserProfile, changeUserPassword, deleteUserAccount } from '../services/dataService';
import { UserCog, Lock, Trash2, Save, LogOut, Shield, User as UserIcon, AlertTriangle, Check, Upload } from 'lucide-react';

interface AccountSettingsProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onClose: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdateUser, onLogout, onClose }) => {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setLoading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
             const base64 = reader.result as string;
             try {
                const res = await updateUserProfile(user.username, base64);
                if (res.success) {
                    onUpdateUser({ ...user, avatar: base64 });
                    setStatus({ type: 'success', msg: 'Profile picture updated!' });
                } else {
                    setStatus({ type: 'error', msg: res.error || 'Failed to update picture' });
                }
             } catch (err) {
                setStatus({ type: 'error', msg: 'Failed to upload image' });
             } finally {
                setLoading(false);
             }
        }
        reader.readAsDataURL(file);
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

  const handleDeleteAccount = async () => {
    if (window.confirm("DANGER: Are you sure you want to delete your account? All data will be lost permanently.")) {
        await deleteUserAccount(user.id);
        onLogout();
    }
  };
  
  const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
  };

  return (
    <div className="flex flex-col md:flex-row h-full md:h-[500px]">
      {/* Sidebar / Tabs */}
      <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        {/* User Info - Compact on Mobile */}
        <div className="p-4 md:p-6 flex flex-row md:flex-col items-center gap-4 text-left md:text-center border-b border-slate-200 md:border-0">
             <div className="relative group">
                <div className="w-12 h-12 md:w-20 md:h-20 rounded-full overflow-hidden shadow-sm ring-2 ring-white shrink-0 bg-gray-200 flex items-center justify-center">
                    {user.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        <span className="text-sm md:text-2xl font-bold text-gray-500">{getInitials(user.username)}</span>
                    )}
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-white shadow-md p-1.5 rounded-full text-slate-600 hover:text-primary-600 border border-slate-100 hover:border-primary-200 transition-all"
                    title="Upload Photo"
                >
                    <Upload size={12} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                />
             </div>
             <div className="flex-1 overflow-hidden">
                 <h3 className="font-bold text-slate-800 truncate text-lg">{user.username}</h3>
                 <p className="text-xs text-slate-500 truncate">{user.email}</p>
             </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1 no-scrollbar">
            <button
            onClick={() => { setActiveTab('profile'); setStatus(null); }}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'profile' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
            <UserIcon size={18} /> Profile
            </button>
            <button
            onClick={() => { setActiveTab('security'); setStatus(null); }}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'security' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
            <Shield size={18} /> Security
            </button>
        </div>

        <div className="hidden md:block mt-auto p-4 border-t border-slate-200">
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
            >
                <LogOut size={18} /> Sign Out
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-5 md:p-8 overflow-y-auto bg-white">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {activeTab === 'profile' && <><UserCog className="text-primary-500"/> Edit Profile</>}
            {activeTab === 'security' && <><Lock className="text-primary-500"/> Security</>}
        </h2>

        {status && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
               {status.type === 'error' ? <AlertTriangle size={20} className="shrink-0" /> : <Check size={20} className="shrink-0" />}
               <span className="text-sm font-medium">{status.msg}</span>
            </div>
        )}

        {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-5 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">Display Name</label>
                    <div className="relative group">
                        <UserCog size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                    <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                </div>
                
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all text-sm font-medium shadow-lg shadow-primary-200"
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>
            </form>
        )}

        {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">New Password</label>
                        <div className="relative group">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!password || loading}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 active:scale-95 transition-all text-sm font-medium disabled:opacity-50 disabled:active:scale-100"
                    >
                         {loading ? 'Updating...' : <><Lock size={16} /> Update Password</>}
                    </button>
                </form>

                <div className="pt-6 border-t border-slate-100">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <h4 className="text-sm font-bold text-red-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle size={16}/> Danger Zone
                        </h4>
                        <p className="text-xs text-red-600/80 mb-4">
                            Permanently delete your account and all associated tasks. This action cannot be undone.
                        </p>
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 bg-white rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} /> Delete My Account
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      {/* Mobile Logout */}
      <div className="md:hidden p-4 bg-slate-50 border-t border-slate-200">
         <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
        >
            <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;