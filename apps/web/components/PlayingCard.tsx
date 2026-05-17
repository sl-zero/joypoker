"use client";

import { renderCardToDataUri } from "poker-cards";
import { useMemo } from "react";

const SUIT_MAP: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
const RANK_MAP: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  J: 11, Q: 12, K: 13,
};

export default function PlayingCard({
  suit,
  rank,
  joker,
  className = "",
  width = 48,
  height = 67,
}: {
  suit?: string;
  rank?: string;
  joker?: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const src = useMemo(() => {
    if (joker) {
      const color = joker === "BJ" ? "#d97706" : "#6d28d9";
      return renderCardToDataUri({
        suit: 0,
        rank: 1,
        letters: joker === "BJ" ? "大" : "小",
        suitcolor: color,
        rankcolor: color,
        cardcolor: "#fcfcfc",
        opacity: 0.6,
      });
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
  }, [suit, rank, joker]);

  return (
    <img
      src={src}
      alt={joker ? (joker === "BJ" ? "大王" : "小王") : `${rank ?? ""}${suit ?? ""}`}
      width={width}
      height={height}
      className={className}
    />
  );
}
