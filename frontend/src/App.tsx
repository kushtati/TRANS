// src/App.tsx

import { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './components/ui/Toast';
import type { User } from './types';

// Auth Components (small, loaded immediately for fast first paint)
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { VerifyEmailScreen } from './components/auth/VerifyEmailScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';

// Layout (always needed)
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Lazy-loaded views (code-split for performance on 3G — U6)
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const CreateShipmentForm = lazy(() => import('./components/CreateShipmentForm').then(m => ({ default: m.CreateShipmentForm })));
const ShipmentDetail = lazy(() => import('./components/ShipmentDetail').then(m => ({ default: m.ShipmentDetail })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const AIAssistantView = lazy(() => import('./pages/AIAssistantView').then(m => ({ default: m.AIAssistantView })));
const CalculatorView = lazy(() => import('./pages/CalculatorView').then(m => ({ default: m.CalculatorView })));
const AccountingView = lazy(() => import('./pages/AccountingView').then(m => ({ default: m.AccountingView })));
const AuditTrailView = lazy(() => import('./pages/AuditTrailView').then(m => ({ default: m.AuditTrailView })));
const EditShipmentView = lazy(() => import('./pages/EditShipmentView').then(m => ({ default: m.EditShipmentView })));
const TeamManagementView = lazy(() => import('./pages/TeamManagementView').then(m => ({ default: m.TeamManagementView })));

const ViewLoader = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
  </div>
);

type View = 'dashboard' | 'create' | 'detail' | 'settings' | 'shipment' | 'accounting' | 'calculator' | 'assistant' | 'audit' | 'edit' | 'team';
type AuthScreen = 'welcome' | 'login' | 'register' | 'verify' | 'forgot';

export default function App() {
  const { user, isLoading, setUser, logout } = useAuth();
  const toast = useToast();

  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = useCallback(async () => {
    await logout();
    setAuthScreen('welcome');
    setCurrentView('dashboard');
    toast.info('Déconnexion réussie');
  }, [logout, toast]);

  const handleViewShipment = useCallback((id: string) => {
    setSelectedShipmentId(id);
    setCurrentView('detail');
  }, []);

  const handleEditShipment = useCallback((id: string) => {
    setSelectedShipmentId(id);
    setCurrentView('edit');
  }, []);

  const handleAuthSuccess = useCallback((userData: User) => {
    // Tokens are now stored in memory by api.ts (from login response body)
    // No delay needed — Authorization header is used instead of cookies
    setUser(userData);
    toast.success('Bienvenue !');
  }, [setUser, toast]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (currentView !== 'dashboard') {
      setCurrentView('dashboard');
    }
  }, [currentView]);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    switch (authScreen) {
      case 'welcome':
        return (
          <WelcomeScreen
            onLogin={() => setAuthScreen('login')}
            onRegister={() => setAuthScreen('register')}
          />
        );
      case 'login':
        return (
          <LoginScreen
            onSuccess={handleAuthSuccess}
            onBack={() => setAuthScreen('welcome')}
            onForgotPassword={() => setAuthScreen('forgot')}
            onNeedsVerification={(email) => {
              setPendingEmail(email);
              setAuthScreen('verify');
            }}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onSuccess={(email) => {
              setPendingEmail(email);
              setAuthScreen('verify');
            }}
            onLogin={() => setAuthScreen('login')}
            initialStep={registerStep}
          />
        );
      case 'verify':
        return (
          <VerifyEmailScreen
            email={pendingEmail}
            onSuccess={handleAuthSuccess}
            onBack={() => {
              setRegisterStep(2);
              setAuthScreen('register');
            }}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordScreen
            onBack={() => setAuthScreen('login')}
            onSuccess={() => {
              toast.success('Mot de passe réinitialisé !');
              setAuthScreen('login');
            }}
          />
        );
    }
  }

  // Authenticated — render current view with lazy loading
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onViewShipment={handleViewShipment}
            onCreateShipment={() => setCurrentView('create')}
            searchQuery={searchQuery}
          />
        );
      case 'create':
        // Seul le DG et l'Assistant peuvent créer un dossier
        if (user.role !== 'DIRECTOR' && user.role !== 'AGENT') {
          return (
            <Dashboard
              onViewShipment={handleViewShipment}
              onCreateShipment={() => setCurrentView('create')}
              searchQuery={searchQuery}
            />
          );
        }
        return (
          <CreateShipmentForm
            onSuccess={() => {
              setCurrentView('dashboard');
              toast.success('Dossier créé avec succès');
            }}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'detail':
        return selectedShipmentId ? (
          <ShipmentDetail
            shipmentId={selectedShipmentId}
            onBack={() => setCurrentView('dashboard')}
            onEdit={() => handleEditShipment(selectedShipmentId)}
          />
        ) : null;
      case 'edit':
        return selectedShipmentId ? (
          <EditShipmentView
            shipmentId={selectedShipmentId}
            onSuccess={() => {
              toast.success('Dossier mis à jour');
              setCurrentView('detail');
            }}
            onCancel={() => setCurrentView('detail')}
          />
        ) : null;
      case 'calculator':
        return <CalculatorView />;
      case 'accounting':
        return <AccountingView />;
      case 'assistant':
        return <AIAssistantView />;
      case 'audit':
        return <AuditTrailView />;
      case 'team':
        return user.role === 'DIRECTOR' ? <TeamManagementView /> : (
          <Dashboard onViewShipment={handleViewShipment} onCreateShipment={() => setCurrentView('create')} />
        );
      case 'settings':
        return (
          <SettingsView
            user={user}
            onLogout={handleLogout}
            onNavigate={(v) => setCurrentView(v as View)}
          />
        );
      default:
        return (
          <Dashboard
            onViewShipment={handleViewShipment}
            onCreateShipment={() => setCurrentView('create')}
          />
        );
    }
  };

  return (
    <>
      <AppLayout
        user={user}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        onSearch={handleSearch}
      >
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </AppLayout>
      <SpeedInsights />
    </>
  );
}
