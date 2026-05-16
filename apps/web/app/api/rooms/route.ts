import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRuleProfile } from "@poker/rules-schema";
import { z } from "zod";
import { randomBytes } from "crypto";

function randomRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const buf = randomBytes(8);
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

const createSchema = z.object({
  name: z.string().max(60).optional(),
  gameType: z.enum(["blackjack", "doudizhu", "texas", "shangyou"]),
  ruleSnapshot: z.unknown(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  try {
    const body = createSchema.parse(await req.json());
    const ruleSnapshot = parseRuleProfile(body.ruleSnapshot);
    if (ruleSnapshot.gameType !== body.gameType) {
      return NextResponse.json({ error: "规则与玩法类型不一致" }, { status: 400 });
    }
    const code = randomRoomCode();
    const room = await prisma.room.create({
      data: {
        code,
        name: body.name ?? `房间 ${code}`,
        ownerId: session.user.id,
        gameType: body.gameType,
        ruleSnapshot: ruleSnapshot as object,
        members: {
          create: {
            userId: session.user.id,
            totalScore: 0,
            seatOrder: 0,
            source: body.source ?? "editor",
          },
        },
      },
    });
    return NextResponse.json({ room });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "参数无效", details: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "缺少 code" }, { status: 400 });
  }
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      owner: { select: { id: true, name: true } },
    },
  });
  if (!room) return NextResponse.json({ error: "房间不存在" }, { status: 404 });
  return NextResponse.json({ room });
}
