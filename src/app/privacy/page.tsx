import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Dynish',
  description: 'Privacy Policy and data protection terms for Dynish merchants and customers.',
};

export default function PrivacyPage() {
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
            <Shield className="w-4 h-4" />
            <span>Last Updated: September 2026</span>
          </div>

          <h1 className="font-sans text-3xl font-extrabold text-espresso-950">
            Privacy Policy
          </h1>

          <div className="space-y-4 text-xs sm:text-sm text-espresso-700 leading-relaxed">
            <p>
              Dynish Technologies (&quot;Dynish&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) values your trust and is committed to protecting the privacy of our merchants (&quot;Vendors&quot;) and their patrons (&quot;Customers&quot;). This Privacy Policy describes how we collect, store, process, and safeguard your data when using the Dynish platform at <strong>dynish.com</strong>.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              1. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-espresso-600">
              <li><strong>Merchant Profile:</strong> Store name, trade category, physical location/market address, contact phone number, WhatsApp number, store logos, and promotional banners.</li>
              <li><strong>Counter Billing Records:</strong> Transaction amounts, timestamps, invoice serial numbers, and customer mobile numbers entered at the counter solely for dispatching WhatsApp electronic receipts and loyalty vouchers.</li>
              <li><strong>Patron Preferences:</strong> Saved wishlist bookmarks and inquiry messages initiated via WhatsApp.</li>
              <li><strong>Authentication &amp; Device Data:</strong> Mobile numbers verified via OTP, browser user-agent tokens, session cookies, and IP addresses.</li>
            </ul>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              2. How We Use Your Information
            </h2>
            <p>
              We utilize collected data solely for providing and improving our core service:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-espresso-600">
              <li>Enabling sub-5-second counter billing and electronic receipt dispatch via WhatsApp.</li>
              <li>Hosting fast, mobile-friendly digital catalogues and generating QR standees.</li>
              <li>Calculating business analytics such as peak rush hour footfall and top patron retention metrics.</li>
              <li>Processing monthly merchant platform subscriptions through accredited payment gateways (Razorpay).</li>
            </ul>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              3. Data Ownership &amp; Zero Selling Policy
            </h2>
            <p>
              <strong>We never sell, rent, or trade merchant or customer data to third-party advertising networks.</strong> Your customer database belongs exclusively to your business. Customer phone numbers logged at the counter are never exposed publicly or shared with other competing merchants.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              4. Payment &amp; Security Standards
            </h2>
            <p>
              All merchant subscription transactions are processed directly through Razorpay using industry-standard 256-bit TLS encryption. Dynish does not store sensitive credit card numbers, CVVs, or UPI MPINs on our servers.
            </p>

            <h2 className="font-sans text-base sm:text-lg font-bold text-espresso-950 pt-2">
              5. Contact Us
            </h2>
            <p>
              If you have any questions or data concerns, please contact our data team directly via WhatsApp at <strong>+91 97041 00544</strong> or write to us at <strong>support@dynish.com</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
