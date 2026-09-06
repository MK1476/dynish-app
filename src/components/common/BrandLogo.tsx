import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtext?: string;
  inverted?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  subtext,
  inverted = false,
  className = '',
}) => {
  const sizeMap = {
    xs: { dim: 22, text: 'text-xs', sub: 'text-[8px]' },
    sm: { dim: 28, text: 'text-sm', sub: 'text-[9px]' },
    md: { dim: 36, text: 'text-lg', sub: 'text-[10px]' },
    lg: { dim: 48, text: 'text-xl', sub: 'text-xs' },
    xl: { dim: 64, text: 'text-3xl', sub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div 
        className="relative shrink-0 transition-transform active:scale-95 duration-200"
        style={{ width: current.dim, height: current.dim }}
      >
        <img
          src="/dynish-logo.png"
          alt="Dynish"
          width={current.dim}
          height={current.dim}
          className="w-full h-full object-contain filter drop-shadow-xs"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-sans font-black tracking-tight ${current.text} ${
              inverted ? 'text-white' : 'text-espresso-950'
            }`}>
              Dynish
            </span>
            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-brand-500 text-espresso-950 tracking-wider">
              2.0
            </span>
          </div>
          {subtext && (
            <span className={`font-medium tracking-wide uppercase mt-0.5 ${current.sub} ${
              inverted ? 'text-brand-300/80' : 'text-espresso-500'
            }`}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
