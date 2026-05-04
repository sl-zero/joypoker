import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  roomId: z.string(),
  userId: z.string(),
  body: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_GAME_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = schema.parse(await req.json());
    const msg = await prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        body: data.body,
      },
    });
    return NextResponse.json({ id: msg.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
