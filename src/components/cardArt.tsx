import type { AwardKey } from "../lib/awards";
import { CARD_PATH, CARD_THEMES, STOP_OFFSETS, type CardTheme } from "./cardTheme";

const THEME_KEYS = Object.keys(CARD_THEMES) as CardTheme[];

function Engraving({ theme }: { theme: AwardKey }) {
  const color = CARD_THEMES[theme].glow;

  if (theme === "craque") {
    return (
      <g id="fc-engrave-craque" fill="none" stroke={color} strokeWidth="1.2">
        {Array.from({ length: 16 }, (_, index) => (
          <circle key={index} cx="362" cy="250" r={70 + index * 24} />
        ))}
      </g>
    );
  }

  if (theme === "artilheiro") {
    return (
      <g id="fc-engrave-artilheiro" stroke={color}>
        {Array.from({ length: 13 }, (_, index) => (
          <path key={index} d={`M${-120 + index * 62} 500L${130 + index * 62} -20`} strokeWidth={index % 3 ? 2 : 7} />
        ))}
      </g>
    );
  }

  if (theme === "garcom") {
    return (
      <g id="fc-engrave-garcom" fill="none" stroke={color} strokeWidth="1.6">
        {Array.from({ length: 9 }, (_, index) => (
          <path key={index} d={`M-30 ${470 - index * 16}C150 ${210 - index * 30} 420 ${250 - index * 24} 610 ${90 + index * 26}`} />
        ))}
      </g>
    );
  }

  return (
    <g id="fc-engrave-paredao" stroke={color} strokeWidth="1.4">
      {Array.from({ length: 11 }, (_, row) => (
        <g key={row}>
          <path d={`M-10 ${40 + row * 44}H590`} />
          {Array.from({ length: 8 }, (_, column) => (
            <path key={column} d={`M${(row % 2 ? 38 : 0) + column * 76} ${40 + row * 44}v44`} />
          ))}
        </g>
      ))}
    </g>
  );
}

// Deterministic noise, so every Legend card gets the same gold dust.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function dust(seed: number, count: number, from: [number, number], to: [number, number], spread: number) {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, index) => {
    const t = random();
    const off = random() * spread;
    return (
      <circle
        key={index}
        cx={from[0] + (to[0] - from[0]) * t + off * 0.34}
        cy={from[1] + (to[1] - from[1]) * t + off * 0.94}
        r={0.8 + random() * 2.6}
        opacity={0.55 + random() * 0.45}
      />
    );
  });
}

const KINTSUGI = [
  "M-10 604L90 640L130 700L110 780L150 860L140 920",
  "M90 640L180 620L260 650L330 610L420 640L500 600L590 622",
  "M260 650L240 720L300 790L280 880L300 920",
  "M330 610L360 700L440 730L520 700L590 744",
  "M440 730L430 810L500 860L580 840",
  "M130 700L200 744L240 720",
  "M300 790L380 802L430 810",
  "M-10 822L60 800L110 780",
  "M180 620L170 560L120 520",
  "M420 640L470 560L560 520",
];

// White marble with diagonal gold blades and gold veins, after the FUT Icon cards.
function LegendArt() {
  return (
    <g id="fc-legend-art">
      <g fill="none" stroke="#a9a397" strokeOpacity=".3" strokeWidth="1.2">
        <path d="M-10 160C80 190 120 120 210 150S330 90 400 60" />
        <path d="M20 40C60 90 40 130 100 170" />
        <path d="M360 470C420 500 470 460 590 480" />
      </g>
      <path d="M-56 452L594 -8L646 66L-4 526Z" fill="url(#fc-legend-gold)" />
      <path d="M-56 452L594 -8" stroke="#fff6d2" strokeWidth="3" />
      <path d="M-4 526L646 66" stroke="#7a5512" strokeOpacity=".6" strokeWidth="2" />
      <path d="M-70 400L580 -60" stroke="#fffaf0" strokeWidth="9" strokeOpacity=".85" />
      <path d="M-70 384L580 -76" stroke="#d9b04e" strokeWidth="2" />
      <path d="M110 456L610 276L630 328L130 508Z" fill="url(#fc-legend-gold)" />
      <path d="M110 456L610 276" stroke="#fff6d2" strokeWidth="2.4" />
      <g fill="#c99a33">
        {dust(7, 140, [-4, 526], [646, 66], 46)}
        {dust(11, 90, [130, 508], [630, 328], 38)}
        {dust(13, 60, [380, 60], [580, 40], 120)}
      </g>
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        {KINTSUGI.map((d) => (
          <path key={d} d={d} stroke="#c9952c" strokeWidth="3" strokeOpacity=".75" />
        ))}
        {KINTSUGI.map((d) => (
          <path key={`${d}h`} d={d} stroke="#fff1b8" strokeWidth="1" strokeOpacity=".9" />
        ))}
      </g>
      <g stroke="#d6ad4c" strokeWidth="2.4" strokeLinecap="round">
        {[
          [214, 96],
          [262, 150],
          [318, 108],
          [196, 200],
          [52, 236],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 7} ${y}H${x + 7}M${x} ${y - 7}V${y + 7}`} />
        ))}
      </g>
    </g>
  );
}

function Bust({ id, light, mid, deep }: { id: string; light: string; mid: string; deep: string }) {
  return (
    <g id={id} mask="url(#fc-bust-fade)">
      <defs>
        <radialGradient id={`${id}-head`} cx=".36" cy=".3" r=".85">
          <stop offset="0" stopColor={light} />
          <stop offset=".55" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
        <linearGradient id={`${id}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4f58" />
          <stop offset=".55" stopColor={mid} />
        </linearGradient>
      </defs>
      <path d="M168 482C176 424 226 402 292 382C314 375 322 360 322 332L402 332C402 360 410 375 432 382C498 402 548 424 556 482Z" fill="url(#fc-bust-shoulders)" />
      <path d="M292 382C322 412 402 412 432 382C414 374 406 362 403 350C378 372 346 372 321 350C318 362 310 374 292 382Z" fill="#1f2226" />
      <path d="M321 290L403 290L403 350C378 378 346 378 321 350Z" fill={`url(#${id}-neck)`} />
      <ellipse cx="362" cy="332" rx="74" ry="30" fill="url(#fc-bust-chin)" />
      <path d="M362 150C406 150 438 182 438 234C438 262 431 284 417 304C404 322 384 336 362 336C340 336 320 322 307 304C293 284 286 262 286 234C286 182 318 150 362 150Z" fill={`url(#${id}-head)`} />
      <path d="M284 240C276 182 310 136 364 136C420 136 448 184 440 240C436 218 426 204 410 196C380 208 336 206 312 194C298 204 288 220 284 240Z" fill="url(#fc-bust-hair)" />
      <path d="M287 236C279 232 274 244 278 260C281 272 287 278 293 276Z" fill={mid} />
      <path d="M437 236C445 232 450 244 446 260C443 272 437 278 431 276Z" fill={deep} />
    </g>
  );
}

// Every card on a page points to these shared definitions. A page shows up to 47 cards, and defining
// the gradients and shapes per card would make phones repaint thousands of nodes.
export function CardArtDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        {THEME_KEYS.map((key) => {
          const theme = CARD_THEMES[key];
          return (
            <g key={key}>
              <linearGradient id={`fc-metal-${key}`} x1="0" y1="0" x2="1" y2="1">
                {theme.stops.map((color, index) => (
                  <stop key={index} offset={STOP_OFFSETS[index]} stopColor={color} />
                ))}
              </linearGradient>
              <linearGradient id={`fc-rim-${key}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={theme.rim[0]} />
                <stop offset=".5" stopColor={theme.rim[1]} />
                <stop offset="1" stopColor={theme.rim[0]} />
              </linearGradient>
              <radialGradient id={`fc-glow-${key}`} cx=".64" cy=".3" r=".5">
                <stop offset="0" stopColor={theme.glow} stopOpacity={theme.dark ? 0.5 : 0.6} />
                <stop offset="1" stopColor={theme.glow} stopOpacity="0" />
              </radialGradient>
            </g>
          );
        })}

        <linearGradient id="fc-sheen-light" x1="0" y1="0" x2="1" y2=".55">
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".46" stopColor="#fff" stopOpacity=".34" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fc-sheen-dark" x1="0" y1="0" x2="1" y2=".55">
          <stop offset=".3" stopColor="#fff" stopOpacity="0" />
          <stop offset=".46" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fc-lower-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="fc-lower-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".32" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
        <pattern id="fc-lines-light" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
          <path d="M0 0H7" stroke="#000" strokeOpacity=".055" />
        </pattern>
        <pattern id="fc-lines-dark" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
          <path d="M0 0H7" stroke="#fff" strokeOpacity=".05" />
        </pattern>

        <linearGradient id="fc-bust-shoulders" x1=".15" y1="0" x2=".85" y2="1">
          <stop offset="0" stopColor="#8d939d" />
          <stop offset=".45" stopColor="#555a63" />
          <stop offset="1" stopColor="#23262b" />
        </linearGradient>
        <linearGradient id="fc-bust-hair" x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#6d727b" />
          <stop offset="1" stopColor="#2a2d33" />
        </linearGradient>
        <radialGradient id="fc-bust-chin">
          <stop offset="0" stopColor="#16181b" stopOpacity=".65" />
          <stop offset="1" stopColor="#16181b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fc-bust-fade-ramp" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".62" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity=".12" />
        </linearGradient>
        <mask id="fc-bust-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="570" height="480">
          <rect width="570" height="480" fill="url(#fc-bust-fade-ramp)" />
        </mask>

        <clipPath id="fc-shape">
          <path d={CARD_PATH} />
        </clipPath>
        <clipPath id="fc-upper">
          <rect width="570" height="480" />
        </clipPath>

        <Bust id="fc-bust-on-light" light="#dfe2e6" mid="#979da6" deep="#555a63" />
        <Bust id="fc-bust-on-dark" light="#c7ccd3" mid="#868d97" deep="#3a3e46" />

        <Engraving theme="craque" />
        <Engraving theme="artilheiro" />
        <Engraving theme="garcom" />
        <Engraving theme="paredao" />

        <linearGradient id="fc-legend-gold" x1="0" y1="0" x2="1" y2=".4">
          <stop offset="0" stopColor="#9c7020" />
          <stop offset=".18" stopColor="#f6d77c" />
          <stop offset=".34" stopColor="#c4912e" />
          <stop offset=".52" stopColor="#fff0b0" />
          <stop offset=".7" stopColor="#d8a943" />
          <stop offset="1" stopColor="#8a6219" />
        </linearGradient>
        <LegendArt />
      </defs>
    </svg>
  );
}
