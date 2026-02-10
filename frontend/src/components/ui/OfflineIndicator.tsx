// src/components/ui/OfflineIndicator.tsx

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-slide-in">
        <WifiOff size={16} />
        Vous êtes hors ligne — certaines fonctionnalités sont indisponibles
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] bg-green-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-slide-in">
        <Wifi size={16} />
        Connexion rétablie
      </div>
    );
  }

  return null;
};
