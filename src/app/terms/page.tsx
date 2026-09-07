import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Dynish',
  description: 'Merchant terms and platform conditions of use for Dynish Technologies.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-espresso-950 font-sans p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8 py-8">
        <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
          <BrandLogo size="md" subtext="Legal Documentation" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-espresso-700 hover:text-espresso-950 bg-ivory-100 px-3 py-2 rounded-xl border border-ivory-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-ivory-200 shadow-soft space-y-6">
          <div className="flex items-center gap-2 text-brand-800 font-bold text-xs">
            <FileText className="w-4 h-4" />
            <span>Effective Date: September 2026</span>
          </div>

          <h1 className="font-sans text-3xl font-extrabold text-espresso-950">
            Terms of Service
          </h1>

          <div className="space-y-4 text-xs sm:text-sm text-espresso-700 leading-relaxed">
            <p>
              Please review these Terms of Service carefully before utilizing the Dynish platform at <strong>dynish.com</strong>. By accessing or creating a store on Dynish, you agree to be bound by these terms.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              1. Platform Services &amp; 14-Day Free Trial
            </h2>
            <p>
              Dynish provides software as a service (SaaS) including counter billing recording tools, digital storefront hosting, and WhatsApp receipt dispatch. Every newly created store receives a <strong>14-day full-access trial</strong> without upfront payment obligations.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              2. Subscription Pricing &amp; Renewals
            </h2>
            <p>
              Following the expiration of your 14-day trial period, continuing active storefront hosting and counter billing access requires an active merchant subscription billed at <strong>₹199 / month</strong> (or annual equivalent). Subscriptions may be recharged or cancelled at any time from your Merchant Dashboard without cancellation penalties.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              3. Merchant Responsibilities &amp; Acceptable Use
            </h2>
            <p>
              Merchants agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-espresso-600">
              <li>Accurately represent item pricing, product availability, and contact details on their digital catalogue.</li>
              <li>Obtain verbal or explicit consent from walk-in patrons prior to recording their mobile number for WhatsApp receipts.</li>
              <li>Refrain from listing prohibited, counterfeit, fraudulent, or hazardous merchandise under applicable Indian penal laws.</li>
            </ul>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              4. Service Availability &amp; Support
            </h2>
            <p>
              Dynish strives to maintain 99.9% platform availability. Direct founder and merchant support is provided 24/7 via WhatsApp at <strong>+91 97041 00544</strong>.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              5. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These Terms shall be construed and governed in accordance with the laws of India, and any disputes shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
