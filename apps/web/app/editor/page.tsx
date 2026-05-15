"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  PRESET_BLACKJACK_CLASSIC,
  PRESET_DOUDIZHU_CALL_POINTS,
  PRESET_DOUDIZHU_CLASSIC,
  PRESET_DOUDIZHU_FOUR_PLAYER,
  PRESET_SHANGYOU_CLASSIC,
  PRESET_SHANGYOU_SINGLE_DECK,
  PRESET_SHANGYOU_TEAM_2V2,
  PRESET_TEXAS_CLASSIC,
  PRESET_TEXAS_HEADS_UP,
  PRESET_TEXAS_MICROSTAKES,
  type BlackjackRules,
  type DoudizhuRules,
  type ShangyouRules,
  type TexasHoldemRules,
} from "@poker/rules-schema";

type Tab = "blackjack" | "doudizhu" | "texas" | "shangyou";

function presetBar<T>(items: { label: string; value: T }[], onPick: (v: T) => void) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-4">
      <span className="w-full text-xs text-[var(--muted)]">快速预设</span>
      {items.map(({ label, value }) => (
        <button
          key={label}
          type="button"
          className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
          onClick={() => onPick({ ...(value as object) } as T)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---- tooltip texts ---- */

const TIP_H17 = "Soft 17 = A+6，牌面为 17 但 A 可计 1。H17 时庄家继续要牌；关闭则为 S17，庄家停在 17。";
const TIP_SPLIT = "首两张同 rank 可分成两手独立下注，每手可继续要牌、停牌或加倍。";
const TIP_DAS = "分牌后的每手可额外下注一倍筹码再抽一张牌（Double After Split）。";
const TIP_STRAIGHT_MIN = "连续单牌的最低长度，常见 5 张，部分地方规则放宽到 3-4 张。";
const TIP_ROCKET = "大王+小王的组合，最大的炸弹牌型，可压任意牌。";
const TIP_BOMB_DOUBLE = "每出现一个炸弹，当局总分翻倍。";
const TIP_SPRING = "一方一张牌未出即结束，对手得分翻倍。";
const TIP_ANTI_SPRING = "地主仅出了一手牌后即被农民出完，惩罚性计分翻倍。";
const TIP_FOUR_TWO_SINGLES = "四张同点牌可带两张单牌一起出。";
const TIP_FOUR_TWO_PAIRS = "四张同点牌可带两个对子一起出。";
const TIP_LOOSE_PLANE = "连续三张的飞机牌型，允许所带牌数不足，常见于地方桌协商规则。";
const TIP_SHOW_BOTTOM = "确定地主后，公开三张底牌给所有人看。";
const TIP_STRADDLE = "UTG 位在发牌前主动投入 2× 大盲，获得翻前最后行动权。";
const TIP_RIT = "双方 All-in 后发两次公共牌（转牌+河牌），各赢半池，降低波动。";
const TIP_ANTE = "翻牌前所有/部分玩家强制投入的额外筹码（Ante），与盲注独立。";
const TIP_EXPOSE = "河牌圈结束后，剩余玩家必须亮出底牌比较牌型。";
const TIP_LIMIT = "NL 可随时全下任意筹码；PL 最多下注底池大小；FL 每轮下注额固定。";
const TIP_FOLLOW_PATTERN = "跟牌时必须出相同类型的牌型且点数更大；关闭则可垫小牌。";
const TIP_ANNOUNCE = "剩余 1-2 张牌时必须声明张数，防止偷跑。";
const TIP_RANK_POINTS = "按出完顺序排名计分，头游（第 1 名）得满分，末游扣分。";
const TIP_HEAD_SCORE = "每局最先出完牌的玩家获得的基础分。";

/* ---- Tip component ---- */

function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group ml-1 align-middle">
      <span className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full border border-[var(--muted)] text-[var(--muted)] text-[10px] leading-none font-bold cursor-help">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-[var(--surface)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
        {text}
      </span>
    </span>
  );
}

export default function EditorPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("blackjack");
  const [bj, setBj] = useState<BlackjackRules>({ ...PRESET_BLACKJACK_CLASSIC });
  const [dz, setDz] = useState<DoudizhuRules>({ ...PRESET_DOUDIZHU_CLASSIC });
  const [texas, setTexas] = useState<TexasHoldemRules>({ ...PRESET_TEXAS_CLASSIC });
  const [shangyou, setShangyou] = useState<ShangyouRules>({ ...PRESET_SHANGYOU_CLASSIC });
  const [roomName, setRoomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createRoom() {
    setErr(null);
    setBusy(true);
    try {
      const payload =
        tab === "blackjack"
          ? { gameType: "blackjack" as const, ruleSnapshot: bj }
          : tab === "doudizhu"
            ? { gameType: "doudizhu" as const, ruleSnapshot: dz }
            : tab === "texas"
              ? { gameType: "texas" as const, ruleSnapshot: texas }
              : { gameType: "shangyou" as const, ruleSnapshot: shangyou };
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName || undefined,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "创建失败");
        return;
      }
      window.location.href = `/rooms/${data.room.id}`;
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <p className="p-8">加载中…</p>;
  if (!session) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p>
          请先{" "}
          <Link href="/login" className="text-[var(--accent)] underline">
            登录
          </Link>{" "}
          再创建房间。
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">规则编辑器</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        选择玩法与预设，再按需微调；规则会快照写入房间。二十一点已支持联机牌桌，其余玩法为规则配置与占位。
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {(
          [
            ["blackjack", "二十一点"],
            ["doudizhu", "斗地主"],
            ["texas", "德州扑克"],
            ["shangyou", "上游"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded px-3 py-1 text-sm ${tab === id ? "bg-[var(--accent)] text-white" : "hover:bg-white/5"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-6 flex flex-col gap-1 text-sm">
        房间名称（可选）
        <input
          className="rounded border border-white/20 bg-[var(--surface)] px-3 py-2"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="例如：老同学局"
        />
      </label>

      {tab === "blackjack" && (
        <section className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-6">
          <h2 className="font-medium">二十一点规则</h2>
          {presetBar([{ label: "经典", value: PRESET_BLACKJACK_CLASSIC }], (v) => setBj({ ...v }))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bj.dealerHitsSoft17}
              onChange={(e) => setBj({ ...bj, dealerHitsSoft17: e.target.checked })}
            />
            庄家软 17 要牌（H17）<Tip text={TIP_H17} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            牌副数（1–8）
            <input
              type="number"
              min={1}
              max={8}
              className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
              value={bj.decks}
              onChange={(e) => setBj({ ...bj, decks: Number(e.target.value) || 1 })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Blackjack 赔付倍数（1–2，常见 1.5）
            <input
              type="number"
              step="0.1"
              min={1}
              max={2}
              className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
              value={bj.blackjackPayout}
              onChange={(e) =>
                setBj({ ...bj, blackjackPayout: Number(e.target.value) || 1 })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            最大分牌次数<Tip text={TIP_SPLIT} />（0=关闭；每成功分牌一次计一次，可多次分到多手）
            <input
              type="number"
              min={0}
              max={3}
              className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
              value={bj.maxSplits}
              onChange={(e) =>
                setBj({ ...bj, maxSplits: Number(e.target.value) || 0 })
              }
            />
            <span className="text-xs text-[var(--muted)]">
              分牌条件：当前子手恰好两张且<strong>同 rank</strong>（10 与 J 不可混分）。
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bj.doubleAfterSplit}
              onChange={(e) => setBj({ ...bj, doubleAfterSplit: e.target.checked })}
            />
            分牌后允许加倍<Tip text={TIP_DAS} />
          </label>
        </section>
      )}

      {tab === "doudizhu" && (
        <section className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-6">
          <h2 className="font-medium">斗地主规则</h2>
          {presetBar(
            [
              { label: "经典三人·抢地主", value: PRESET_DOUDIZHU_CLASSIC },
              { label: "叫分制", value: PRESET_DOUDIZHU_CALL_POINTS },
              { label: "四人两副", value: PRESET_DOUDIZHU_FOUR_PLAYER },
            ],
            (v) => setDz({ ...v }),
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              人数
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={dz.playerCount}
                onChange={(e) =>
                  setDz({ ...dz, playerCount: Number(e.target.value) as 3 | 4 })
                }
              >
                <option value={3}>3 人</option>
                <option value={4}>4 人</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              牌副数
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={dz.deckCount}
                onChange={(e) =>
                  setDz({ ...dz, deckCount: Number(e.target.value) as 1 | 2 })
                }
              >
                <option value={1}>1 副（54 张）</option>
                <option value={2}>2 副</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              叫牌方式
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={dz.bidStyle}
                onChange={(e) =>
                  setDz({
                    ...dz,
                    bidStyle: e.target.value as DoudizhuRules["bidStyle"],
                  })
                }
              >
                <option value="grab_landlord">抢地主</option>
                <option value="call_points">叫分制</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              底分 / 叫分基准（1–64）
              <input
                type="number"
                min={1}
                max={64}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={dz.baseScore}
                onChange={(e) =>
                  setDz({ ...dz, baseScore: Number(e.target.value) || 1 })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              顺子最少张数<Tip text={TIP_STRAIGHT_MIN} />（3–12）
              <input
                type="number"
                min={3}
                max={12}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={dz.straightMinLength}
                onChange={(e) =>
                  setDz({ ...dz, straightMinLength: Number(e.target.value) || 5 })
                }
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.allowRocket}
                onChange={(e) => setDz({ ...dz, allowRocket: e.target.checked })}
              />
              允许王炸<Tip text={TIP_ROCKET} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.bombDoublesScore}
                onChange={(e) => setDz({ ...dz, bombDoublesScore: e.target.checked })}
              />
              炸弹翻倍计分<Tip text={TIP_BOMB_DOUBLE} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.springBonus}
                onChange={(e) => setDz({ ...dz, springBonus: e.target.checked })}
              />
              春天加成<Tip text={TIP_SPRING} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.allowFourWithTwoSingles}
                onChange={(e) =>
                  setDz({ ...dz, allowFourWithTwoSingles: e.target.checked })
                }
              />
              允许四带二（单牌）<Tip text={TIP_FOUR_TWO_SINGLES} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.allowFourWithTwoPairs}
                onChange={(e) =>
                  setDz({ ...dz, allowFourWithTwoPairs: e.target.checked })
                }
              />
              允许四带两对<Tip text={TIP_FOUR_TWO_PAIRS} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.showBottomCardsAfterLandlord}
                onChange={(e) =>
                  setDz({ ...dz, showBottomCardsAfterLandlord: e.target.checked })
                }
              />
              确定地主后亮底牌<Tip text={TIP_SHOW_BOTTOM} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.antiSpring}
                onChange={(e) => setDz({ ...dz, antiSpring: e.target.checked })}
              />
              启用反春<Tip text={TIP_ANTI_SPRING} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dz.allowLoosePlaneAttachments}
                onChange={(e) =>
                  setDz({ ...dz, allowLoosePlaneAttachments: e.target.checked })
                }
              />
              飞机可少带（地方桌）<Tip text={TIP_LOOSE_PLANE} />
            </label>
          </div>
        </section>
      )}

      {tab === "texas" && (
        <section className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-6">
          <h2 className="font-medium">德州扑克（无限注/限注桌配置）</h2>
          {presetBar(
            [
              { label: "标准 9 人", value: PRESET_TEXAS_CLASSIC },
              { label: "单挑", value: PRESET_TEXAS_HEADS_UP },
              { label: "微额 6max", value: PRESET_TEXAS_MICROSTAKES },
            ],
            (v) => setTexas({ ...v }),
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              小盲
              <input
                type="number"
                min={0.01}
                step={0.01}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.smallBlind}
                onChange={(e) =>
                  setTexas({ ...texas, smallBlind: Math.max(0.01, Number(e.target.value) || 1) })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              大盲（须 ≥ 小盲）
              <input
                type="number"
                min={0.02}
                step={0.01}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.bigBlind}
                onChange={(e) =>
                  setTexas({ ...texas, bigBlind: Math.max(0.02, Number(e.target.value) || 2) })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              桌型
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.tableFormat}
                onChange={(e) =>
                  setTexas({
                    ...texas,
                    tableFormat: e.target.value as TexasHoldemRules["tableFormat"],
                  })
                }
              >
                <option value="full_ring">满员环桌</option>
                <option value="heads_up">单挑</option>
                <option value="short_6max">6-max</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              最大座位（2–10）
              <input
                type="number"
                min={2}
                max={10}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.maxPlayers}
                onChange={(e) =>
                  setTexas({ ...texas, maxPlayers: Number(e.target.value) || 9 })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              下注结构<Tip text={TIP_LIMIT} />
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.limitType}
                onChange={(e) =>
                  setTexas({
                    ...texas,
                    limitType: e.target.value as TexasHoldemRules["limitType"],
                  })
                }
              >
                <option value="no_limit">无限注 NL</option>
                <option value="pot_limit">底池限注 PL</option>
                <option value="fixed_limit">固定限注 FL</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              固定限注：小注 = 大盲 ×（1–8）
              <input
                type="number"
                min={1}
                max={8}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.fixedBetMultiplierOfBb}
                onChange={(e) =>
                  setTexas({
                    ...texas,
                    fixedBetMultiplierOfBb: Number(e.target.value) || 2,
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              前注类型<Tip text={TIP_ANTE} />
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.anteType}
                onChange={(e) =>
                  setTexas({
                    ...texas,
                    anteType: e.target.value as TexasHoldemRules["anteType"],
                  })
                }
              >
                <option value="none">无前注</option>
                <option value="big_blind">大盲位前注</option>
                <option value="button">庄位前注</option>
                <option value="all_players">全员前注</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              前注 = 大盲 × 倍数（0–2）
              <input
                type="number"
                min={0}
                max={2}
                step={0.05}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.anteMultiplierOfBb}
                onChange={(e) =>
                  setTexas({
                    ...texas,
                    anteMultiplierOfBb: Math.min(2, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              最小带入（大盲倍数）
              <input
                type="number"
                min={1}
                step={1}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.minBuyInBb}
                onChange={(e) =>
                  setTexas({ ...texas, minBuyInBb: Number(e.target.value) || 20 })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              最大带入（大盲倍数，须 ≥ 最小）
              <input
                type="number"
                min={1}
                step={1}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={texas.maxBuyInBb}
                onChange={(e) =>
                  setTexas({ ...texas, maxBuyInBb: Number(e.target.value) || 100 })
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={texas.straddleAllowed}
                onChange={(e) =>
                  setTexas({ ...texas, straddleAllowed: e.target.checked })
                }
              />
              允许 Straddle<Tip text={TIP_STRADDLE} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={texas.allowRunItTwice}
                onChange={(e) =>
                  setTexas({ ...texas, allowRunItTwice: e.target.checked })
                }
              />
              允许 Run it twice<Tip text={TIP_RIT} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={texas.exposeCardsAtShowdown}
                onChange={(e) =>
                  setTexas({ ...texas, exposeCardsAtShowdown: e.target.checked })
                }
              />
              摊牌亮牌<Tip text={TIP_EXPOSE} />
            </label>
          </div>
        </section>
      )}

      {tab === "shangyou" && (
        <section className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[var(--surface)] p-6">
          <h2 className="font-medium">上游 / 争上游规则</h2>
          {presetBar(
            [
              { label: "经典四人两副", value: PRESET_SHANGYOU_CLASSIC },
              { label: "组队 2v2", value: PRESET_SHANGYOU_TEAM_2V2 },
              { label: "单副·黑桃3先出", value: PRESET_SHANGYOU_SINGLE_DECK },
            ],
            (v) => setShangyou({ ...v }),
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={shangyou.teamMode}
                onChange={(e) =>
                  setShangyou({ ...shangyou, teamMode: e.target.checked })
                }
              />
              组队模式（2v2）
            </label>
            <label className="flex flex-col gap-1 text-sm">
              人数
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={shangyou.playerCount}
                onChange={(e) =>
                  setShangyou({
                    ...shangyou,
                    playerCount: Number(e.target.value) as 2 | 4,
                  })
                }
              >
                <option value={4}>4 人</option>
                <option value={2}>2 人</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              牌副数
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={shangyou.deckCount}
                onChange={(e) =>
                  setShangyou({
                    ...shangyou,
                    deckCount: Number(e.target.value) as 1 | 2,
                  })
                }
              >
                <option value={2}>2 副</option>
                <option value={1}>1 副</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              首出规则
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={shangyou.firstLeadRule}
                onChange={(e) =>
                  setShangyou({
                    ...shangyou,
                    firstLeadRule: e.target.value as ShangyouRules["firstLeadRule"],
                  })
                }
              >
                <option value="hearts3">红桃 3 先出</option>
                <option value="spades3">黑桃 3 先出</option>
                <option value="clubs3">梅花 3 先出</option>
                <option value="diamonds3">方片 3 先出</option>
                <option value="winner_of_last">上局头游先出</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              计分方式<Tip text={TIP_RANK_POINTS} />
              <select
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={shangyou.scoringMode}
                onChange={(e) =>
                  setShangyou({
                    ...shangyou,
                    scoringMode: e.target.value as ShangyouRules["scoringMode"],
                  })
                }
              >
                <option value="rank_points">名次分</option>
                <option value="none">不计分（纯娱乐）</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              头游基础分<Tip text={TIP_HEAD_SCORE} />（1–50）
              <input
                type="number"
                min={1}
                max={50}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={shangyou.headScore}
                onChange={(e) =>
                  setShangyou({ ...shangyou, headScore: Number(e.target.value) || 3 })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              末位倍率（相对头游，0.5–4）
              <input
                type="number"
                min={0.5}
                max={4}
                step={0.5}
                className="rounded border border-white/20 bg-[var(--bg)] px-3 py-2"
                value={shangyou.lastPlaceMultiplier}
                onChange={(e) =>
                  setShangyou({
                    ...shangyou,
                    lastPlaceMultiplier: Number(e.target.value) || 2,
                  })
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shangyou.mustFollowPattern}
                onChange={(e) =>
                  setShangyou({ ...shangyou, mustFollowPattern: e.target.checked })
                }
              />
              必须跟牌型且更大<Tip text={TIP_FOLLOW_PATTERN} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shangyou.allowBomb}
                onChange={(e) =>
                  setShangyou({ ...shangyou, allowBomb: e.target.checked })
                }
              />
              允许炸弹
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shangyou.allowJokerBomb}
                onChange={(e) =>
                  setShangyou({ ...shangyou, allowJokerBomb: e.target.checked })
                }
              />
              王炸 / 双王炸弹<Tip text={TIP_ROCKET} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shangyou.mustAnnounceLastCount}
                onChange={(e) =>
                  setShangyou({
                    ...shangyou,
                    mustAnnounceLastCount: e.target.checked,
                  })
                }
              />
              最后一手报张数<Tip text={TIP_ANNOUNCE} />
            </label>
          </div>
        </section>
      )}

      {err && <p className="mt-4 text-sm text-red-400">{err}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={() => void createRoom()}
        className="mt-8 w-full rounded-lg bg-[var(--accent)] py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "创建中…" : "创建房间"}
      </button>
    </main>
  );
}
