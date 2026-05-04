import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  roomId: z.string(),
  scores: z.record(z.string(), z.number()),
  ruleSnapshot: z.unknown(),
});

/** Called by game-server to persist hand results and update member totals */
export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_GAME_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    await prisma.$transaction(async (tx) => {
      await tx.gameRecord.create({
        data: {
          roomId: body.roomId,
          scores: body.scores,
          ruleSnapshot: body.ruleSnapshot as object,
        },
      });
      for (const [userId, delta] of Object.entries(body.scores)) {
        await tx.roomMember.updateMany({
          where: { roomId: body.roomId, userId },
          data: { totalScore: { increment: delta } },
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "persist failed" }, { status: 500 });
  }
}
