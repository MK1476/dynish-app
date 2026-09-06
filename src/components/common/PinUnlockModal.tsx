'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, X, AlertCircle } from 'lucide-react';

interface PinUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unlockOwnerMode: (pin: string) => boolean;
}

export const PinUnlockModal: React.FC<PinUnlockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  unlockOwnerMode,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        const ok = unlockOwnerMode(nextPin);
        if (ok) {
          setPin('');
          onSuccess();
        } else {
          setError('Incorrect PIN. Contact the store owner.');
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl border border-ivory-200 text-center animate-scale-in">
        <div className="flex justify-end mb-1">
          <button onClick={onClose} className="p-1 rounded-lg text-espresso-400 hover:text-espresso-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mb-3 shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="font-sans font-extrabold text-xl text-espresso-950">
          Owner PIN Required
        </h3>
        <p className="text-xs text-espresso-500 mt-1 mb-4">
          Enter 4-digit PIN to exit Cashier Mode and access management screens.
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > idx
                  ? 'bg-espresso-950 border-espresso-950 scale-110'
                  : 'bg-ivory-100 border-ivory-300'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200 flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Number Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="w-16 h-12 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-950 font-sans font-bold text-lg border border-ivory-300 active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="w-16 h-12 rounded-xl bg-ivory-50 hover:bg-ivory-100 text-espresso-500 text-xs font-semibold border border-ivory-200"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-16 h-12 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-espresso-950 font-sans font-bold text-lg border border-ivory-300 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="w-16 h-12 rounded-xl bg-ivory-50 hover:bg-ivory-100 text-espresso-700 text-xs font-semibold border border-ivory-200"
          >
            ⌫
          </button>
        </div>

        <p className="text-[10px] text-espresso-400 mt-4">
          Default Owner PIN is <span className="font-sans font-bold text-espresso-700">1234</span>
        </p>
      </div>
    </div>
  );
};
