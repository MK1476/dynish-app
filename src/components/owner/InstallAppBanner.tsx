'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already dismissed or installed
    const isDismissed = localStorage.getItem('dynish_owner_pwa_dismissed') === 'true';
    const isInstalled = localStorage.getItem('dynish_owner_pwa_installed') === 'true';
    
    // Check if running in standalone display mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isDismissed || isInstalled || isStandalone) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem('dynish_owner_pwa_installed', 'true');
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fallback: If not dismissed/installed, display banner so user can install or see instructions
    const timer = setTimeout(() => {
      if (!isDismissed && !isInstalled && !isStandalone) {
        setIsVisible(true);
      }
    }, 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        localStorage.setItem('dynish_owner_pwa_installed', 'true');
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSPrompt(true);
    } else {
      // Browser does not provide direct prompt or already handled
      alert('To install Dynish on your phone:\n1. Open browser menu (⋮ or ⋯)\n2. Select Install app or Add to Home Screen');
      localStorage.setItem('dynish_owner_pwa_installed', 'true');
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('dynish_owner_pwa_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="relative z-40 bg-linear-to-r from-espresso-950 via-[#1e1510] to-[#2B1B12] text-white px-3.5 py-2.5 border-b border-amber-600/30 shadow-md animate-fade-in">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Left: App Icon & Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-brand-400 to-brand-600 p-0.5 shrink-0 shadow-sm flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/icon-192.png" 
              alt="Dynish" 
              className="w-full h-full object-cover rounded-[9px]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                Install Dynish App
              </h4>
              <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                1-TAP ACCESS
              </span>
            </div>
            <p className="text-[11px] text-ivory-300 truncate">
              Instant counter billing directly from your phone home screen.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#C27835] hover:bg-[#b06a2c] active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            className="p-1.5 rounded-lg text-ivory-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Modal / Instructions popover */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white text-espresso-950 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-ivory-200">
            <h3 className="font-bold text-base mb-2 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-brand-600" />
              Install on iPhone / iPad
            </h3>
            <ol className="text-xs text-espresso-700 space-y-2.5 my-3 pl-4 list-decimal">
              <li>Tap the <strong>Share</strong> button (box with upward arrow) in Safari.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <button
              onClick={() => {
                setShowIOSPrompt(false);
                handleDismiss();
              }}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#C27835] font-bold text-xs text-white"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
