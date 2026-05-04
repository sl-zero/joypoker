import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { verifyGameToken } from "./verifyGameToken";
import { prisma } from "./prisma";
import { BlackjackRoom } from "./blackjackRoom";
import { ShangyouRoom } from "./shangyouRoom";
import { DoudizhuRoom } from "./doudizhuRoom";
import { TexasHoldemRoom } from "./texasHoldemRoom";
import {
  blackjackRulesSchema,
  doudizhuRulesSchema,
  parseRuleProfile,
  shangyouRulesSchema,
  texasHoldemRulesSchema,
} from "@poker/rules-schema";
import { emitGameState, type RuntimeRoom } from "./gameBroadcast";

const PORT = Number(process.env.PORT) || 4000;
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const WEB_API_URL = process.env.WEB_API_URL ?? "http://localhost:3000";
const INTERNAL_SECRET = process.env.INTERNAL_GAME_SECRET ?? "";

const app = express();
app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) =>
  res.json({
    ok: true,
    service: "poker-game-server",
    hint: "Socket.IO 在根路径不提供网页；请从 http://localhost:3000 打开前端，或访问 /health",
    health: "/health",
  }),
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: WEB_ORIGIN, credentials: true },
});

type SocketAuth = { userId: string; roomId: string; name: string | null };

const rooms = new Map<string, RuntimeRoom>();
const chatBuckets = new Map<string, number[]>();

function rateLimitChat(userId: string, max = 8, windowMs = 8000): boolean {
  const now = Date.now();
  const arr = chatBuckets.get(userId) ?? [];
  const pruned = arr.filter((t) => now - t < windowMs);
  if (pruned.length >= max) return false;
  pruned.push(now);
  chatBuckets.set(userId, pruned);
  return true;
}

function getOrCreateRuntime(roomId: string, gameType: string, ownerId: string, ruleSnapshot: unknown): RuntimeRoom {
  let r = rooms.get(roomId);
  if (!r) {
    r = { roomId, sockets: new Map(), gameType, ownerId, ruleSnapshot };
    rooms.set(roomId, r);
  }
  return r;
}

async function persistHand(roomId: string, scores: Record<string, number>, ruleSnapshot: unknown) {
  if (!INTERNAL_SECRET) return;
  const scaled: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    scaled[k] = Math.round(v * 10);
  }
  const res = await fetch(`${WEB_API_URL}/api/internal/game-hand`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ roomId, scores: scaled, ruleSnapshot }),
  }).catch((e) => {
    console.error("persistHand", e);
    return null;
  });
  if (res?.ok) io.to(roomId).emit("scoresUpdated");
}

async function persistChat(roomId: string, userId: string, body: string) {
  if (!INTERNAL_SECRET) return;
  await fetch(`${WEB_API_URL}/api/internal/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ roomId, userId, body }),
  }).catch((e) => console.error("persistChat", e));
}

function ensureGameRoom(rt: RuntimeRoom, gameType: string, ruleSnapshot: unknown): void {
  const profile = parseRuleProfile(ruleSnapshot);
  if (gameType === "blackjack" && !rt.blackjack) {
    rt.blackjack = new BlackjackRoom(rt.roomId, rt.ownerId, blackjackRulesSchema.parse(profile));
  }
  if (gameType === "shangyou" && !rt.shangyou) {
    rt.shangyou = new ShangyouRoom(rt.roomId, rt.ownerId, shangyouRulesSchema.parse(profile));
  }
  if (gameType === "doudizhu" && !rt.doudizhu) {
    rt.doudizhu = new DoudizhuRoom(rt.roomId, rt.ownerId, doudizhuRulesSchema.parse(profile));
  }
  if (gameType === "texas" && !rt.texas) {
    rt.texas = new TexasHoldemRoom(rt.roomId, rt.ownerId, texasHoldemRulesSchema.parse(profile));
  }
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("missing token"));
    const payload = await verifyGameToken(token);
    (socket.data as { auth?: SocketAuth }).auth = {
      userId: payload.sub,
      roomId: payload.roomId,
      name: payload.name,
    };
    next();
  } catch (e) {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const auth = (socket.data as { auth?: SocketAuth }).auth;
  if (!auth) {
    socket.disconnect();
    return;
  }

  socket.on("joinRoom", async () => {
    const { roomId, userId } = auth;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      socket.emit("errorMsg", { message: "房间不存在" });
      return;
    }
    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId },
    });
    if (!member) {
      socket.emit("errorMsg", { message: "无权进入" });
      return;
    }
    const rt = getOrCreateRuntime(room.id, room.gameType, room.ownerId, room.ruleSnapshot);
    rt.sockets.set(socket.id, userId);
    socket.join(roomId);
    try {
      parseRuleProfile(room.ruleSnapshot);
    } catch {
      socket.emit("errorMsg", { message: "房间规则快照无效" });
      return;
    }
    ensureGameRoom(rt, room.gameType, room.ruleSnapshot);
    emitGameState(io, roomId, rt);
    io.to(roomId).emit("presence", { count: rt.sockets.size });
  });

  socket.on("chat", async (payload: { text?: string }) => {
    const text = (payload?.text ?? "").trim();
    if (text.length < 1 || text.length > 500) return;
    if (!rateLimitChat(auth.userId)) {
      socket.emit("errorMsg", { message: "发送太频繁" });
      return;
    }
    await persistChat(auth.roomId, auth.userId, text);
    io.to(auth.roomId).emit("chat", {
      userId: auth.userId,
      name: auth.name ?? "玩家",
      text,
      at: Date.now(),
    });
  });

  socket.on("startGame", async () => {
    const rt = rooms.get(auth.roomId);
    if (!rt || auth.userId !== rt.ownerId) {
      socket.emit("errorMsg", { message: "仅房主可开始" });
      return;
    }
    const members = await prisma.roomMember.findMany({
      where: { roomId: auth.roomId },
      include: { user: true },
      orderBy: { seatOrder: "asc" },
    });
    const m = members.map((x) => ({ userId: x.userId, name: x.user.name }));
    if (rt.gameType === "blackjack" && rt.blackjack) {
      const res = rt.blackjack.start(m);
      if (!res.ok) {
        socket.emit("errorMsg", { message: res.error });
        return;
      }
      emitGameState(io, auth.roomId, rt);
      if (res.autoFinished && rt.blackjack.lastPayout) {
        await persistHand(auth.roomId, rt.blackjack.lastPayout, rt.ruleSnapshot);
      }
      return;
    }
    if (rt.gameType === "shangyou" && rt.shangyou) {
      const res = rt.shangyou.start(m);
      if (!res.ok) {
        socket.emit("errorMsg", { message: res.error });
        return;
      }
      emitGameState(io, auth.roomId, rt);
      return;
    }
    if (rt.gameType === "doudizhu" && rt.doudizhu) {
      const res = rt.doudizhu.start(m);
      if (!res.ok) {
        socket.emit("errorMsg", { message: res.error });
        return;
      }
      emitGameState(io, auth.roomId, rt);
      return;
    }
    if (rt.gameType === "texas" && rt.texas) {
      const res = rt.texas.start(m);
      if (!res.ok) {
        socket.emit("errorMsg", { message: res.error });
        return;
      }
      emitGameState(io, auth.roomId, rt);
      return;
    }
  });

  socket.on("hit", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.blackjack) return;
    const r = rt.blackjack.hit(auth.userId);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.blackjack.phase === "payout" && rt.blackjack.lastPayout) {
      void persistHand(auth.roomId, rt.blackjack.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("stand", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.blackjack) return;
    const r = rt.blackjack.stand(auth.userId);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.blackjack.phase === "payout" && rt.blackjack.lastPayout) {
      void persistHand(auth.roomId, rt.blackjack.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("split", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.blackjack) return;
    const r = rt.blackjack.split(auth.userId);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.blackjack.phase === "payout" && rt.blackjack.lastPayout) {
      void persistHand(auth.roomId, rt.blackjack.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("newRound", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt || auth.userId !== rt.ownerId) {
      socket.emit("errorMsg", { message: "仅房主可开新局" });
      return;
    }
    if (rt.blackjack) {
      rt.blackjack.resetLobby();
      emitGameState(io, auth.roomId, rt);
    } else if (rt.shangyou) {
      rt.shangyou.resetLobby();
      emitGameState(io, auth.roomId, rt);
    } else if (rt.doudizhu) {
      rt.doudizhu.resetLobby();
      emitGameState(io, auth.roomId, rt);
    } else if (rt.texas) {
      rt.texas.resetLobby();
      emitGameState(io, auth.roomId, rt);
    }
  });

  socket.on("playCards", (payload: { cardIds?: string[]; announce?: 1 | 2 }) => {
    const rt = rooms.get(auth.roomId);
    const ids = payload?.cardIds ?? [];
    if (rt?.shangyou) {
      const r = rt.shangyou.playCards(auth.userId, ids, payload?.announce);
      if (!r.ok) socket.emit("errorMsg", { message: r.error });
      emitGameState(io, auth.roomId, rt);
      if (rt.shangyou.phase === "payout" && rt.shangyou.lastPayout) {
        void persistHand(auth.roomId, rt.shangyou.lastPayout, rt.ruleSnapshot);
      }
      return;
    }
    if (rt?.doudizhu) {
      const r = rt.doudizhu.playCards(auth.userId, ids);
      if (!r.ok) socket.emit("errorMsg", { message: r.error });
      emitGameState(io, auth.roomId, rt);
      if (rt.doudizhu.phase === "payout" && rt.doudizhu.lastPayout) {
        void persistHand(auth.roomId, rt.doudizhu.lastPayout, rt.ruleSnapshot);
      }
    }
  });

  socket.on("pass", () => {
    const rt = rooms.get(auth.roomId);
    if (rt?.shangyou) {
      const r = rt.shangyou.pass(auth.userId);
      if (!r.ok) socket.emit("errorMsg", { message: r.error });
      emitGameState(io, auth.roomId, rt);
      return;
    }
    if (rt?.doudizhu) {
      const r = rt.doudizhu.pass(auth.userId);
      if (!r.ok) socket.emit("errorMsg", { message: r.error });
      emitGameState(io, auth.roomId, rt);
    }
  });

  socket.on("doudizhuBid", (payload: { action?: string; points?: number }) => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.doudizhu) return;
    let res: { ok: boolean; error?: string };
    if (payload?.action === "grab") res = rt.doudizhu.bid(auth.userId, "grab");
    else if (payload?.action === "nograb") res = rt.doudizhu.bid(auth.userId, "nograb");
    else if (payload?.action === "pass") res = rt.doudizhu.bid(auth.userId, "pass");
    else if (typeof payload?.points === "number") res = rt.doudizhu.bid(auth.userId, payload.points);
    else {
      socket.emit("errorMsg", { message: "无效叫牌" });
      return;
    }
    if (!res.ok) socket.emit("errorMsg", { message: res.error });
    emitGameState(io, auth.roomId, rt);
  });

  socket.on("texasFold", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.texas) return;
    const r = rt.texas.fold(auth.userId);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.texas.phase === "payout" && rt.texas.lastPayout) {
      void persistHand(auth.roomId, rt.texas.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("texasCheck", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.texas) return;
    const r = rt.texas.check(auth.userId);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.texas.phase === "payout" && rt.texas.lastPayout) {
      void persistHand(auth.roomId, rt.texas.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("texasCall", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.texas) return;
    const r = rt.texas.call(auth.userId);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.texas.phase === "payout" && rt.texas.lastPayout) {
      void persistHand(auth.roomId, rt.texas.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("texasRaiseTo", (payload: { total?: number }) => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.texas) return;
    const t = Number(payload?.total);
    if (!Number.isFinite(t)) {
      socket.emit("errorMsg", { message: "无效加注额" });
      return;
    }
    const r = rt.texas.raiseTo(auth.userId, t);
    if (!r.ok) socket.emit("errorMsg", { message: r.error });
    emitGameState(io, auth.roomId, rt);
    if (rt.texas.phase === "payout" && rt.texas.lastPayout) {
      void persistHand(auth.roomId, rt.texas.lastPayout, rt.ruleSnapshot);
    }
  });

  socket.on("texasNewHand", () => {
    const rt = rooms.get(auth.roomId);
    if (!rt?.texas || auth.userId !== rt.ownerId) return;
    rt.texas.newHand();
    emitGameState(io, auth.roomId, rt);
  });

  socket.on("disconnect", () => {
    const rt = rooms.get(auth.roomId);
    if (rt) {
      rt.sockets.delete(socket.id);
      io.to(auth.roomId).emit("presence", { count: rt.sockets.size });
    }
  });
});

server.listen(PORT, () => {
  console.log(`game-server http://localhost:${PORT}`);
});
