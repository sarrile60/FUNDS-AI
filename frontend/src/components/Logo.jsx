// Traccia Fondi Logo - inline SVG
import React from "react";
import { useI18n } from "../i18n";

export default function Logo({ size = 36 }) {
  const { lang } = useI18n();
  return (
    <div className="flex items-center gap-2.5" data-testid="aif-logo">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tfg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5FE3C9"/>
            <stop offset="1" stopColor="#6E8BFF"/>
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" stroke="url(#tfg)" strokeWidth="2.4"/>
        {/* Stylized "TF" monogram */}
        <path d="M14 20H30" stroke="url(#tfg)" strokeWidth="3.6" strokeLinecap="round"/>
        <path d="M22 20V44" stroke="url(#tfg)" strokeWidth="3.6" strokeLinecap="round"/>
        <path d="M34 20H50" stroke="url(#tfg)" strokeWidth="3.6" strokeLinecap="round"/>
        <path d="M34 20V44" stroke="url(#tfg)" strokeWidth="3.6" strokeLinecap="round"/>
        <path d="M34 31H46" stroke="url(#tfg)" strokeWidth="3.6" strokeLinecap="round"/>
        {/* Tracing dots on the right side, suggesting flow */}
        <circle cx="56" cy="48" r="2" fill="#5FE3C9"/>
        <circle cx="50" cy="52" r="1.6" fill="#6E8BFF" opacity="0.7"/>
      </svg>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-[17px] text-white">Traccia Fondi</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#9FB0CC]">
          Fund Tracing • {lang === "en" ? "IT" : "Italia"}
        </div>
      </div>
    </div>
  );
}
