'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import QRCode from 'qrcode';
import { 
  Printer, Download, Sparkles, Check, 
  ExternalLink, QrCode as QrCodeIcon, ShieldCheck, Zap 
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface StandeeClientProps {
  shop: ShopRow;
}

export const StandeeClient: React.FC<StandeeClientProps> = ({ shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [tagline, setTagline] = useState('Scan to browse live catalog & claim instant loyalty rewards on your bill!');
  const [standeeSize, setStandeeSize] = useState<'a5' | 'a4' | 'tent'>('a5');
  const [theme, setTheme] = useState<'gold' | 'black' | 'clean'>('gold');
  const standeeRef = useRef<HTMLDivElement>(null);

  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const storeUrl = `${window.location.origin}/store/${shop.id}`;
      QRCode.toDataURL(storeUrl, {
        width: 600,
        margin: 1.5,
        color: {
          dark: '#1a1412',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      }).then(setQrDataUrl);
    }
  }, [shop.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${shop.name.replace(/\s+/g, '_')}_Dynish_QR.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      
      {/* SCREEN CONTROLS (Hidden during printing) */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
              Counter QR Standee Generator
            </h1>
            <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
              Print a luxury acrylic QR standee to place on your billing desk or billing counter.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadQr}
              className="px-3.5 py-2.5 rounded-2xl bg-white border border-ivory-300 hover:bg-ivory-50 text-espresso-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-espresso-600" />
              <span>Download QR</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-espresso-950 text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Standee</span>
            </button>
          </div>
        </div>

        {/* Customization Options Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-ivory-200 shadow-soft grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-espresso-700 uppercase tracking-wider mb-1.5">
              Standee Size Format
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStandeeSize('a5')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  standeeSize === 'a5' 
                    ? 'bg-espresso-950 text-white border-espresso-950 shadow-xs' 
                    : 'bg-ivory-50 text-espresso-700 border-ivory-300 hover:bg-ivory-100'
                }`}
              >
                A5 Desk (5.8 × 8.3 in)
              </button>
              <button
                type="button"
                onClick={() => setStandeeSize('a4')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  standeeSize === 'a4' 
                    ? 'bg-espresso-950 text-white border-espresso-950 shadow-xs' 
                    : 'bg-ivory-50 text-espresso-700 border-ivory-300 hover:bg-ivory-100'
                }`}
              >
                A4 Wall (8.3 × 11.7 in)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-espresso-700 uppercase tracking-wider mb-1.5">
              Color Styling
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTheme('gold')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  theme === 'gold' 
                    ? 'bg-amber-500 text-espresso-950 border-amber-600 shadow-xs' 
                    : 'bg-ivory-50 text-espresso-700 border-ivory-300'
                }`}
              >
                Heritage Gold
              </button>
              <button
                type="button"
                onClick={() => setTheme('black')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  theme === 'black' 
                    ? 'bg-espresso-950 text-white border-espresso-950 shadow-xs' 
                    : 'bg-ivory-50 text-espresso-700 border-ivory-300'
                }`}
              >
                Midnight
              </button>
              <button
                type="button"
                onClick={() => setTheme('clean')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  theme === 'clean' 
                    ? 'bg-white text-espresso-950 border-espresso-950 ring-2 ring-espresso-300' 
                    : 'bg-ivory-50 text-espresso-700 border-ivory-300'
                }`}
              >
                Minimal
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-espresso-700 uppercase tracking-wider mb-1.5">
              Customer Call-To-Action
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Scan to get instant ₹100 reward!"
            />
          </div>
        </div>
      </div>

      {/* STANDEE INSERT (PRINTABLE ZONE) */}
      <div className="flex justify-center">
        <div 
          ref={standeeRef}
          id="printable-standee"
          className={`relative rounded-3xl p-8 sm:p-10 shadow-2xl transition-all border-4 flex flex-col items-center justify-between text-center overflow-hidden ${
            standeeSize === 'a4' ? 'w-full max-w-xl aspect-[1/1.414]' : 'w-full max-w-md aspect-[1/1.414]'
          } ${
            theme === 'gold' 
              ? 'bg-gradient-to-b from-[#FDFBF7] via-[#FFFDF5] to-[#FDF4DC] border-amber-500 text-espresso-950' 
              : theme === 'black'
              ? 'bg-gradient-to-b from-espresso-950 via-espresso-900 to-black border-amber-400 text-white'
              : 'bg-white border-ivory-300 text-espresso-950'
          }`}
        >
          {/* Top Decorative Border Accent */}
          <div className="w-full flex items-center justify-between border-b pb-4 border-amber-500/30">
            <BrandLogo size="md" inverted={theme === 'black'} subtext="Fast Counter Partner" />
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
              theme === 'black' ? 'bg-amber-500 text-espresso-950' : 'bg-brand-500 text-espresso-950'
            }`}>
              <Sparkles className="w-3 h-3 fill-current" />
              <span>Official Member Store</span>
            </div>
          </div>

          {/* Center Shop Branding */}
          <div className="my-auto space-y-4 max-w-xs w-full">
            <div className="relative mx-auto w-24 h-24 rounded-3xl p-1 bg-gradient-to-tr from-brand-600 to-amber-300 shadow-lg">
              <img
                src={shop.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200'}
                alt={shop.name}
                className="w-full h-full object-cover rounded-[20px] bg-white"
              />
            </div>

            <div>
              <h2 className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight ${
                theme === 'black' ? 'text-white' : 'text-espresso-950'
              }`}>
                {shop.name}
              </h2>
              <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${
                theme === 'black' ? 'text-brand-300' : 'text-brand-800'
              }`}>
                {shop.category_label || shop.category}
              </p>
            </div>

            {/* High-Resolution QR Code */}
            <div className="bg-white p-4 rounded-3xl shadow-xl ring-4 ring-amber-400/40 mx-auto inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Shop QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-espresso-400">
                  Generating high-res QR...
                </div>
              )}
            </div>

            {/* Call to Action Prompt */}
            <div className="space-y-1">
              <p className={`font-serif text-base sm:text-lg font-bold ${
                theme === 'black' ? 'text-amber-300' : 'text-espresso-950'
              }`}>
                {tagline}
              </p>
              <p className={`text-[11px] font-medium ${
                theme === 'black' ? 'text-espresso-300' : 'text-espresso-600'
              }`}>
                Point your phone camera to scan • Opens instantly in browser
              </p>
            </div>
          </div>

          {/* Bottom 3 Perk Badges */}
          <div className="w-full border-t pt-4 border-amber-500/30 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="flex flex-col items-center gap-0.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold">No App Needed</span>
              <span className={`text-[9px] ${theme === 'black' ? 'text-espresso-400' : 'text-espresso-500'}`}>Instant Browser</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-x border-amber-500/20 px-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-bold">WhatsApp Bills</span>
              <span className={`text-[9px] ${theme === 'black' ? 'text-espresso-400' : 'text-espresso-500'}`}>Direct on Phone</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span className="font-bold">Earn Rewards</span>
              <span className={`text-[9px] ${theme === 'black' ? 'text-espresso-400' : 'text-espresso-500'}`}>Next-Visit Gifts</span>
            </div>
          </div>

        </div>
      </div>

      {/* PRINT MEDIA STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all application headers, sidebars, mobile dock, and controls */
          header, aside, nav, .print\\:hidden, button, .mobile-dock {
            display: none !important;
          }
          /* Center only printable standee */
          #printable-standee {
            box-shadow: none !important;
            border-width: 2px !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            height: 98vh !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
};
