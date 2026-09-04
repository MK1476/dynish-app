'use client';

import { useState, useEffect } from 'react';

const PIN_STORAGE_KEY = 'dynish_owner_pin';
const STAFF_MODE_KEY = 'dynish_staff_mode_active';

export function useStaffMode() {
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [customPin, setCustomPin] = useState('1234');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem(STAFF_MODE_KEY);
      const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
      if (storedMode === 'true') {
        setIsStaffMode(true);
      }
      if (storedPin) {
        setCustomPin(storedPin);
      }
      setIsInitialized(true);
    }
  }, []);

  const enableStaffMode = () => {
    setIsStaffMode(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STAFF_MODE_KEY, 'true');
    }
  };

  const unlockOwnerMode = (enteredPin: string): boolean => {
    const validPin = customPin || '1234';
    if (enteredPin === validPin) {
      setIsStaffMode(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STAFF_MODE_KEY, 'false');
      }
      return true;
    }
    return false;
  };

  const updatePin = (newPin: string) => {
    if (newPin.length === 4) {
      setCustomPin(newPin);
      if (typeof window !== 'undefined') {
        localStorage.setItem(PIN_STORAGE_KEY, newPin);
      }
      return true;
    }
    return false;
  };

  return {
    isStaffMode,
    isInitialized,
    enableStaffMode,
    unlockOwnerMode,
    updatePin,
    customPin,
  };
}
