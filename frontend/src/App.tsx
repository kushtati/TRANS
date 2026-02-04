// src/App.tsx

import { useState, useEffect } from 'react';
import { api } from './lib/api';
import type { User } from './types';

// Auth Components
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { VerifyEmailScreen } from './components/auth/VerifyEmailScreen';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Main Components
import { Dashboard } from './components/Dashboard';
import { CreateShipmentForm } from './components/CreateShipmentForm';
import { ShipmentDetail } from './components/ShipmentDetail';
import { SettingsView } from './components/SettingsView';

import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'create' | 'detail' | 'settings';
type AuthScreen = 'welcome' | 'login' | 'register' | 'verify';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch {
      // Not authenticated
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setAuthScreen('welcome');
      setCurrentView('dashboard');
    }
  };

  const handleViewShipment = (id: string) => {
    setSelectedShipmentId(id);
    setCurrentView('detail');
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
            onSuccess={setUser}
            onBack={() => setAuthScreen('welcome')}
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
            onSuccess={setUser}
            onBack={() => {
              setRegisterStep(2);
              setAuthScreen('register');
            }}
          />
        );
    }
  }

  // Authenticated
  return (
    <AppLayout
      user={user}
      currentView={currentView}
      onNavigate={setCurrentView}
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && (
        <Dashboard
          onViewShipment={handleViewShipment}
          onCreateShipment={() => setCurrentView('create')}
        />
      )}
      {currentView === 'create' && (
        <CreateShipmentForm
          onSuccess={() => setCurrentView('dashboard')}
          onCancel={() => setCurrentView('dashboard')}
        />
      )}
      {currentView === 'detail' && selectedShipmentId && (
        <ShipmentDetail
          shipmentId={selectedShipmentId}
          onBack={() => setCurrentView('dashboard')}
        />
      )}
      {currentView === 'settings' && (
        <SettingsView
          user={user}
          onLogout={handleLogout}
        />
      )}
    </AppLayout>
  );
}
