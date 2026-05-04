"use client";

import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BJPublicState,
  DoudizhuPublicState,
  GameStateUnion,
  ShangyouPublicState,
  StubGameState,
  TexasPublicState,
} from "@/lib/game-types";
import {
  isBlackjackState,
  isDoudizhuState,
  isShangyouState,
  isTexasState,
} from "@/lib/game-types";

type RoomPayload = {
  id: string;
  code: string;
  name: string | null;
  gameType: string;
  ownerId: string;
  ruleSnapshot: unknown;
  members: {
    userId: string;
    totalScore: number;
    user: { id: string; name: string | null };
  }[];
  messages: {
    id: string;
    body: string;
    createdAt: string;
    user: { name: string | null };
  }[];
};

function formatScore(tenths: number) {
  return (tenths / 10).toFixed(1);
}

function CardBadge({ c }: { c: { suit: string; rank: string } }) {
  const red = c.suit === "H" || c.suit === "D";
  const suit =
    c.suit === "H" ? "♥" : c.suit === "D" ? "♦" : c.suit === "C" ? "♣" : "♠";
  return (
    <span
      className={`inline-flex min-w-[2.25rem] items-center justify-center rounded border border-white/20 px-1 py-0.5 font-mono text-sm ${
        red ? "text-rose-400" : "text-slate-200"
      }`}
    >
      {c.rank}
      {suit}
    </span>
  );
}

function GameCardBadge({
  c,
  selected,
  onToggle,
}: {
  c: { kind: string; suit?: string; rank?: string; joker?: string; id: string };
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const inner =
    c.kind === "joker" || c.joker ? (
      <span className="text-amber-200">{c.joker === "SJ" ? "小王" : c.joker === "BJ" ? "大王" : "王"}</span>
    ) : (
      <CardBadge c={{ suit: c.suit!, rank: c.rank! }} />
    );
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={() => onToggle(c.id)}
        className={`rounded border px-0.5 py-0.5 ${selected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/50" : "border-white/20"}`}
      >
        {inner}
      </button>
    );
  }
  return <span className="inline-block">{inner}</span>;
}

export function RoomExperience({ roomId }: { roomId: string }) {
  const { data: session, status } = useSession();
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameStateUnion | null>(null);
  const [presence, setPresence] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [sySelected, setSySelected] = useState<string[]>([]);
  const [dzSelected, setDzSelected] = useState<string[]>([]);
  const [texRaise, setTexRaise] = useState("");
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const loadRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = (await res.json()) as { error?: string; room?: RoomPayload };
      if (!res.ok) {
        setLoadErr(data.error ?? "加载失败");
        return;
      }
      setRoom(data.room ?? null);
    } catch (e) {
      console.error("loadRoom", e);
      setLoadErr("网络或数据解析失败");
    }
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    let cancelled = false;

    void (async () => {
      await fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });
      if (cancelled) return;
      await loadRoom();
      const tokRes = await fetch(`/api/rooms/${roomId}/game-token`, { method: "POST" });
      const tok = await tokRes.json();
      if (cancelled || !tokRes.ok) return;
      const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
      const s = io(url, { auth: { token: tok.token }, transports: ["websocket"] });
      if (cancelled) {
        s.disconnect();
        return;
      }
      socketRef.current = s;
      s.on("connect", () => {
        s.emit("joinRoom");
      });
      s.on("gameState", (st: unknown) => {
        setGameState(st as GameStateUnion);
        setSySelected([]);
        setDzSelected([]);
      });
      s.on("chat", () => {
        void loadRoom();
      });
      s.on("presence", (p: { count: number }) => setPresence(p.count));
      s.on("scoresUpdated", () => void loadRoom());
      s.on("errorMsg", (e: { message?: string }) => {
        if (e.message) alert(e.message);
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [status, session?.user?.id, roomId, loadRoom]);

  useEffect(() => {
    if (!gameState || !("phase" in gameState) || gameState.phase !== "payout") return;
    const t = setTimeout(() => void loadRoom(), 400);
    return () => clearTimeout(t);
  }, [gameState, loadRoom]);

  const ownerId = room?.ownerId;
  const isOwner = session?.user?.id && ownerId === session.user.id;

  if (status === "loading" || !session) {
    return (
      <main className="p-8">
        {status === "unauthenticated" ? (
          <p>
            请先 <Link href="/login">登录</Link>
          </p>
        ) : (
          <p>加载中…</p>
        )}
      </main>
    );
  }

  if (loadErr) return <main className="p-8 text-red-400">{loadErr}</main>;
  if (!room) return <main className="p-8">加载房间…</main>;

  const gs = gameState;
  const isBj =
    room.gameType === "blackjack" &&
    gs &&
    isBlackjackState(gs) &&
    (gs.phase === "lobby" ||
      gs.phase === "playerTurn" ||
      gs.phase === "dealerTurn" ||
      gs.phase === "payout");

  const isSy = room.gameType === "shangyou" && gs && isShangyouState(gs);
  const isDz = room.gameType === "doudizhu" && gs && isDoudizhuState(gs);
  const isTh = room.gameType === "texas" && gs && isTexasState(gs);

  function sendChat() {
    const t = chatInput.trim();
    if (!t || !socketRef.current) return;
    socketRef.current.emit("chat", { text: t });
    setChatInput("");
  }

  function toggleSy(id: string) {
    setSySelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function payoutLine(r: RoomPayload, st: Record<string, number> | undefined) {
    if (!st) return null;
    return Object.entries(st)
      .map(([id, v]) => {
        const nm = r.members.find((m) => m.userId === id)?.user.name ?? id.slice(0, 6);
        return `${nm}:${v}`;
      })
      .join(" · ");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{room.name ?? "房间"}</h1>
          <p className="text-sm text-[var(--muted)]">
            房间码 <span className="font-mono text-[var(--text)]">{room.code}</span> · 玩法{" "}
            {room.gameType} · 在线 {presence}
          </p>
        </div>
        <Link href="/editor" className="text-sm text-[var(--accent)] underline">
          再开一局
        </Link>
      </div>

      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {gs && "phase" in gs && gs.phase === "stub" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              {(gs as StubGameState).message}
            </div>
          )}

          {isBj && gs && isBlackjackState(gs) && (
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6">
              <h2 className="font-medium">二十一点</h2>
              <details className="mt-2 text-sm text-[var(--muted)]">
                <summary className="cursor-pointer text-[var(--accent)]">规则说明</summary>
                <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
                  <li>目标：尽量接近 21 点且不爆牌。</li>
                  <li>要牌 / 停牌；同 rank 可按规定分牌。</li>
                </ul>
              </details>
              <p className="mt-3 text-sm text-[var(--muted)]">
                阶段：{gs.phase}
                {gs.currentUserId
                  ? ` · 当前行动：${gs.currentUserId === session.user.id ? "你" : "其他玩家"}`
                  : ""}
              </p>
              <div className="mt-4">
                <p className="text-sm text-[var(--muted)]">庄家</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {gs.dealerHoleHidden ? (
                    <>
                      {gs.dealerUp && <CardBadge c={gs.dealerUp} />}
                      <span className="rounded border border-white/20 px-2 py-0.5 font-mono text-sm">
                        暗牌
                      </span>
                    </>
                  ) : (
                    (gs.dealerHand ?? []).map((c, i) => <CardBadge key={i} c={c} />)
                  )}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {gs.players.map((p) => (
                  <div key={p.userId} className="rounded border border-white/10 p-3">
                    <div className="flex justify-between text-sm">
                      <span>
                        {p.name}
                        {p.userId === session.user.id ? "（你）" : ""}
                      </span>
                      {p.done && <span className="text-[var(--muted)]">已结束本手</span>}
                    </div>
                    {p.userId === session.user.id && p.hands && p.hands.length > 0 ? (
                      <div className="mt-2 space-y-3">
                        {p.hands.map((hand, hi) => (
                          <div
                            key={hi}
                            className={`rounded border p-2 ${
                              hi === p.activeHandIndex && gs.phase === "playerTurn"
                                ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/40"
                                : "border-white/10"
                            }`}
                          >
                            <p className="mb-1 text-xs text-[var(--muted)]">
                              第 {hi + 1} 手
                              {hi === p.activeHandIndex && gs.currentUserId === session.user.id
                                ? " · 行动中"
                                : ""}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {hand.map((c, i) => (
                                <CardBadge key={i} c={c} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Array.from({ length: p.handCount }).map((_, i) => (
                          <span
                            key={i}
                            className="inline-block h-8 w-6 rounded border border-white/10 bg-white/5"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {gs.phase === "playerTurn" && gs.currentUserId === session.user.id && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white"
                    onClick={() => socketRef.current?.emit("hit")}
                  >
                    要牌
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-600 px-4 py-2 font-medium text-white"
                    onClick={() => socketRef.current?.emit("stand")}
                  >
                    停牌
                  </button>
                  {gs.players.find((x) => x.userId === session.user.id)?.canSplit && (
                    <button
                      type="button"
                      className="rounded-lg border border-amber-400/60 bg-amber-500/20 px-4 py-2 font-medium text-amber-100"
                      onClick={() => socketRef.current?.emit("split")}
                    >
                      分牌
                    </button>
                  )}
                </div>
              )}
              {gs.phase === "lobby" && isOwner && (
                <button
                  type="button"
                  className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white"
                  onClick={() => socketRef.current?.emit("startGame")}
                >
                  开始游戏
                </button>
              )}
              {gs.phase === "payout" && isOwner && (
                <button
                  type="button"
                  className="mt-6 rounded-lg border border-white/20 px-4 py-2"
                  onClick={() => socketRef.current?.emit("newRound")}
                >
                  再来一局
                </button>
              )}
              {gs.lastPayout && (
                <p className="mt-4 text-sm text-[var(--muted)]">上局：{payoutLine(room, gs.lastPayout)}</p>
              )}
            </div>
          )}

          {isSy && (() => {
            const s = gs as ShangyouPublicState;
            return (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6">
                <h2 className="font-medium">上游</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  阶段 {s.phase}
                  {s.rulesEcho.teamMode ? " · 组队" : ""}
                  {s.rulesEcho.mustFollowPattern ? " · 须跟大" : " · 可垫小"}
                </p>
                {s.tableCombo && (
                  <p className="mt-2 text-sm">
                    桌面：{s.tableCombo.type} · 力 {s.tableCombo.primaryPower}
                    {s.freeTable ? " · 自由出牌" : ""}
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {s.players.map((p) => (
                    <div key={p.userId} className="rounded border border-white/10 p-3 text-sm">
                      <div className="flex justify-between">
                        <span>
                          {p.name}
                          {p.teamId !== undefined ? ` · 队${p.teamId + 1}` : ""}
                          {p.userId === session.user.id ? "（你）" : ""}
                        </span>
                        {p.finishedRank != null && <span>第 {p.finishedRank} 名</span>}
                      </div>
                      {p.userId === session.user.id && p.hand ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.hand.map((c) => (
                            <GameCardBadge
                              key={c.id}
                              c={c}
                              selected={sySelected.includes(c.id)}
                              onToggle={
                                s.phase === "play" && s.currentUserId === session.user.id
                                  ? toggleSy
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[var(--muted)]">{p.handCount} 张</div>
                      )}
                    </div>
                  ))}
                </div>
                {s.phase === "lobby" && isOwner && (
                  <button
                    type="button"
                    className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 text-white"
                    onClick={() => socketRef.current?.emit("startGame")}
                  >
                    开始游戏
                  </button>
                )}
                {s.phase === "play" && s.currentUserId === session.user.id && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
                      onClick={() => {
                        const me = s.players.find((x) => x.userId === session.user.id);
                        const hn = me?.hand?.length ?? 0;
                        const lastHand = hn > 0 && sySelected.length === hn;
                        const announce =
                          s.rulesEcho.mustAnnounceLastCount && lastHand && (hn === 1 || hn === 2)
                            ? (hn as 1 | 2)
                            : undefined;
                        socketRef.current?.emit("playCards", {
                          cardIds: sySelected,
                          ...(announce !== undefined ? { announce } : {}),
                        });
                      }}
                    >
                      出牌
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-slate-600 px-4 py-2 text-white"
                      onClick={() => socketRef.current?.emit("pass")}
                    >
                      要不起
                    </button>
                  </div>
                )}
                {s.phase === "payout" && isOwner && (
                  <button
                    type="button"
                    className="mt-6 rounded-lg border border-white/20 px-4 py-2"
                    onClick={() => socketRef.current?.emit("newRound")}
                  >
                    再来一局
                  </button>
                )}
                {s.lastPayout && (
                  <p className="mt-4 text-sm text-[var(--muted)]">上局：{payoutLine(room, s.lastPayout)}</p>
                )}
              </div>
            );
          })()}

          {isDz && (() => {
            const d = gs as DoudizhuPublicState;
            return (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6">
                <h2 className="font-medium">斗地主</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {d.phase} · {d.bidStyle}
                  {d.landlordUserId ? ` · 地主已确定` : ""}
                </p>
                {d.bottomCards && d.bottomCards.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-[var(--muted)]">底牌：</span>
                    {d.bottomCards.map((c) => (
                      <GameCardBadge key={c.id} c={c} />
                    ))}
                  </div>
                )}
                {d.tableCombo && (
                  <p className="mt-2 text-sm">
                    上一手：{d.tableCombo.type} · {d.tableCombo.primaryPower}
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  {d.players.map((p) => (
                    <div key={p.userId} className="flex justify-between text-sm">
                      <span>
                        {p.name}
                        {p.isLandlord ? "（地主）" : ""}
                        {p.userId === session.user.id ? "（你）" : ""}
                      </span>
                      <span>{p.handCount} 张</span>
                    </div>
                  ))}
                </div>
                {d.phase === "play" && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {d.players
                      .find((x) => x.userId === session.user.id)
                      ?.hand?.map((c) => (
                        <GameCardBadge
                          key={c.id}
                          c={c}
                          selected={dzSelected.includes(c.id)}
                          onToggle={
                            d.currentUserId === session.user.id
                              ? (id) =>
                                  setDzSelected((prev) =>
                                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                                  )
                              : undefined
                          }
                        />
                      ))}
                  </div>
                )}
                {d.phase === "lobby" && isOwner && (
                  <button
                    type="button"
                    className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 text-white"
                    onClick={() => socketRef.current?.emit("startGame")}
                  >
                    开始游戏
                  </button>
                )}
                {d.phase === "bid" && d.currentUserId === session.user.id && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {d.bidStyle === "grab_landlord" ? (
                      <>
                        <button
                          type="button"
                          className="rounded-lg bg-amber-600 px-4 py-2 text-white"
                          onClick={() => socketRef.current?.emit("doudizhuBid", { action: "grab" })}
                        >
                          叫地主
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-600 px-4 py-2 text-white"
                          onClick={() => socketRef.current?.emit("doudizhuBid", { action: "nograb" })}
                        >
                          不叫
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="rounded border border-white/20 px-3 py-1 text-sm"
                          onClick={() => socketRef.current?.emit("doudizhuBid", { action: "pass" })}
                        >
                          不叫
                        </button>
                        {[1, 2, 3].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            className="rounded border border-white/20 px-3 py-1 text-sm"
                            onClick={() => socketRef.current?.emit("doudizhuBid", { points: pt })}
                          >
                            {pt} 分
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
                {d.phase === "play" && d.currentUserId === session.user.id && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-white"
                      onClick={() => socketRef.current?.emit("playCards", { cardIds: dzSelected })}
                    >
                      出牌 ({dzSelected.length})
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-slate-600 px-4 py-2 text-white"
                      onClick={() => setDzSelected([])}
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/30 px-4 py-2"
                      onClick={() => socketRef.current?.emit("pass")}
                    >
                      要不起
                    </button>
                  </div>
                )}
                {d.phase === "play" && d.currentUserId !== session.user.id && (
                  <p className="mt-4 text-sm text-[var(--muted)]">等待他人出牌…</p>
                )}
                {d.phase === "payout" && isOwner && (
                  <button
                    type="button"
                    className="mt-6 border border-white/20 px-4 py-2"
                    onClick={() => socketRef.current?.emit("newRound")}
                  >
                    再来一局
                  </button>
                )}
                {d.lastPayout && (
                  <p className="mt-4 text-sm text-[var(--muted)]">上局：{payoutLine(room, d.lastPayout)}</p>
                )}
              </div>
            );
          })()}

          {isTh && (() => {
            const t = gs as TexasPublicState;
            const me = t.players.find((p) => p.userId === session.user.id);
            const maxB = Math.max(...t.players.map((p) => p.currentBet), t.bigBlind);
            const toCall = Math.max(0, maxB - (me?.currentBet ?? 0));
            return (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6">
                <h2 className="font-medium">德州扑克</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {t.phase} · 底池 {t.pot} · {t.limitType}
                </p>
                <div className="mt-4 flex flex-wrap gap-1">
                  <span className="text-xs text-[var(--muted)]">公共牌：</span>
                  {t.board.map((c, i) => (
                    <CardBadge key={i} c={c} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {t.players.map((p) => (
                    <li key={p.userId} className="flex justify-between">
                      <span>
                        {p.name}
                        {p.userId === session.user.id ? "（你）" : ""}
                        {p.folded ? " 弃牌" : ""}
                      </span>
                      <span>筹码 {p.stack}</span>
                    </li>
                  ))}
                </ul>
                {me?.hole && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    <span className="text-xs">底牌：</span>
                    {me.hole.map((c, i) => (
                      <CardBadge key={i} c={c} />
                    ))}
                  </div>
                )}
                {t.phase !== "lobby" && t.phase !== "payout" && t.currentActorSeat !== null && (
                  <p className="mt-2 text-sm">
                    行动位：{t.players[t.currentActorSeat]?.name}
                    {t.players[t.currentActorSeat]?.userId === session.user.id ? "（到你）" : ""}
                  </p>
                )}
                {t.phase === "lobby" && isOwner && (
                  <button
                    type="button"
                    className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 text-white"
                    onClick={() => socketRef.current?.emit("startGame")}
                  >
                    开始游戏
                  </button>
                )}
                {t.phase !== "lobby" &&
                  t.phase !== "payout" &&
                  t.currentActorSeat !== null &&
                  t.players[t.currentActorSeat]?.userId === session.user.id && (
                    <div className="mt-6 flex flex-wrap items-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-slate-600 px-3 py-2 text-white"
                        onClick={() => socketRef.current?.emit("texasFold")}
                      >
                        弃牌
                      </button>
                      {toCall <= 0 && (
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-white"
                          onClick={() => socketRef.current?.emit("texasCheck")}
                        >
                          过牌
                        </button>
                      )}
                      {toCall > 0 && (
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-white"
                          onClick={() => socketRef.current?.emit("texasCall")}
                        >
                          跟注 {toCall.toFixed(2)}
                        </button>
                      )}
                      <div className="flex gap-1">
                        <input
                          className="w-24 rounded border border-white/20 bg-[var(--bg)] px-2 py-1 text-sm"
                          placeholder="加注到"
                          value={texRaise}
                          onChange={(e) => setTexRaise(e.target.value)}
                        />
                        <button
                          type="button"
                          className="rounded-lg bg-amber-600 px-3 py-2 text-white"
                          onClick={() => {
                            const v = Number(texRaise);
                            if (!Number.isFinite(v)) return;
                            socketRef.current?.emit("texasRaiseTo", { total: v });
                            setTexRaise("");
                          }}
                        >
                          加注到
                        </button>
                      </div>
                    </div>
                  )}
                {t.phase === "payout" && isOwner && (
                  <button
                    type="button"
                    className="mt-6 border border-white/20 px-4 py-2"
                    onClick={() => socketRef.current?.emit("texasNewHand")}
                  >
                    下一手
                  </button>
                )}
                {t.lastPayout && (
                  <p className="mt-4 text-sm text-[var(--muted)]">上局筹码变动：{payoutLine(room, t.lastPayout)}</p>
                )}
              </div>
            );
          })()}

          {!isBj && !isSy && !isDz && !isTh && gs && "phase" in gs && gs.phase !== "stub" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              等待连接游戏服。请确认已启动 game-server 且 NEXT_PUBLIC_SOCKET_URL 正确。
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
            <h3 className="font-medium">计分</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {room.members.map((m) => (
                <li key={m.userId} className="flex justify-between">
                  <span>{m.user.name ?? m.userId.slice(0, 8)}</span>
                  <span>{formatScore(m.totalScore)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
            <h3 className="font-medium">聊天</h3>
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
              {room.messages.map((m) => (
                <div key={m.id}>
                  <span className="text-[var(--muted)]">{m.user?.name ?? "?"}: </span>
                  {m.body}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded border border-white/20 bg-[var(--bg)] px-2 py-1 text-sm"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  sendChat();
                }}
                placeholder="说点什么…"
              />
              <button
                type="button"
                className="rounded bg-[var(--accent)] px-3 py-1 text-sm text-white"
                onClick={sendChat}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
