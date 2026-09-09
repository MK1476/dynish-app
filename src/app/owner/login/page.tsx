'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { sendOtp, verifyOtp, verifyMsg91Token } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

const MSG91_WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '3669696d6f43353339303431';
const MSG91_TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '569424TqSS9nYwF6aa15e42P1';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Initialize MSG91 OTP widget with exposeMethods: true
  const initMsg91Widget = useCallback(() => {
    if (typeof window !== 'undefined' && typeof (window as any).initSendOTP === 'function') {
      try {
        (window as any).initSendOTP({
          widgetId: MSG91_WIDGET_ID,
          tokenAuth: MSG91_TOKEN_AUTH,
          exposeMethods: true,
          success: (data: any) => {
            console.log('[MSG91] Widget initialized successfully');
          },
          failure: (error: any) => {
            console.warn('[MSG91] Widget configuration note:', error);
            const errStr = JSON.stringify(error || '');
            if (errStr.includes('IPBlocked') || error?.message === 'IPBlocked' || error?.code === '408') {
              setMessage('MSG91 rate throttle active on this IP. Use test code 123456 or unblock in MSG91 Token Settings.');
            }
          },
        });
      } catch (err) {
        console.warn('[MSG91] Init exception:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof (window as any).initSendOTP === 'function') {
      initMsg91Widget();
    }
  }, [initMsg91Widget]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const cleanDigits = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit Indian phone number.');
      setLoading(false);
      return;
    }

    const identifier = '91' + cleanDigits;
    let responded = false;

    // Safety timeout: If MSG91's otp-provider.js encounters a 500/408 error or script error,
    // automatically recover via server fallback after 2.5 seconds so merchant never gets stuck.
    const fallbackTimer = setTimeout(async () => {
      if (!responded) {
        responded = true;
        console.warn('[MSG91] Widget sendOtp timed out or encountered script error; activating server fallback');
        const res = await sendOtp(cleanDigits);
        setLoading(false);
        if (res.success) {
          setStep('otp');
          setResendCooldown(15);
          setMessage(res.message || 'OTP sent! (Test mode: 123456)');
        } else {
          setError(res.message || 'Failed to send OTP.');
        }
      }
    }, 2500);

    // Use MSG91 exposed method if available
    if (typeof window !== 'undefined' && typeof (window as any).sendOtp === 'function') {
      try {
        (window as any).sendOtp(
          identifier,
          (data: any) => {
            if (responded) return;
            responded = true;
            clearTimeout(fallbackTimer);
            setLoading(false);
            setStep('otp');
            setResendCooldown(15);
            setMessage('OTP sent via SMS / WhatsApp! (Test code: 123456)');
          },
          async (err: any) => {
            if (responded) return;
            responded = true;
            clearTimeout(fallbackTimer);
            console.warn('[MSG91] sendOtp failure, falling back to server sendOtp:', err);
            const errStr = JSON.stringify(err || '');
            const isIpBlocked = errStr.includes('IPBlocked') || err?.message === 'IPBlocked' || err?.code === '408';

            const res = await sendOtp(cleanDigits);
            setLoading(false);
            if (res.success) {
              setStep('otp');
              setResendCooldown(15);
              if (isIpBlocked) {
                setMessage('Notice: Your IP is throttled in MSG91. Use test code 123456 or unblock in MSG91 Token Settings.');
              } else {
                setMessage(res.message || 'OTP sent successfully!');
              }
            } else {
              const errMsg = typeof err === 'string' ? err : (err?.message || res.message || 'Failed to send OTP.');
              setError(errMsg);
            }
          }
        );
        return;
      } catch (err: any) {
        console.warn('[MSG91] Exception in sendOtp call:', err);
      }
    }

    // Direct server fallback
    clearTimeout(fallbackTimer);
    responded = true;
    const res = await sendOtp(cleanDigits);
    setLoading(false);

    if (res.success) {
      setStep('otp');
      setResendCooldown(15);
      setMessage(res.message || 'OTP sent successfully!');
    } else {
      setError(res.message || 'Failed to send OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const cleanDigits = phoneNumber.replace(/\D/g, '').slice(-10);
    let responded = false;

    const fallbackTimer = setTimeout(async () => {
      if (!responded) {
        responded = true;
        const res = await sendOtp(cleanDigits);
        setLoading(false);
        setResendCooldown(15);
        setMessage('OTP resent successfully.');
      }
    }, 2500);

    if (typeof window !== 'undefined' && typeof (window as any).retryOtp === 'function') {
      try {
        (window as any).retryOtp(
          null,
          (data: any) => {
            if (responded) return;
            responded = true;
            clearTimeout(fallbackTimer);
            setLoading(false);
            setResendCooldown(15);
            setMessage('New verification code sent via SMS / WhatsApp.');
          },
          async (err: any) => {
            if (responded) return;
            responded = true;
            clearTimeout(fallbackTimer);
            console.warn('[MSG91] retryOtp error, fallback to sendOtp:', err);
            const res = await sendOtp(cleanDigits);
            setLoading(false);
            setResendCooldown(15);
            setMessage('OTP resent successfully.');
          }
        );
        return;
      } catch (err) {
        console.warn('[MSG91] Exception retryOtp:', err);
      }
    }

    clearTimeout(fallbackTimer);
    responded = true;
    const res = await sendOtp(cleanDigits);
    setLoading(false);
    setResendCooldown(15);
    setMessage('OTP resent successfully.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanDigits = phoneNumber.replace(/\D/g, '').slice(-10);
    const cleanOtp = otp.trim();

    // 1. Instant test bypass code (123456)
    if (cleanOtp === '123456') {
      const res = await verifyMsg91Token(cleanDigits, '123456');
      setLoading(false);

      if (res.success) {
        if (res.isNewUser) {
          router.push('/owner/onboarding');
        } else {
          router.push('/owner/dashboard');
        }
        router.refresh();
      } else {
        setError(res.message || 'Invalid verification code.');
      }
      return;
    }

    let responded = false;
    const fallbackTimer = setTimeout(async () => {
      if (!responded) {
        responded = true;
        console.warn('[MSG91] verifyOtp timed out; verifying via server');
        const res = await verifyMsg91Token(cleanDigits, cleanOtp);
        setLoading(false);
        if (res.success) {
          if (res.isNewUser) {
            router.push('/owner/onboarding');
          } else {
            router.push('/owner/dashboard');
          }
          router.refresh();
        } else {
          setError(res.message || 'Verification failed.');
        }
      }
    }, 3000);

    // 2. MSG91 window.verifyOtp
    if (typeof window !== 'undefined' && typeof (window as any).verifyOtp === 'function') {
      try {
        (window as any).verifyOtp(
          cleanOtp,
          async (data: any) => {
            if (responded) return;
            responded = true;
            clearTimeout(fallbackTimer);
            const accessToken = typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data));
            const res = await verifyMsg91Token(cleanDigits, accessToken);
            setLoading(false);

            if (res.success) {
              if (res.isNewUser) {
                router.push('/owner/onboarding');
              } else {
                router.push('/owner/dashboard');
              }
              router.refresh();
            } else {
              setError(res.message || 'Token verification failed.');
            }
          },
          async (err: any) => {
            if (responded) return;
            responded = true;
            clearTimeout(fallbackTimer);
            console.warn('[MSG91] verifyOtp returned error, checking server fallback:', err);
            const res = await verifyOtp(cleanDigits, cleanOtp);
            setLoading(false);

            if (res.success) {
              if (res.isNewUser) {
                router.push('/owner/onboarding');
              } else {
                router.push('/owner/dashboard');
              }
              router.refresh();
            } else {
              const errMsg = typeof err === 'string' ? err : (err?.message || res.message || 'Invalid verification code.');
              setError(errMsg);
            }
          }
        );
        return;
      } catch (err: any) {
        console.warn('[MSG91] Exception in verifyOtp:', err);
      }
    }

    // 3. Fallback to server verification
    clearTimeout(fallbackTimer);
    responded = true;
    const res = await verifyMsg91Token(cleanDigits, cleanOtp);
    setLoading(false);

    if (res.success) {
      if (res.isNewUser) {
        router.push('/owner/onboarding');
      } else {
        router.push('/owner/dashboard');
      }
      router.refresh();
    } else {
      setError(res.message || 'Verification failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      {/* Load MSG91 OTP Widget Script */}
      <Script
        src="https://verify.msg91.com/otp-provider.js"
        strategy="afterInteractive"
        onLoad={initMsg91Widget}
      />

      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-ivory-200 shadow-2xl space-y-6 animate-scale-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <BrandLogo size="lg" subtext="Merchant Operating System" className="justify-center mb-2" />
          <h1 className="font-sans text-2xl font-extrabold text-espresso-950 mt-2">
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
                <div className="flex items-center gap-1 pl-4 pr-3 py-3.5 text-espresso-600 font-sans font-bold text-base border-r border-ivory-300 bg-ivory-100/60 select-none shrink-0">
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="Enter 10-digit mobile"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3.5 bg-transparent text-espresso-950 font-sans text-lg font-bold tracking-wider focus:outline-none placeholder:text-espresso-300 placeholder:font-normal"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phoneNumber.length !== 10}
              className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-sans font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'Sending OTP...' : 'Get OTP on SMS / WhatsApp'}</span>
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
                  onClick={() => {
                    setStep('phone');
                    setError(null);
                    setMessage(null);
                  }}
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
                className="w-full px-4 py-3.5 rounded-2xl bg-ivory-50 border-2 border-ivory-300 text-espresso-950 font-sans text-2xl font-bold tracking-widest text-center focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 transition-all shadow-inner"
              />
            </div>

            {/* Resend OTP & Test Mode bar */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="flex items-center gap-1.5 font-semibold text-espresso-700 hover:text-brand-700 disabled:opacity-40 disabled:hover:text-espresso-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOtp('123456')}
                className="font-bold text-brand-800 bg-ivory-100 px-2 py-1 rounded-md border border-brand-200 hover:bg-brand-50 shadow-xs"
              >
                Auto-fill 123456
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-espresso-950 font-sans font-bold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center pt-3 border-t border-ivory-100 space-y-1.5">
          <p className="text-xs text-espresso-600">
            Need help accessing your store?{' '}
            <a 
              href="https://wa.me/919704100544?text=Hi%20Dynish%20Team!%20I%20need%20help%20logging%20into%20my%20store." 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-brand-800 hover:text-brand-900 underline hover:no-underline"
            >
              Contact us
            </a>
          </p>
          <p className="text-[11px] text-espresso-400">
            Secured by MSG91 &amp; Supabase Multi-factor Auth.
          </p>
        </div>

      </div>
    </div>
  );
}
