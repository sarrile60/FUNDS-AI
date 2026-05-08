// HeroNetwork — premium fund-tracing graph (pure SVG + CSS)
// Shows international authorities and tracing connections
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useI18n } from "../i18n";

// Check if user prefers reduced motion or is on mobile
const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 768;
};

const NODE = ({ x, y, label, sub, icon, color = "#5FE3C9", size = 38, dataId, animate = true }) => (
  <g transform={`translate(${x} ${y})`} data-testid={dataId}>
    {animate && <circle r={size + 8} fill={color} opacity="0.08" className="aif-pulse" />}
    <circle r={size} fill="rgba(8,16,38,0.95)" stroke={color} strokeWidth="1.4" />
    <foreignObject x={-size + 6} y={-size + 6} width={(size - 6) * 2} height={(size - 6) * 2}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: size > 26 ? 18 : 14 }}>
        {icon}
      </div>
    </foreignObject>
    <text x="0" y={size + 16} textAnchor="middle" fill="#E6EDF7" fontSize="10" fontWeight="600">{label}</text>
    {sub && <text x="0" y={size + 28} textAnchor="middle" fill="#9FB0CC" fontSize="8">{sub}</text>}
  </g>
);

const LINK = ({ x1, y1, x2, y2, color = "#5FE3C9", delay = 0, dashed = true, animate = true }) => (
  <g>
    <path d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
          stroke={color} strokeOpacity="0.25" strokeWidth="1.2" fill="none"/>
    {dashed && animate && (
      <path d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
            stroke={color} strokeWidth="1.5" fill="none"
            className="aif-flow-line" style={{ animationDelay: `${delay}s` }} />
    )}
  </g>
);

export default function HeroNetwork({ animate = true }) {
  const { t, lang } = useI18n();
  const isIt = lang === "it";
  const tag1 = t("hero.live");
  const tag2 = t("hero.risk");
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (!ref.current || !animate || reducedMotion) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "50px", threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [animate, reducedMotion]);

  const live = animate && visible && !reducedMotion;

  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox="0 0 900 520" className="w-full h-auto" data-testid="hero-network">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#5FE3C9" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#5FE3C9" stopOpacity="0"/>
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="900" height="520" fill="url(#bgGlow)"/>

        {/* Column 1: Victim */}
        {/* Column 2: Payment Rails */}
        {/* Column 3: Destinations */}
        {/* Column 4: International Authorities */}
        {/* Column 5: Actions */}

        {/* Links from Victim to Payment Rails */}
        <LINK x1="80" y1="260" x2="220" y2="100" color="#5FE3C9" delay={0} animate={live}/>
        <LINK x1="80" y1="260" x2="220" y2="200" color="#5FE3C9" delay={0.3} animate={live}/>
        <LINK x1="80" y1="260" x2="220" y2="300" color="#5FE3C9" delay={0.6} animate={live}/>
        <LINK x1="80" y1="260" x2="220" y2="400" color="#5FE3C9" delay={0.9} animate={live}/>

        {/* Links from Payment Rails to Destinations */}
        <LINK x1="220" y1="100" x2="380" y2="120" color="#6E8BFF" delay={0.4} animate={live}/>
        <LINK x1="220" y1="200" x2="380" y2="200" color="#6E8BFF" delay={0.7} animate={live}/>
        <LINK x1="220" y1="300" x2="380" y2="280" color="#6E8BFF" delay={1.0} animate={live}/>
        <LINK x1="220" y1="400" x2="380" y2="360" color="#6E8BFF" delay={1.3} animate={live}/>

        {/* Links from Destinations to Authorities */}
        <LINK x1="380" y1="120" x2="560" y2="80" color="#FFB454" delay={0.8} animate={live}/>
        <LINK x1="380" y1="200" x2="560" y2="160" color="#FFB454" delay={1.1} animate={live}/>
        <LINK x1="380" y1="280" x2="560" y2="240" color="#FFB454" delay={1.4} animate={live}/>
        <LINK x1="380" y1="360" x2="560" y2="320" color="#FFB454" delay={1.7} animate={live}/>
        <LINK x1="380" y1="280" x2="560" y2="400" color="#FFB454" delay={2.0} animate={live}/>
        <LINK x1="380" y1="360" x2="560" y2="480" color="#FFB454" delay={2.3} animate={live}/>

        {/* Links from Authorities to Actions */}
        <LINK x1="560" y1="80" x2="760" y2="100" color="#FF6B7A" delay={1.2} animate={live}/>
        <LINK x1="560" y1="160" x2="760" y2="200" color="#FF6B7A" delay={1.5} animate={live}/>
        <LINK x1="560" y1="240" x2="760" y2="300" color="#FF6B7A" delay={1.8} animate={live}/>
        <LINK x1="560" y1="320" x2="760" y2="400" color="#FF6B7A" delay={2.1} animate={live}/>
        <LINK x1="560" y1="400" x2="760" y2="300" color="#FF6B7A" delay={2.4} animate={live}/>

        {/* Column 1: Victim */}
        <NODE x="80" y="260" label={isIt ? "Vittima" : "Victim"} sub="" color="#5FE3C9" size={32} icon="👤" dataId="node-victim" animate={live}/>

        {/* Column 2: Payment Rails */}
        <NODE x="220" y="100" label="SEPA" sub={isIt ? "Bonifico" : "Wire"} color="#5FE3C9" size={24} icon="🏦" animate={live}/>
        <NODE x="220" y="200" label="PostePay" sub={isIt ? "Ricarica" : "Top-up"} color="#5FE3C9" size={24} icon="💳" animate={live}/>
        <NODE x="220" y="300" label="Crypto" sub="On-chain" color="#5FE3C9" size={24} icon="₿" animate={live}/>
        <NODE x="220" y="400" label="Card" sub={isIt ? "Carta" : "Payment"} color="#5FE3C9" size={24} icon="💳" animate={live}/>

        {/* Column 3: Destinations */}
        <NODE x="380" y="120" label="IBAN" sub={isIt ? "Estero" : "Foreign"} color="#6E8BFF" size={22} icon="🏛️" animate={live}/>
        <NODE x="380" y="200" label={isIt ? "Broker" : "Broker"} sub={isIt ? "Falso" : "Fake"} color="#6E8BFF" size={22} icon="📈" animate={live}/>
        <NODE x="380" y="280" label="Wallet" sub={isIt ? "Sospetto" : "Suspect"} color="#6E8BFF" size={22} icon="👛" animate={live}/>
        <NODE x="380" y="360" label="Exchange" sub={isIt ? "Esposto" : "Exposed"} color="#6E8BFF" size={22} icon="🔄" animate={live}/>

        {/* Column 4: International Authorities */}
        <NODE x="560" y="80" label="BCE" sub={isIt ? "Banca Centrale" : "Central Bank"} color="#FFB454" size={20} icon="🇪🇺" animate={live}/>
        <NODE x="560" y="160" label="EUROPOL" sub={isIt ? "Polizia UE" : "EU Police"} color="#FFB454" size={20} icon="🔵" animate={live}/>
        <NODE x="560" y="240" label="INTERPOL" sub={isIt ? "Internazionale" : "International"} color="#FFB454" size={20} icon="🌐" animate={live}/>
        <NODE x="560" y="320" label="OLAF" sub={isIt ? "Anti-Frode" : "Anti-Fraud"} color="#FFB454" size={20} icon="🛡️" animate={live}/>
        <NODE x="560" y="400" label="AML" sub={isIt ? "Anti-Riciclaggio" : "Anti-Launder"} color="#FFB454" size={20} icon="🔍" animate={live}/>
        <NODE x="560" y="480" label="BLOCKCHAIN" sub={isIt ? "Analisi" : "Analysis"} color="#FFB454" size={20} icon="⛓️" animate={live}/>

        {/* Column 5: Actions */}
        <NODE x="760" y="100" label={isIt ? "Reclamo" : "Complaint"} sub={isIt ? "Banca" : "Bank"} color="#FF6B7A" size={22} icon="📄" animate={live}/>
        <NODE x="760" y="200" label="CONSOB" sub={isIt ? "Segnalazione" : "Filing"} color="#FF6B7A" size={22} icon="⚖️" animate={live}/>
        <NODE x="760" y="300" label="Freeze" sub={isIt ? "Exchange" : "Exchange"} color="#FF6B7A" size={22} icon="❄️" animate={live}/>
        <NODE x="760" y="400" label={isIt ? "Polizia" : "Police"} sub={isIt ? "Denuncia" : "Report"} color="#FF6B7A" size={22} icon="🚔" animate={live}/>

        {/* Particles */}
        {live && [...Array(4)].map((_, i) => (
          <circle key={i} r="2" fill="#5FE3C9" opacity="0.9">
            <animateMotion dur={`${6 + i}s`} repeatCount="indefinite" begin={`${i * 1.5}s`}
              path={`M 80 260 C 200 ${100 + i * 50}, 450 ${150 + i * 40}, 760 ${100 + i * 100}`}/>
          </circle>
        ))}
      </svg>

      {/* Floating chips */}
      <div className="absolute top-2 left-2 aif-chip text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-[#5FE3C9] aif-pulse inline-block"/> {tag1}</div>
      <div className="absolute bottom-2 right-2 aif-chip text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8B6A] aif-pulse inline-block"/> {tag2}</div>
    </div>
  );
}
