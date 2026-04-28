// AI-FUNDS Logo - inline SVG
import React from "react";
import { useI18n } from "../i18n";

export default function Logo({ size = 36 }) {
  const { lang } = useI18n();
  return (
    <div className="flex items-center gap-2.5" data-testid="aif-logo">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aifg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5FE3C9"/>
            <stop offset="1" stopColor="#6E8BFF"/>
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" stroke="url(#aifg)" strokeWidth="2.4"/>
        <path d="M16 44L26 22L36 44" stroke="url(#aifg)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 38H32" stroke="url(#aifg)" strokeWidth="3.6" strokeLinecap="round"/>
        <circle cx="46" cy="22" r="3" fill="#5FE3C9"/>
        <circle cx="46" cy="34" r="3" fill="#6E8BFF"/>
        <circle cx="46" cy="46" r="3" fill="#5FE3C9"/>
        <path d="M40 22L46 22M40 34L46 34M40 46L46 46" stroke="url(#aifg)" strokeWidth="1.6" opacity="0.6"/>
      </svg>
      <div className="leading-tight">
        <div className="font-extrabold tracking-tight text-[18px] text-white">AI-FUNDS</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#9FB0CC]">
          Fund Tracing • {lang === "en" ? "IT" : "Italia"}
        </div>
      </div>
    </div>
  );
}
