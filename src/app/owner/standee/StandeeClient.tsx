'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Database } from '@/types/database';
import QRCode from 'qrcode';
import { 
  Printer, Download, Sparkles, Check, 
  ExternalLink, QrCode as QrCodeIcon, Image as ImageIcon, ArrowDownRight 
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

type ShopRow = Database['public']['Tables']['shops']['Row'];

interface StandeeClientProps {
  shop: ShopRow;
}

export const StandeeClient: React.FC<StandeeClientProps> = ({ shop }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [headline, setHeadline] = useState('BROWSE CATALOG & EXCITING OFFERS');
  const [origin, setOrigin] = useState('');
  const [downloadingImage, setDownloadingImage] = useState(false);
  const standeeCardRef = useRef<HTMLDivElement>(null);

  const storeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/store/${shop.slug || shop.id}`
    : `/store/${shop.slug || shop.id}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const url = `${window.location.origin}/store/${shop.slug || shop.id}`;
      QRCode.toDataURL(url, {
        width: 700,
        margin: 1.5,
        color: {
          dark: '#111827',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      }).then(setQrDataUrl);
    }
  }, [shop.id, shop.slug]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${shop.name.replace(/\s+/g, '_')}_QR.png`;
    a.click();
  };

  // High-Resolution Standee Image Exporter (Draws 1200x1800 canvas)
  const handleDownloadStandeeImage = async () => {
    setDownloadingImage(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Warm ivory background with subtle texture tone
      ctx.fillStyle = '#FAF7F2';
      ctx.fillRect(0, 0, 1200, 1800);

      // 2. Top curved header banner
      const grad = ctx.createLinearGradient(0, 0, 1200, 320);
      grad.addColorStop(0, '#F59E0B');
      grad.addColorStop(1, '#D97706');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(40, 40, 1120, 260, 40);
      ctx.fill();

      // Top banner inner border
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(50, 50, 1100, 240, 32);
      ctx.stroke();

      // Store Name in top banner
      ctx.fillStyle = '#1A1412';
      ctx.font = 'bold 54px serif';
      ctx.textAlign = 'center';
      ctx.fillText(shop.name, 600, 175);

      ctx.fillStyle = '#78350F';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(shop.category_label || shop.category || 'Retail Store', 600, 225);

      // 3. Main Call-To-Action Headline
      ctx.fillStyle = '#111827';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'center';
      
      const words = headline.split('&');
      if (words.length > 1) {
        ctx.fillText(words[0].trim(), 600, 420);
        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 36px serif';
        ctx.fillText('&', 600, 475);
        ctx.fillStyle = '#111827';
        ctx.font = '900 48px sans-serif';
        ctx.fillText(words[1].trim(), 600, 535);
      } else {
        ctx.fillText(headline, 600, 460);
      }

      // 4. White card for QR Code
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.beginPath();
      ctx.roundRect(225, 620, 750, 750, 48);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Draw QR image
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise((resolve) => {
          qrImg.onload = resolve;
        });
        ctx.drawImage(qrImg, 265, 660, 670, 670);
      }

      // 5. Instruction text below QR
      ctx.fillStyle = '#4B5563';
      ctx.font = '500 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan with any smartphone camera', 600, 1440);

      // 6. Powered by Dynish Branding at bottom
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Powered by', 600, 1560);

      // Load Dynish Logo
      const logoImg = new Image();
      logoImg.src = '/dynish-logo.png';
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });
      ctx.drawImage(logoImg, 460, 1600, 70, 70);

      ctx.fillStyle = '#1A1412';
      ctx.font = '900 52px serif';
      ctx.textAlign = 'left';
      ctx.fillText('DYNISH', 545, 1655);

      // Export as PNG
      const link = document.createElement('a');
      link.download = `${shop.name.replace(/\s+/g, '_')}_Counter_Standee.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (e) {
      console.error('Failed to export standee image:', e);
      alert('Failed to generate image. Please use Print Standee instead.');
    } finally {
      setDownloadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SCREEN CONTROLS (Hidden during printing) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-espresso-950">
              Counter QR Standee
            </h1>
            <p className="text-espresso-500 text-xs sm:text-sm mt-0.5">
              High-resolution, elegant standee card formatted for standard 4&quot;×6&quot; or 5&quot;×7&quot; acrylic desk frames.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadQrOnly}
              className="px-3.5 py-2.5 rounded-2xl bg-white border border-ivory-300 hover:bg-ivory-50 text-espresso-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-95"
              title="Download only the QR code image"
            >
              <Download className="w-4 h-4 text-espresso-600" />
              <span className="hidden sm:inline">QR Only</span>
            </button>

            <button
              onClick={handleDownloadStandeeImage}
              disabled={downloadingImage}
              className="px-4 py-2.5 rounded-2xl bg-white border-2 border-brand-500 hover:bg-brand-50 text-brand-900 text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-brand-600" />
              <span>{downloadingImage ? 'Generating...' : 'Save as Image'}</span>
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

        {/* Custom Tagline input */}
        <div className="bg-white p-4 rounded-2xl border border-ivory-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <label className="block text-[11px] font-bold text-espresso-700 uppercase tracking-wider mb-1">
              Call-To-Action Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-ivory-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
              placeholder="e.g. BROWSE CATALOG & EXCITING OFFERS"
            />
          </div>

          <div className="text-xs text-espresso-500 shrink-0">
            <span>Links to: </span>
            <span className="font-mono font-bold text-espresso-950 truncate max-w-[200px] inline-block align-bottom">
              /store/{shop.slug || shop.id}
            </span>
          </div>
        </div>
      </div>

      {/* STANDEE CARD (PREVIEW & PRINTABLE ZONE) */}
      <div className="flex justify-center">
        <div 
          ref={standeeCardRef}
          id="printable-standee"
          className="relative w-full max-w-[380px] aspect-[1/1.5] bg-[#FAF7F2] rounded-[32px] p-6 shadow-2xl border-4 border-amber-400/80 flex flex-col justify-between items-center text-center overflow-hidden transition-all"
        >
          {/* Subtle textured paper overlay effect */}
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* 1. TOP CURVED STORE HEADER */}
          <div className="w-full relative z-10">
            <div className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-3.5 shadow-md border border-amber-300/80 flex flex-col items-center justify-center">
              {shop.logo_url && (
                <div className="w-12 h-12 rounded-xl p-0.5 bg-white shadow-xs mb-1.5 overflow-hidden">
                  <img src={shop.logo_url} alt="" className="w-full h-full object-cover rounded-[10px]" />
                </div>
              )}
              <h2 className="font-serif text-xl sm:text-2xl font-black text-espresso-950 tracking-tight leading-tight">
                {shop.name}
              </h2>
              <span className="text-[10px] uppercase font-extrabold text-amber-950/80 tracking-wider mt-0.5">
                {shop.category_label || shop.category || 'Retail Store'}
              </span>
            </div>
          </div>

          {/* 2. CALL-TO-ACTION WITH ELEGANT CURVED ARROW */}
          <div className="my-auto py-2 relative z-10 w-full flex flex-col items-center">
            <div className="relative inline-block max-w-[280px]">
              <h3 className="font-sans font-black text-lg sm:text-xl text-espresso-950 tracking-tight uppercase leading-snug">
                {headline.includes('&') ? (
                  <>
                    <span>{headline.split('&')[0].trim()}</span>
                    <span className="block font-serif italic text-amber-600 text-base font-normal my-0.5">&amp;</span>
                    <span>{headline.split('&')[1].trim()}</span>
                  </>
                ) : (
                  headline
                )}
              </h3>

              {/* Hand-drawn stylish arrow pointing to QR */}
              <div className="absolute -right-7 -bottom-4 text-espresso-900 pointer-events-none">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform rotate-12">
                  <path d="M6 3C18 7 28 17 26 31M26 31L18 27M26 31L31 23" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* 3. HIGH-RESOLUTION WHITE QR CARD */}
            <div className="mt-4 bg-white p-3.5 sm:p-4 rounded-3xl shadow-xl border border-ivory-200 ring-4 ring-amber-400/30 inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Store QR Code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-espresso-400">
                  Generating high-res QR...
                </div>
              )}
            </div>

            <p className="text-[11px] font-medium text-espresso-500 mt-2">
              Scan with any phone camera
            </p>
            <p className="text-[10px] font-mono font-bold text-espresso-600 mt-0.5">
              {storeUrl.replace(/^https?:\/\//, '')}
            </p>
          </div>

          {/* 4. CLEAN POWERED BY DYNISH FOOTER */}
          <div className="w-full pt-2 border-t border-amber-400/30 flex flex-col items-center justify-center relative z-10">
            <span className="text-[9px] uppercase tracking-widest text-espresso-500 font-bold mb-0.5">
              Powered by
            </span>
            <div className="flex items-center gap-1.5">
              <img src="/dynish-logo.png" alt="Dynish" className="w-5 h-5 object-contain" />
              <span className="font-serif font-black text-sm tracking-wider text-espresso-950">
                DYNISH
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* PRINT MEDIA STYLES (Centers standee on standard page) */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, aside, nav, .print\\:hidden, button, .mobile-dock {
            display: none !important;
          }
          #printable-standee {
            box-shadow: none !important;
            border-width: 3px !important;
            margin: 20px auto !important;
            max-width: 420px !important;
            width: 100% !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
};
