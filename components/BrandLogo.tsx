import Image from 'next/image';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  showText = true,
  subtitle = 'Charters, Tours & Rentals',
  className = '',
}: BrandLogoProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div className={`${sizeClasses[size]} relative shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${isDark ? 'ring-white/15' : 'ring-slate-200'}`}>
        <Image
          src="/inyathi-logo.svg"
          alt="Inyathi Charters, Tours & Rentals logo"
          fill
          sizes="64px"
          className="object-contain p-1"
          priority
          unoptimized
        />
      </div>
      {showText && (
        <div className="min-w-0 leading-tight">
          <p className={`text-sm font-black tracking-[0.18em] uppercase ${isDark ? 'text-white' : 'text-slate-950'}`}>INYATHI</p>
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>{subtitle}</p>
        </div>
      )}
    </div>
  );
}
