"use client";

import { renderCardToDataUri } from "poker-cards";
import { useMemo } from "react";

const SUIT_MAP: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
const RANK_MAP: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  J: 11, Q: 12, K: 13,
};

function jokerSvg(label: string, color: string): string {
  const crown = label === "大"
    ? `<line x1="36" y1="24" x2="36" y2="19" stroke="${color}" stroke-width="1.2"/><line x1="32" y1="21" x2="40" y2="21" stroke="${color}" stroke-width="0.8"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 100">
<defs><filter id="s"><feDropShadow dx="1" dy="1" stdDeviation="1.5" flood-opacity="0.15"/></filter></defs>
<rect x="2" y="2" width="68" height="96" rx="8" fill="#fcfcfc" filter="url(#s)"/>
<rect x="2" y="2" width="68" height="96" rx="8" fill="none" stroke="#d4d4d4" stroke-width="0.5"/>
<text x="10" y="22" font-size="14" font-weight="800" fill="${color}" font-family="sans-serif">${label}</text>
<text x="10" y="32" font-size="10" fill="${color}" font-family="sans-serif">★</text>
<g transform="translate(72,100) rotate(180)"><text x="10" y="22" font-size="14" font-weight="800" fill="${color}" font-family="sans-serif">${label}</text><text x="10" y="32" font-size="10" fill="${color}" font-family="sans-serif">★</text></g>
<circle cx="36" cy="48" r="12" fill="none" stroke="${color}" stroke-width="1.2"/>
<circle cx="31" cy="45" r="2" fill="${color}"/><circle cx="41" cy="45" r="2" fill="${color}"/>
<path d="M28,54 Q36,62 44,54" fill="none" stroke="${color}" stroke-width="1"/>
<polygon points="24,42 36,24 48,42" fill="none" stroke="${color}" stroke-width="1.2"/>
<circle cx="24" cy="42" r="2.5" fill="${color}"/><circle cx="48" cy="42" r="2.5" fill="${color}"/>
${crown}
<path d="M23,64 L20,86 L52,86 L49,64 Z" fill="none" stroke="${color}" stroke-width="1"/>
<text x="36" y="80" font-size="16" font-weight="bold" fill="${color}" font-family="sans-serif" text-anchor="middle">王</text>
</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export default function PlayingCard({
  suit,
  rank,
  joker,
  back,
  selected,
  className = "",
  width = 56,
  height = 80,
}: {
  suit?: string;
  rank?: string;
  joker?: string;
  back?: boolean;
  selected?: boolean;
  className?: string;
  width?: number;
  height?: number;
}) {
  const src = useMemo(() => {
    if (back) {
      return renderCardToDataUri({
        rank: 0,
        backcolor: "#1a3a5c",
        backtext: "",
        borderradius: 8,
        shadow: "1,1,2",
      });
    }
    if (joker) {
      const isBig = joker === "BJ";
      return jokerSvg(isBig ? "大" : "小", isBig ? "#d97706" : "#6d28d9");
    }
    const s = SUIT_MAP[suit ?? "S"] ?? 0;
    const r = RANK_MAP[rank ?? "A"] ?? 1;
    return renderCardToDataUri({
      suit: s,
      rank: r,
      cardcolor: "#fcfcfc",
      borderradius: 8,
      shadow: "1,1,2",
    });
  }, [suit, rank, joker, back]);

  return (
    <img
      src={src}
      alt={back ? "背面" : joker ? (joker === "BJ" ? "大王" : "小王") : `${rank ?? ""}${suit ?? ""}`}
      width={width}
      height={height}
      className={className}
      style={{
        transition: "transform 0.12s ease",
        transform: selected ? "translate(-1px, -5px)" : undefined,
      }}
      draggable={false}
    />
  );
}
