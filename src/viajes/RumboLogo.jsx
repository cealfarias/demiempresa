import React from 'react';

export default function RumboLogo({ className = 'h-8', showText = true, textClassName = 'text-xl' }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Ícono de Rumbo: Squircle negro con ruta verde lima y pin estilizado */}
      <div className="relative w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full fill-none" xmlns="http://www.w3.org/2000/svg">
          {/* Fondo squircle interior */}
          <rect width="100" height="100" rx="22" fill="#0B0F19" />
          
          {/* Ruta curvada verde lima */}
          <path
            d="M 18 82 Q 18 52 35 52 T 52 52 T 69 52"
            stroke="#A3E635"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Flecha y curva hacia arriba */}
          <path
            d="M 18 78 L 36 30 Q 42 22 52 30 L 52 70 Q 56 78 68 70 L 68 35"
            stroke="#A3E635"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pin de localización verde lima con centro oscuro */}
          <g transform="translate(68, 30)">
            <path
              d="M 0 -18 C -11 -18 -18 -10 -18 0 C -18 11 0 24 0 24 C 0 24 18 11 18 0 C 18 -10 11 -18 0 -18 Z"
              fill="#A3E635"
            />
            <circle cx="0" cy="0" r="6" fill="#0B0F19" />
          </g>

          {/* Flechas indicadoras de dirección */}
          <polygon points="36,44 42,32 48,44" fill="#A3E635" />
        </svg>
      </div>

      {/* Tipografía Oficial Rumbo */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight">
            <span className={`font-black text-white ${textClassName} tracking-tight leading-none`}>
              Rumbo
            </span>
          </div>
          <span className="text-[10px] text-lime-400 font-semibold tracking-wider uppercase -mt-0.5">
            Movilidad Directa
          </span>
        </div>
      )}
    </div>
  );
}
