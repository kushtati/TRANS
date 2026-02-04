// src/components/layout/AppLayout.tsx

import React, { useState } from 'react';
import { 
  Zap, Search, Bell, LogOut, User, Menu, X,
  LayoutDashboard, PlusCircle, Calculator, 
  PieChart, Settings, MessageSquare
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: {
    id: string;
    name: string;
  };
}

type AppView = 'dashboard' | 'shipment' | 'create' | 'accounting' | 'calculator' | 'settings' | 'assistant' | 'detail';

interface AppLayoutProps {
  user: User;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ============================================
  // NAVIGATION ITEMS
  // ============================================

  const navItems = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'create', label: 'Nouveau', icon: PlusCircle },
    { id: 'calculator', label: 'Calcul', icon: Calculator },
    { id: 'accounting', label: 'Finance', icon: PieChart, roles: ['DIRECTOR', 'ACCOUNTANT'] },
    { id: 'assistant', label: 'IA', icon: MessageSquare },
  ].filter(item => !item.roles || item.roles.includes(user.role));

  // ============================================
  // ROLE LABELS
  // ============================================

  const roleLabels: Record<string, string> = {
    DIRECTOR: 'Directeur',
    ACCOUNTANT: 'Comptable',
    AGENT: 'Agent',
    CLIENT: 'Client',
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        {/* Top Bar */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap size={18} fill="currentColor" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg">E-Trans</span>
                <span className="text-slate-400 text-xs ml-2 hidden md:inline">
                  {user.company.name}
                </span>
              </div>
            </div>

            {/* Search (desktop) */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher (BL, tracking, client...)"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-tight">{user.name.split(' ')[0]}</p>
                    <p className="text-xs text-slate-400">{roleLabels[user.role] || user.role}</p>
                  </div>
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)} 
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="p-3 border-b border-slate-700">
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <p className="text-xs text-blue-400 mt-1">{user.company.name}</p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onNavigate('settings');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Settings size={16} />
                          Paramètres
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors md:hidden"
              >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Search (mobile) */}
          <div className="mt-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <nav className="px-4 pb-3 md:hidden border-t border-slate-800">
            <div className="flex flex-wrap gap-2 pt-3">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id as AppView);
                    setShowMobileMenu(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>

      {/* ============================================ */}
      {/* BOTTOM NAVIGATION (Mobile) */}
      {/* ============================================ */}
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40">
        <div className="flex justify-around items-center px-2 py-2">
          {navItems.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as AppView)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[60px] ${
                currentView === item.id
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ============================================ */}
      {/* DESKTOP SIDEBAR (Optional - can be added) */}
      {/* ============================================ */}
      
    </div>
  );
};

export default AppLayout;
