interface AnimeSceneBgProps {
  scene: 'ocean' | 'space';
  className?: string;
}

export function AnimeSceneBg({ scene, className = '' }: AnimeSceneBgProps) {
  if (scene === 'space') return <SpaceScene className={className} />;
  return <OceanScene className={className} />;
}

/* ──────────────────────────────────────────────────────
   OCEAN SCENE  (海辺の少女)
────────────────────────────────────────────────────── */
function OceanScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 700"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Sky gradient */}
        <linearGradient id="oc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#5BC8F0" />
          <stop offset="55%"  stopColor="#87DCFF" />
          <stop offset="100%" stopColor="#C2EDFF" />
        </linearGradient>
        {/* Ocean gradient */}
        <linearGradient id="oc-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1AA7D6" />
          <stop offset="50%"  stopColor="#0E8BB5" />
          <stop offset="100%" stopColor="#085F82" />
        </linearGradient>
        {/* Deep sea */}
        <linearGradient id="oc-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0E8BB5" />
          <stop offset="100%" stopColor="#04384D" />
        </linearGradient>
        {/* Foam/shore */}
        <linearGradient id="oc-foam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#A8E4F5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6CC8E8" stopOpacity="0.4" />
        </linearGradient>
        {/* Cloud shadow */}
        <radialGradient id="oc-cloud-shadow" cx="50%" cy="70%" r="50%">
          <stop offset="0%"   stopColor="#D9F0FA" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </radialGradient>
        {/* Skin */}
        <linearGradient id="oc-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFD5B5" />
          <stop offset="100%" stopColor="#F0B896" />
        </linearGradient>
        {/* Hair */}
        <linearGradient id="oc-hair" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%"  stopColor="#1C1F3A" />
          <stop offset="40%" stopColor="#0F1226" />
          <stop offset="100%" stopColor="#2E3258" />
        </linearGradient>
        {/* Shirt */}
        <linearGradient id="oc-shirt" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%"   stopColor="#F8F8FF" />
          <stop offset="100%" stopColor="#DDE8F0" />
        </linearGradient>
        {/* Sparkle glow */}
        <radialGradient id="oc-sparkle" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Cheek blush */}
        <radialGradient id="oc-blush" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFB3B3" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFB3B3" stopOpacity="0" />
        </radialGradient>
        {/* Horizon glow */}
        <radialGradient id="oc-horizon" cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id="oc-blur-sm">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id="oc-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Sky ── */}
      <rect width="400" height="420" fill="url(#oc-sky)" />

      {/* Horizon glow */}
      <ellipse cx="200" cy="350" rx="250" ry="60" fill="url(#oc-horizon)" />

      {/* ── Clouds (background, small) ── */}
      <g opacity="0.85">
        <ellipse cx="320" cy="80" rx="45" ry="22" fill="white" />
        <ellipse cx="348" cy="72" rx="28" ry="18" fill="white" />
        <ellipse cx="295" cy="75" rx="25" ry="16" fill="white" />
        <ellipse cx="322" cy="92" rx="40" ry="14" fill="#EEF8FE" />
      </g>
      <g opacity="0.75">
        <ellipse cx="50" cy="110" rx="38" ry="18" fill="white" />
        <ellipse cx="74" cy="103" rx="22" ry="15" fill="white" />
        <ellipse cx="28" cy="107" rx="20" ry="13" fill="white" />
      </g>
      <g opacity="0.6">
        <ellipse cx="155" cy="65" rx="30" ry="13" fill="white" />
        <ellipse cx="175" cy="58" rx="18" ry="11" fill="white" />
        <ellipse cx="135" cy="62" rx="16" ry="10" fill="white" />
      </g>

      {/* ── Clouds (foreground, large) ── */}
      <g filter="url(#oc-blur-sm)" opacity="0.9">
        <ellipse cx="90" cy="170" rx="70" ry="32" fill="url(#oc-cloud-shadow)" />
        <ellipse cx="130" cy="155" rx="48" ry="30" fill="white" />
        <ellipse cx="60"  cy="165" rx="40" ry="26" fill="white" />
        <ellipse cx="100" cy="183" rx="65" ry="22" fill="#EEF8FE" />
        <ellipse cx="148" cy="165" rx="30" ry="22" fill="white" />
      </g>
      <g filter="url(#oc-blur-sm)" opacity="0.85">
        <ellipse cx="310" cy="190" rx="60" ry="28" fill="url(#oc-cloud-shadow)" />
        <ellipse cx="340" cy="177" rx="42" ry="26" fill="white" />
        <ellipse cx="280" cy="184" rx="38" ry="24" fill="white" />
        <ellipse cx="312" cy="200" rx="56" ry="19" fill="#EEF8FE" />
      </g>

      {/* Distant island */}
      <ellipse cx="310" cy="350" rx="55" ry="14" fill="#2A8B5A" opacity="0.85" />
      <ellipse cx="310" cy="342" rx="40" ry="10" fill="#3AAD6E" opacity="0.9" />

      {/* ── Ocean ── */}
      <rect x="0" y="340" width="400" height="360" fill="url(#oc-sea)" />
      <rect x="0" y="460" width="400" height="240" fill="url(#oc-deep)" />

      {/* Wave lines */}
      <g opacity="0.25" stroke="white" strokeWidth="1.2" fill="none">
        <path d="M0,380 Q50,374 100,380 Q150,386 200,380 Q250,374 300,380 Q350,386 400,380" />
        <path d="M0,408 Q60,402 120,408 Q180,414 240,408 Q300,402 360,408 Q380,411 400,408" />
        <path d="M0,440 Q80,434 160,440 Q240,446 320,440 Q360,437 400,440" />
        <path d="M0,480 Q70,474 140,480 Q210,486 280,480 Q340,475 400,480" />
      </g>

      {/* Sparkle on water */}
      {[
        [80,375],[140,390],[220,370],[285,388],[350,374],
        [60,420],[170,415],[230,425],[310,418],[380,410],
        [45,460],[120,455],[195,462],[270,450],[355,458],
      ].map(([x, y], i) => (
        <g key={i} filter="url(#oc-glow)">
          <circle cx={x} cy={y} r={i % 3 === 0 ? 3 : 2} fill="white" opacity={0.6 + (i % 4) * 0.1} />
        </g>
      ))}

      {/* Shore foam */}
      <path d="M0,530 Q100,518 200,528 Q300,538 400,524 L400,560 L0,560 Z"
            fill="url(#oc-foam)" opacity="0.55" />
      <path d="M0,548 Q80,536 180,546 Q280,556 400,540 L400,570 L0,570 Z"
            fill="white" opacity="0.15" />

      {/* ── Character ── */}
      {/* Body / shirt */}
      <path d="M152,420 Q148,360 158,320 Q165,300 180,290 Q200,282 220,290 Q235,300 240,320 Q248,360 245,420 Z"
            fill="url(#oc-shirt)" />
      {/* Shirt creases */}
      <path d="M175,295 Q178,340 180,390" stroke="#C8D8E4" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M220,296 Q218,340 217,390" stroke="#C8D8E4" strokeWidth="1" fill="none" opacity="0.6" />
      {/* Collar */}
      <path d="M185,292 Q198,298 213,292" stroke="#BECFDA" strokeWidth="1.5" fill="none" opacity="0.7" />

      {/* Left arm reaching back */}
      <path d="M155,320 Q130,330 118,350 Q108,368 115,385 Q120,395 130,390 Q138,380 145,360 Q155,345 162,335"
            fill="url(#oc-skin)" />
      <path d="M155,320 Q130,330 118,350 Q108,368 115,385 Q120,395 130,390 Q138,380 145,360 Q155,345 162,335"
            stroke="#D4956E" strokeWidth="0.5" fill="none" opacity="0.4" />
      {/* Right arm */}
      <path d="M238,320 Q260,332 270,350 Q278,365 272,380 Q268,390 258,386 Q250,376 246,358 Q240,342 236,332"
            fill="url(#oc-skin)" />

      {/* Neck */}
      <path d="M188,292 Q198,296 210,292 L208,275 Q198,280 190,275 Z"
            fill="url(#oc-skin)" />

      {/* Head / face turned 3/4 */}
      <ellipse cx="200" cy="252" rx="36" ry="40" fill="url(#oc-skin)" />
      {/* Jaw / chin */}
      <path d="M172,270 Q178,296 200,300 Q222,296 228,270" fill="url(#oc-skin)" />

      {/* Ear */}
      <ellipse cx="165" cy="258" rx="8" ry="10" fill="#F0B896" />
      <ellipse cx="165" cy="258" rx="5" ry="7"  fill="#E8A882" />

      {/* ── Hair (back layer) ── */}
      <path d="M166,218 Q148,240 145,268 Q143,290 148,315 Q155,340 160,370 Q165,395 168,420"
            fill="url(#oc-hair)" />
      {/* Hair flowing in wind */}
      <path d="M168,218 Q155,235 148,255 Q138,278 128,295 Q115,318 100,335 Q88,350 75,360 Q60,370 45,375"
            stroke="url(#oc-hair)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M168,218 Q155,235 148,255 Q138,278 128,295 Q115,318 100,335 Q88,350 75,360 Q60,370 45,375"
            stroke="#2E3258" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Wind-blown strands */}
      <path d="M175,215 Q162,228 152,248 Q140,270 130,285 Q118,300 105,310"
            stroke="#1C1F3A" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M180,213 Q170,225 162,242 Q152,262 142,276"
            stroke="#1C1F3A" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* ── Hair (front layer) ── */}
      {/* Crown */}
      <path d="M165,218 Q180,205 200,202 Q220,205 232,215 Q238,222 235,232 Q228,225 218,220 Q200,215 182,220 Q172,224 168,232 Z"
            fill="url(#oc-hair)" />
      {/* Bangs */}
      <path d="M168,222 Q175,215 190,212 Q205,210 215,214 Q222,218 224,228 Q215,222 200,220 Q185,220 175,228 Z"
            fill="#1C1F3A" />
      {/* Side bang */}
      <path d="M168,232 Q162,245 164,262 Q165,272 170,275"
            stroke="#1C1F3A" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Highlight on hair */}
      <path d="M192,213 Q198,210 205,213" stroke="#4A5080" strokeWidth="2" fill="none" opacity="0.6" />

      {/* ── Eyes (looking back over shoulder) ── */}
      {/* Right eye (visible, turned) */}
      <ellipse cx="195" cy="252" rx="11" ry="10" fill="white" />
      {/* Iris */}
      <ellipse cx="195" cy="253" rx="8"  ry="9"  fill="#2850C8" />
      {/* Pupil */}
      <ellipse cx="196" cy="254" rx="5"  ry="6"  fill="#0A1A50" />
      {/* Eye shine (large) */}
      <ellipse cx="199" cy="250" rx="3"  ry="2.5" fill="white" />
      {/* Eye shine (small) */}
      <circle  cx="192" cy="256" r="1.5"           fill="white" opacity="0.8" />
      {/* Upper eyelid */}
      <path d="M184,249 Q195,244 206,249" stroke="#1C1F3A" strokeWidth="1.8" fill="none" />
      {/* Lower lash line */}
      <path d="M184,255 Q195,259 206,255" stroke="#1C1F3A" strokeWidth="0.8" fill="none" opacity="0.6" />
      {/* Eyelash flicks */}
      <path d="M185,249 L183,246 M188,247 L187,244 M192,246 L192,243" stroke="#1C1F3A" strokeWidth="1.2" />

      {/* Left eye (partially visible) */}
      <ellipse cx="175" cy="254" rx="7"  ry="7"  fill="white"   opacity="0.5" />
      <ellipse cx="175" cy="255" rx="5"  ry="6"  fill="#1E3EA0" opacity="0.6" />
      <ellipse cx="175" cy="256" rx="3"  ry="4"  fill="#0A1A50" opacity="0.6" />
      <circle  cx="177" cy="252" r="1.5"          fill="white"   opacity="0.5" />

      {/* Eyebrows */}
      <path d="M185,243 Q195,239 206,242" stroke="#1C1F3A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M168,246 Q175,243 182,245" stroke="#1C1F3A" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Nose */}
      <path d="M202,265 Q204,268 202,270" stroke="#D4956E" strokeWidth="1.2" fill="none" opacity="0.7" />

      {/* Mouth — soft smile */}
      <path d="M192,278 Q198,283 205,280" stroke="#C47A6A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M192,278 Q189,280 190,277" stroke="#C47A6A" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* Blush */}
      <ellipse cx="183" cy="270" rx="10" ry="6" fill="url(#oc-blush)" />
      <ellipse cx="213" cy="269" rx="10" ry="6" fill="url(#oc-blush)" />

      {/* Wind-blown hair strands over face */}
      <path d="M185,215 Q178,228 180,240 Q182,250 178,258"
            stroke="#1C1F3A" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M183,213 Q177,222 179,234"
            stroke="#1C1F3A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />

      {/* ── Bottom hair layer (flowing behind) ── */}
      <path d="M230,215 Q240,235 242,258 Q244,280 240,305 Q235,335 230,370 Q225,395 222,420"
            fill="url(#oc-hair)" />
      <path d="M165,370 Q162,395 160,420" fill="url(#oc-hair)" />

      {/* Subtle light on skin from ocean */}
      <path d="M168,275 Q165,265 168,255" stroke="#7FC4E0" strokeWidth="1" fill="none" opacity="0.3" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────
   SPACE SCENE  (宇宙飛行士の孤独)
────────────────────────────────────────────────────── */
function SpaceScene({ className }: { className?: string }) {
  const stars: Array<[number, number, number, number]> = [
    [30,40,1.5,0.9],[75,15,2,0.8],[120,55,1,0.7],[180,25,2.5,1],[240,60,1.2,0.85],
    [290,30,1.8,0.9],[340,50,1,0.75],[380,20,2,0.95],[20,120,1.5,0.8],[60,100,1,0.9],
    [110,130,2.2,0.85],[155,95,1.5,0.7],[200,115,1,0.9],[250,85,2,0.8],[295,120,1.2,0.95],
    [345,100,1.8,0.75],[385,130,1,0.85],[10,200,2,0.9],[50,185,1.5,0.8],[90,210,1,0.75],
    [365,190,1.8,0.85],[390,215,1.2,0.9],[35,310,1.5,0.8],[80,290,1,0.9],[130,325,2,0.85],
    [370,300,1,0.75],[395,325,1.5,0.9],[15,420,1.8,0.8],[55,400,1,0.85],[100,435,2.2,0.9],
    [350,410,1.2,0.8],[390,430,1.5,0.85],[25,550,1,0.9],[70,530,1.8,0.8],[115,565,1.5,0.75],
    [340,545,2,0.85],[375,560,1,0.9],[395,540,1.2,0.8],[145,170,1,0.7],[310,175,1.5,0.8],
    [170,450,1,0.75],[230,465,1.8,0.85],[270,440,1.2,0.9],[320,460,1,0.75],
  ];

  return (
    <svg
      viewBox="0 0 400 700"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Deep space bg */}
        <linearGradient id="sp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#04041A" />
          <stop offset="40%"  stopColor="#0A0A2E" />
          <stop offset="70%"  stopColor="#08082A" />
          <stop offset="100%" stopColor="#020210" />
        </linearGradient>
        {/* Nebula pink */}
        <radialGradient id="sp-nebula1" cx="30%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="#9B4DB8" stopOpacity="0.25" />
          <stop offset="60%"  stopColor="#6B2D88" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#4A1D68" stopOpacity="0" />
        </radialGradient>
        {/* Nebula blue */}
        <radialGradient id="sp-nebula2" cx="70%" cy="60%" r="55%">
          <stop offset="0%"   stopColor="#2E6BE0" stopOpacity="0.18" />
          <stop offset="60%"  stopColor="#1A4AA8" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0A1A50" stopOpacity="0" />
        </radialGradient>
        {/* Nebula teal */}
        <radialGradient id="sp-nebula3" cx="50%" cy="80%" r="50%">
          <stop offset="0%"   stopColor="#1ECAD0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0A8A90" stopOpacity="0" />
        </radialGradient>
        {/* Planet earth */}
        <radialGradient id="sp-earth" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#5DB8E8" />
          <stop offset="30%"  stopColor="#2E8CD4" />
          <stop offset="60%"  stopColor="#1A6EA8" />
          <stop offset="100%" stopColor="#0A3A6A" />
        </radialGradient>
        {/* Planet glow */}
        <radialGradient id="sp-earth-glow" cx="50%" cy="50%" r="50%">
          <stop offset="60%"  stopColor="#5DB8E8" stopOpacity="0" />
          <stop offset="80%"  stopColor="#3A9ED4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1A7EC0" stopOpacity="0.05" />
        </radialGradient>
        {/* Small planet */}
        <radialGradient id="sp-planet2" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#E8AA5A" />
          <stop offset="50%"  stopColor="#D4882A" />
          <stop offset="100%" stopColor="#8B4A0A" />
        </radialGradient>
        {/* Astronaut suit */}
        <linearGradient id="sp-suit" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%"   stopColor="#EEEEF8" />
          <stop offset="50%"  stopColor="#D8D8EC" />
          <stop offset="100%" stopColor="#B8B8D8" />
        </linearGradient>
        {/* Visor */}
        <linearGradient id="sp-visor" x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <stop offset="0%"   stopColor="#1A2A4A" />
          <stop offset="40%"  stopColor="#0A1A3A" />
          <stop offset="100%" stopColor="#060E25" />
        </linearGradient>
        {/* Visor reflection */}
        <linearGradient id="sp-visor-ref" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#4A8AE8" stopOpacity="0.5" />
          <stop offset="50%"  stopColor="#2A6AB8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0A3A88" stopOpacity="0" />
        </linearGradient>
        {/* Suit shadow */}
        <linearGradient id="sp-suit-shadow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#8888BB" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8888BB" stopOpacity="0" />
        </linearGradient>
        {/* Star glow */}
        <radialGradient id="sp-star-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="60%"  stopColor="#AABBFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Astronaut glow (floating) */}
        <radialGradient id="sp-astro-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#5090E8" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#5090E8" stopOpacity="0" />
        </radialGradient>
        <filter id="sp-glow-filter">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="sp-soft-glow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="sp-blur2">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* ── Background ── */}
      <rect width="400" height="700" fill="url(#sp-bg)" />

      {/* Nebula clouds */}
      <ellipse cx="120" cy="180" rx="180" ry="140" fill="url(#sp-nebula1)" />
      <ellipse cx="280" cy="380" rx="160" ry="130" fill="url(#sp-nebula2)" />
      <ellipse cx="200" cy="560" rx="200" ry="120" fill="url(#sp-nebula3)" />

      {/* Milky Way band */}
      <path d="M-10,200 Q100,280 200,320 Q300,360 420,300"
            stroke="white" strokeWidth="60" fill="none" opacity="0.03" filter="url(#sp-soft-glow)" />

      {/* ── Stars ── */}
      {stars.map(([x, y, r, op], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r * 2} fill="white" opacity={op * 0.15} filter="url(#sp-blur2)" />
          <circle cx={x} cy={y} r={r}     fill="white" opacity={op} />
        </g>
      ))}

      {/* Large bright stars (cross flare) */}
      {([[60,80,4],[350,150,3.5],[280,520,3],[150,600,3.5]] as [number,number,number][]).map(([x,y,r],i)=>(
        <g key={i} filter="url(#sp-glow-filter)">
          <circle cx={x} cy={y} r={r}     fill="white" />
          <line x1={x-r*3} y1={y} x2={x+r*3} y2={y} stroke="white" strokeWidth="0.6" opacity="0.6" />
          <line x1={x} y1={y-r*3} x2={x} y2={y+r*3} stroke="white" strokeWidth="0.6" opacity="0.6" />
        </g>
      ))}

      {/* ── Earth (large) ── */}
      <circle cx="310" cy="200" r="85" fill="url(#sp-earth-glow)" filter="url(#sp-soft-glow)" />
      <circle cx="310" cy="200" r="72" fill="url(#sp-earth)" />
      {/* Continent shapes */}
      <path d="M290,160 Q305,152 318,158 Q328,165 325,175 Q318,182 310,180 Q298,178 290,170 Z"
            fill="#3AB87A" opacity="0.85" />
      <path d="M330,170 Q340,165 348,172 Q352,180 346,188 Q338,192 330,186 Z"
            fill="#2EA068" opacity="0.75" />
      <path d="M275,185 Q285,182 292,190 Q295,198 289,204 Q280,206 275,198 Z"
            fill="#3AB87A" opacity="0.7" />
      {/* Clouds on earth */}
      <path d="M285,155 Q300,148 315,153 Q325,158 322,164 Q308,160 295,163 Z"
            fill="white" opacity="0.65" />
      <path d="M330,185 Q344,180 355,187 Q358,194 350,198 Q338,196 330,192 Z"
            fill="white" opacity="0.55" />
      {/* Atmosphere glow */}
      <circle cx="310" cy="200" r="75" fill="none" stroke="#7DCAEE" strokeWidth="5" opacity="0.25" />
      <circle cx="310" cy="200" r="78" fill="none" stroke="#5ABAEE" strokeWidth="3" opacity="0.12" />

      {/* ── Small planet (upper left) ── */}
      <circle cx="60" cy="350" r="28" fill="url(#sp-planet2)" />
      {/* Ring */}
      <ellipse cx="60" cy="358" rx="42" ry="10" fill="none"
               stroke="#E8AA5A" strokeWidth="4" opacity="0.55" />
      <ellipse cx="60" cy="358" rx="42" ry="10" fill="none"
               stroke="#D4882A" strokeWidth="2" opacity="0.3" />
      {/* Ring behind planet (clip) */}
      <path d="M20,352 Q40,344 60,342 Q80,344 100,352 L100,358 Q80,360 60,361 Q40,360 20,358 Z"
            fill="url(#sp-bg)" opacity="0.9" />
      {/* Planet shadow */}
      <path d="M45,330 Q35,345 38,365 Q42,380 60,382 Q50,372 48,355 Q46,342 55,332 Z"
            fill="#4A2E0A" opacity="0.4" />

      {/* ── Astronaut ── */}
      {/* Soft glow around astronaut */}
      <ellipse cx="195" cy="445" rx="60" ry="65" fill="url(#sp-astro-glow)" filter="url(#sp-soft-glow)" />

      {/* Backpack / life support */}
      <rect x="198" y="400" width="22" height="35" rx="4" fill="#C8C8E0" />
      <rect x="200" y="404" width="18" height="10" rx="2" fill="#A8A8C8" />
      <line x1="205" y1="416" x2="215" y2="416" stroke="#8888A8" strokeWidth="1.5" />
      <line x1="205" y1="420" x2="215" y2="420" stroke="#8888A8" strokeWidth="1" />

      {/* Tether cable */}
      <path d="M200,420 Q170,430 155,455 Q148,465 152,472"
            stroke="#D0D0E8" strokeWidth="1.5" fill="none" opacity="0.6" strokeDasharray="4,3" />

      {/* Torso */}
      <ellipse cx="188" cy="430" rx="30" ry="35" fill="url(#sp-suit)" />
      {/* Suit detail panel */}
      <rect x="175" y="418" width="25" height="18" rx="3" fill="#D0D0E8" />
      <rect x="178" y="421" width="8"  height="5"  rx="1" fill="#A8C8E8" opacity="0.9" />
      <rect x="188" y="421" width="8"  height="5"  rx="1" fill="#FFE080" opacity="0.7" />
      <rect x="178" y="428" width="18" height="3"  rx="1" fill="#B8B8D8" />
      {/* Suit seams */}
      <path d="M170,415 Q170,440 172,460" stroke="#C0C0DA" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M206,415 Q206,440 204,460" stroke="#C0C0DA" strokeWidth="1" fill="none" opacity="0.6" />
      {/* Suit shadow side */}
      <path d="M160,415 Q158,430 160,450 Q162,462 168,468 Q162,452 162,438 Q162,422 168,412 Z"
            fill="url(#sp-suit-shadow)" />

      {/* Left arm (floating out) */}
      <path d="M162,420 Q145,408 132,412 Q122,418 120,428 Q118,440 126,448 Q134,454 142,450 Q152,444 160,435"
            fill="url(#sp-suit)" />
      {/* Left glove */}
      <ellipse cx="120" cy="437" rx="10" ry="8" fill="#C8C8E0" />
      <path d="M112,432 Q108,437 110,443 Q113,447 118,446 Q122,445 124,440"
            stroke="#B0B0D0" strokeWidth="1" fill="none" opacity="0.6" />

      {/* Right arm (floating down) */}
      <path d="M212,420 Q228,428 238,440 Q244,450 240,460 Q236,468 228,466 Q220,462 218,452 Q214,440 212,430"
            fill="url(#sp-suit)" />
      {/* Right glove */}
      <ellipse cx="236" cy="462" rx="10" ry="8" fill="#C8C8E0" transform="rotate(-20,236,462)" />

      {/* Legs */}
      <path d="M172,460 Q168,488 166,510 Q164,528 168,540" stroke="url(#sp-suit)" strokeWidth="20" strokeLinecap="round" fill="none" />
      <path d="M204,460 Q208,488 210,510 Q212,528 208,540" stroke="url(#sp-suit)" strokeWidth="20" strokeLinecap="round" fill="none" />
      {/* Boots */}
      <ellipse cx="168" cy="543" rx="14" ry="9" fill="#B0B0D0" />
      <ellipse cx="208" cy="543" rx="14" ry="9" fill="#B0B0D0" />
      {/* Boot sole */}
      <path d="M154,548 Q168,554 182,548" stroke="#9090B8" strokeWidth="2" fill="none" />
      <path d="M194,548 Q208,554 222,548" stroke="#9090B8" strokeWidth="2" fill="none" />

      {/* Helmet */}
      <ellipse cx="188" cy="392" rx="32" ry="30" fill="url(#sp-suit)" />
      {/* Helmet ring */}
      <ellipse cx="188" cy="408" rx="28" ry="8" fill="#C0C0DC" />
      {/* Visor */}
      <ellipse cx="188" cy="388" rx="22" ry="20" fill="url(#sp-visor)" />
      {/* Visor reflection */}
      <path d="M170,376 Q178,370 190,372 Q198,374 202,382 Q196,378 188,376 Q180,376 174,380 Z"
            fill="url(#sp-visor-ref)" opacity="0.9" />
      {/* Stars reflected in visor */}
      <circle cx="178" cy="384" r="1.5" fill="white" opacity="0.5" />
      <circle cx="196" cy="380" r="1.2" fill="white" opacity="0.4" />
      <circle cx="183" cy="394" r="1"   fill="white" opacity="0.3" />
      {/* Earth reflection in visor */}
      <circle cx="198" cy="390" r="6" fill="#2E8CD4" opacity="0.25" />
      {/* Helmet highlight */}
      <path d="M164,380 Q168,368 180,364 Q168,370 165,382 Z" fill="white" opacity="0.25" />
      <ellipse cx="173" cy="370" rx="6" ry="3" fill="white" opacity="0.2" transform="rotate(-20,173,370)" />
      {/* Helmet antenna */}
      <line x1="216" y1="370" x2="224" y2="355" stroke="#C8C8E0" strokeWidth="2" />
      <circle cx="224" cy="353" r="3" fill="#FFE080" filter="url(#sp-glow-filter)" />

      {/* Floating dust particles */}
      {([
        [140,380,1.5],[220,365,1],[250,420,1.2],[130,470,1],[260,500,1.5],
        [155,530,1],[235,390,0.8],[170,355,1],[340,450,1.2],
      ] as [number,number,number][]).map(([x,y,r],i)=>(
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.25 + (i%3)*0.1} />
      ))}
    </svg>
  );
}
