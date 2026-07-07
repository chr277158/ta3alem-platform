'use client';

import { ReactNode } from 'react';

interface ShakeEffectProps {
  children: ReactNode;
  shake: boolean;
}

export default function ShakeEffect({ children, shake }: ShakeEffectProps) {
  return (
    <div
      className={`transition-transform ${
        shake ? 'animate-shake' : ''
      }`}
    >
      {children}
    </div>
  );
}