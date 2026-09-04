'use client';

import React, { useState } from 'react';
import { sendOtp, verifyOtp } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await sendOtp(phoneNumber);
    setLoading(false);

    if (res.success) {
      setStep('otp');
      setMessage(res.message || 'OTP sent successfully!');
    } else {
      setError(res.message || 'Failed to send OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await verifyOtp(phoneNumber, otp);
    setLoading(false);

    if (res.success) {
      router.push('/owner/dashboard');
      router.refresh();
    } else {
      setError(res.message || 'Invalid verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-ivory-200 shadow-2xl space-y-6 animate-scale-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <BrandLogo size="lg" subtext="Merchant Operating System" className="justify-center mb-2" />
          <h1 className="font-serif text-2xl font-bold text-espresso-950 mt-2">
            Shop Owner Portal
          </h1>
          <p className="text-xs text-espresso-500 mt-1">
            Sign in with your mobile number to manage catalog, billing, and customer retention.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-espresso-800 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="relative flex items-center rounded-2xl bg-ivory-50 border-2 border-ivory-300 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100 transition-all shadow-inner overflow-hidden">
                <div className="flex items-center gap-1 pl-4 pr-3 py-3.5 text-espresso-600 font-mono font-bold text-base border-r border-ivory-300 bg-ivory-100/60 select-none shrink-0">
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="98201 44521"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3.5 bg-transparent text-espresso-950 font-mono text-lg font-bold tracking-wider focus:outline-none placeholder:text-espresso-300 placeholder:font-normal"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phoneNumber.length !== 10}
              className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-serif font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'Sending OTP...' : 'Get OTP on SMS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-espresso-800 uppercase tracking-wider">
                  Enter 6-Digit OTP
                </label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-brand-700 font-semibold hover:underline"
                >
                  Change Number
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3.5 rounded-2xl bg-ivory-50 border-2 border-ivory-300 text-espresso-950 font-mono text-2xl font-bold tracking-widest text-center focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 transition-all shadow-inner"
              />
            </div>

            {/* Test Mode Quick Fill */}
            <div className="bg-ivory-100 p-2.5 rounded-xl border border-ivory-300 flex items-center justify-between text-xs">
              <span className="text-espresso-600">Test OTP Code:</span>
              <button
                type="button"
                onClick={() => setOtp('123456')}
                className="font-bold text-brand-800 bg-white px-2 py-1 rounded-md border border-brand-300 hover:bg-brand-50 shadow-xs"
              >
                Auto-fill 123456
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-serif font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-ivory-100">
          <p className="text-[11px] text-espresso-400">
            Protected by Supabase Auth & Row Level Security.
          </p>
        </div>

      </div>
    </div>
  );
}
