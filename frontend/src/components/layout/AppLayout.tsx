// src/components/layout/AppLayout.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  Zap, Search, Bell, LogOut, Menu, X,
  LayoutDashboard, PlusCircle, Calculator,
  PieChart, Settings, MessageSquare, Users, Shield,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { User, Role } from '../../types';

type AppView = 'dashboard' | 'shipment' | 'create' | 'accounting' | 'calculator' | 'settings' | 'assistant' | 'detail' | 'audit' | 'edit' | 'team';

interface AppLayoutProps {
  user: User;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  onSearch?: (query: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const ROLE_LABELS: Record<Role, string> = {
  DIRECTOR: 'Directeur Général',
  ACCOUNTANT: 'Comptable',
  AGENT: 'Assistant',
  CLIENT: 'Passeur',
};

const ROLE_COLORS: Record<Role, string> = {
  DIRECTOR: 'bg-amber-500',
  ACCOUNTANT: 'bg-amber-600',
  AGENT: 'bg-amber-700',
  CLIENT: 'bg-amber-800',
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
  onSearch,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (user.role !== 'DIRECTOR') return;
    const loadNotifs = async () => {
      try {
        const res = await api.get<{ stats: { unreadNotifs: number } }>('/team/stats');
        if (res.data?.stats) setUnreadNotifs(res.data.stats.unreadNotifs);
      } catch { /* silent */ }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [user.role]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  }, [onSearch]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  }, [onSearch, searchQuery]);

  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard, roles: ['DIRECTOR', 'ACCOUNTANT', 'AGENT', 'CLIENT'] },
    { id: 'create', label: 'Nouveau', icon: PlusCircle, roles: ['DIRECTOR', 'AGENT'] },
    { id: 'accounting', label: 'Finance', icon: PieChart, roles: ['DIRECTOR', 'ACCOUNTANT'] },
    { id: 'calculator', label: 'Calcul', icon: Calculator, roles: ['DIRECTOR', 'ACCOUNTANT', 'AGENT', 'CLIENT'] },
    { id: 'team', label: 'Équipe', icon: Users, roles: ['DIRECTOR'] },
    { id: 'assistant', label: 'IA', icon: MessageSquare, roles: ['DIRECTOR', 'ACCOUNTANT', 'AGENT'] },
  ];

  const visibleNavItems = allNavItems.filter(item => item.roles.includes(user.role));
  const headerBg = 'bg-stone-900';

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <header className={`${headerBg} text-white sticky top-0 z-50 shadow-lg`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/logo.png" alt="E-Trans" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg">E-Trans</span>
                <span className="text-stone-400 text-xs ml-2 hidden md:inline">{user.company.name}</span>
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Rechercher (BL, tracking, client...)"
                  className="w-full bg-white/10 border border-white/15 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-stone-500" />
              </div>
            </form>

            <div className="flex items-center gap-2">
              {user.role === 'DIRECTOR' && (
                <button onClick={() => onNavigate('team')} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors" title="Alertes">
                  <Bell size={20} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </button>
              )}

              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <div className={`w-8 h-8 ${ROLE_COLORS[user.role]} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-tight">{user.name.split(' ')[0]}</p>
                    <p className="text-xs text-stone-400">{ROLE_LABELS[user.role]}</p>
                  </div>
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-60 bg-stone-800 border border-stone-700 rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="p-3 border-b border-stone-700">
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`w-2 h-2 rounded-full ${ROLE_COLORS[user.role]}`} />
                          <span className="text-xs text-amber-400">{ROLE_LABELS[user.role]} · {user.company.name}</span>
                        </div>
                      </div>
                      <div className="p-1">
                        <button onClick={() => { setShowUserMenu(false); onNavigate('settings'); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 rounded-lg transition-colors">
                          <Settings size={16} /> Paramètres
                        </button>
                        {user.role === 'DIRECTOR' && (
                          <button onClick={() => { setShowUserMenu(false); onNavigate('audit'); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 rounded-lg transition-colors">
                            <Shield size={16} /> Journal d'audit
                          </button>
                        )}
                        <button onClick={() => { setShowUserMenu(false); onLogout(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-stone-700 rounded-lg transition-colors">
                          <LogOut size={16} /> Déconnexion
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 rounded-lg hover:bg-white/10 transition-colors md:hidden">
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher..." className="w-full bg-white/10 border border-white/15 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </form>
        </div>

        {showMobileMenu && (
          <nav className="px-4 pb-3 md:hidden border-t border-stone-800">
            <div className="flex flex-wrap gap-2 pt-3">
              {visibleNavItems.map(item => (
                <button key={item.id} onClick={() => { onNavigate(item.id); setShowMobileMenu(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentView === item.id ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}>
                  <item.icon size={16} /> {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-20 md:pb-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 md:hidden z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center px-2 py-2">
          {visibleNavItems.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[52px] relative ${
                currentView === item.id ? 'text-amber-600' : 'text-stone-500 hover:text-stone-700'
              }`}>
              <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.id === 'team' && unreadNotifs > 0 && (
                <span className="absolute -top-0.5 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
