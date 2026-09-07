'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { verifyAdminPin } from '@/actions/admin';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/common/BrandLogo';

export const AdminPinGate: React.FC = () => {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 8) {
      setError('Please enter a complete 8-digit admin PIN.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await verifyAdminPin(pin);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || 'Access denied.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-ivory-200 shadow-2xl space-y-6 text-center animate-scale-in">
        <div className="flex justify-center">
          <BrandLogo size="md" subtext="Platform Administration" />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-espresso-950 text-brand-400 flex items-center justify-center mx-auto shadow-md">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-900 border border-brand-200 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-700" />
            <span>Authorized Personnel Only</span>
          </div>
          <h1 className="font-sans text-2xl font-extrabold text-espresso-950">
            Enter 8-Digit Admin PIN
          </h1>
          <p className="text-espresso-500 text-xs mt-1">
            Access to platform metrics, merchant accounts, and subscription control is restricted.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              placeholder="••••••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
                if (error) setError(null);
              }}
              className="w-full text-center tracking-[0.6em] text-2xl font-black px-4 py-3.5 rounded-2xl bg-ivory-50 border-2 border-ivory-300 text-espresso-950 focus:outline-none focus:border-brand-500 focus:bg-white font-sans transition-all"
            />
            <div className="flex justify-between items-center mt-2 text-[11px] text-espresso-400 font-medium px-1">
              <span>Security PIN</span>
              <span>{pin.length} / 8 digits</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 8}
            className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-sans font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{loading ? 'Verifying PIN...' : 'Unlock Admin Operations'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-espresso-400">
          Super-admin access configured via environment variable <code className="font-mono bg-ivory-100 px-1.5 py-0.5 rounded text-espresso-600">ADMIN_PIN</code>
        </div>
      </div>
    </div>
  );
};
