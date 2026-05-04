import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { seatOrder: "asc" },
        },
        owner: { select: { id: true, name: true } },
        records: { orderBy: { createdAt: "desc" }, take: 20 },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!room) return NextResponse.json({ error: "房间不存在" }, { status: 404 });
    return NextResponse.json({ room });
  } catch (e) {
    console.error("[GET /api/rooms/[roomId]]", roomId, e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  const action = (await req.json()) as { action?: string };
  if (action.action !== "join") {
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  }
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  });
  if (!room) return NextResponse.json({ error: "房间不存在" }, { status: 404 });
  const already = room.members.some((m) => m.userId === session.user.id);
  if (!already) {
    const maxSeat = room.members.reduce((a, m) => Math.max(a, m.seatOrder ?? 0), -1);
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: session.user.id,
        seatOrder: maxSeat + 1,
      },
    });
  }
  const updated = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { seatOrder: "asc" },
      },
    },
  });
  return NextResponse.json({ room: updated });
}
