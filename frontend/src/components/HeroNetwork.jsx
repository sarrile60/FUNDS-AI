// HeroNetwork — premium animated fund-tracing graph (pure SVG + CSS)
// Shows victim → payment rails → recipient nodes → risk → report
import React from "react";
import { useI18n } from "../i18n";

const NODE = ({ x, y, label, sub, icon, color = "#5FE3C9", size = 38, dataId }) => (
  <g transform={`translate(${x} ${y})`} data-testid={dataId}>
    <circle r={size + 8} fill={color} opacity="0.08" className="aif-pulse" />
    <circle r={size} fill="rgba(8,16,38,0.95)" stroke={color} strokeWidth="1.4" />
    <foreignObject x={-size + 6} y={-size + 6} width={(size - 6) * 2} height={(size - 6) * 2}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 18 }}>
        {icon}
      </div>
    </foreignObject>
    <text x="0" y={size + 18} textAnchor="middle" fill="#E6EDF7" fontSize="11" fontWeight="600">{label}</text>
    {sub && <text x="0" y={size + 32} textAnchor="middle" fill="#9FB0CC" fontSize="9.5">{sub}</text>}
  </g>
);

const LINK = ({ x1, y1, x2, y2, color = "#5FE3C9", delay = 0, dashed = true }) => (
  <g>
    <path d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
          stroke={color} strokeOpacity="0.25" strokeWidth="1.4" fill="none"/>
    {dashed && (
      <path d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
            stroke={color} strokeWidth="2" fill="none"
            className="aif-flow-line" style={{ animationDelay: `${delay}s` }} />
    )}
  </g>
);

export default function HeroNetwork() {
  const { t, lang } = useI18n();
  const tag1 = t("hero.live");
  const tag2 = t("hero.risk");
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 800 480" className="w-full h-auto" data-testid="hero-network">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#5FE3C9" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#5FE3C9" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="grad-line" x1="0" x2="1">
            <stop offset="0" stopColor="#5FE3C9"/>
            <stop offset="1" stopColor="#6E8BFF"/>
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="800" height="480" fill="url(#bgGlow)"/>

        {/* lines (under nodes) */}
        <LINK x1="100" y1="230" x2="280" y2="120" color="#5FE3C9" delay={0}/>
        <LINK x1="100" y1="230" x2="280" y2="230" color="#5FE3C9" delay={0.5}/>
        <LINK x1="100" y1="230" x2="280" y2="340" color="#5FE3C9" delay={1.0}/>

        <LINK x1="280" y1="120" x2="500" y2="160" color="#6E8BFF" delay={0.4}/>
        <LINK x1="280" y1="230" x2="500" y2="230" color="#6E8BFF" delay={0.9}/>
        <LINK x1="280" y1="340" x2="500" y2="300" color="#6E8BFF" delay={1.3}/>

        <LINK x1="500" y1="160" x2="690" y2="120" color="#FF8B6A" delay={0.8}/>
        <LINK x1="500" y1="230" x2="690" y2="230" color="#FF8B6A" delay={1.4}/>
        <LINK x1="500" y1="300" x2="690" y2="340" color="#FF8B6A" delay={1.8}/>

        {/* Nodes */}
        <NODE x="100" y="230" label={t("hn.victim")} sub={lang === "en" ? "Italy" : "Italia"} color="#5FE3C9" size={32} icon="👤" dataId="node-victim"/>

        <NODE x="280" y="120" label={t("hn.sepa")}     sub={t("hn.sepa.sub")}    color="#5FE3C9" size={28} icon="🏦"/>
        <NODE x="280" y="230" label="PostePay"          sub={t("hn.postepay.sub")} color="#5FE3C9" size={28} icon="💳"/>
        <NODE x="280" y="340" label={t("hn.crypto")}    sub={t("hn.crypto.sub")}  color="#5FE3C9" size={28} icon="₿"/>

        <NODE x="500" y="160" label={t("hn.iban")}      sub={t("hn.iban.sub")}    color="#6E8BFF" size={24} icon="🏛️"/>
        <NODE x="500" y="230" label={t("hn.merchant")}  sub={t("hn.merchant.sub")} color="#6E8BFF" size={24} icon="🔗"/>
        <NODE x="500" y="300" label={t("hn.mule")}      sub={t("hn.mule.sub")}    color="#6E8BFF" size={24} icon="⚠"/>

        <NODE x="690" y="120" label={t("hn.bank_complaint")} sub="Recall SEPA"   color="#FFB454" size={24} icon="📄"/>
        <NODE x="690" y="230" label={t("hn.freeze")}    sub="Compliance"          color="#FFB454" size={24} icon="❄"/>
        <NODE x="690" y="340" label={t("hn.police")}    sub={t("hn.police.sub")}  color="#FF6B7A" size={24} icon="🛡"/>

        {/* Particles */}
        {[...Array(8)].map((_, i) => (
          <circle key={i} r="2.5" fill="#5FE3C9" opacity="0.9">
            <animateMotion dur={`${3 + (i % 4)}s`} repeatCount="indefinite" begin={`${i * 0.4}s`}
              path={`M 100 230 C 250 ${120 + i * 10}, 420 ${230 + (i % 3) * 20}, 690 ${120 + (i % 3) * 110}`}/>
          </circle>
        ))}
      </svg>

      {/* Floating chips */}
      <div className="absolute top-2 left-2 aif-chip text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-[#5FE3C9] aif-pulse inline-block"/> {tag1}</div>
      <div className="absolute bottom-2 right-2 aif-chip text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8B6A] aif-pulse inline-block"/> {tag2}</div>
    </div>
  );
}
