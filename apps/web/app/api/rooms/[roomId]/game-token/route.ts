import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signGameToken } from "@/lib/game-jwt";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  const member = await prisma.roomMember.findFirst({
    where: { roomId, userId: session.user.id },
    include: { user: true },
  });
  if (!member) {
    return NextResponse.json({ error: "不在房间内" }, { status: 403 });
  }
  try {
    const token = await signGameToken({
      sub: session.user.id,
      roomId,
      name: member.user.name,
    });
    return NextResponse.json({ token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "令牌配置错误，请设置 GAME_JWT_SECRET" }, { status: 500 });
  }
}
