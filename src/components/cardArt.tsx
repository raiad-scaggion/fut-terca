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
      </defs>
    </svg>
  );
}
