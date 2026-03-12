import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', variant = 'color' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const colorMap = {
    light: 'text-white',
    dark: 'text-indigo-950',
    color: 'text-indigo-600'
  };

  return (
    <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Outer Glow Background */}
      <div className={`absolute inset-0 rounded-2xl opacity-20 blur-xl ${variant === 'light' ? 'bg-white' : 'bg-indigo-600'}`}></div>
      
      {/* Logo Container */}
      <div className={`relative z-10 w-full h-full rounded-2xl flex items-center justify-center overflow-hidden border shadow-inner transition-transform duration-500 hover:rotate-3 ${variant === 'light' ? 'bg-white/10 border-white/20' : 'bg-[#1e1b4b] border-indigo-900'}`}>
        <svg 
          viewBox="0 0 100 100" 
          className={`w-3/5 h-3/5 fill-current ${colorMap[variant] === 'text-indigo-600' ? 'text-indigo-400' : colorMap[variant]}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M50 5L15 25V75L50 95L85 75V25L50 5Z" fillOpacity="0.1" />
          <path d="M50 15L25 30V70L50 85L75 70V30L50 15ZM50 25C54.4183 25 58 28.5817 58 33C58 37.4183 54.4183 41 50 41C45.5817 41 42 37.4183 42 33C42 28.5817 45.5817 25 50 25ZM35 60V55H65V60C65 64.1421 61.6421 67.5 57.5 67.5H42.5C38.3579 67.5 35 64.1421 35 60Z" />
          <path d="M50 45L40 55H60L50 45Z" />
        </svg>
      </div>
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none"></div>
    </div>
  );
};

export default Logo;