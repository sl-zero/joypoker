import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const s = process.env.GAME_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("GAME_JWT_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(s);
};

export async function signGameToken(payload: {
  sub: string;
  roomId: string;
  name: string | null;
}): Promise<string> {
  return new SignJWT({ roomId: payload.roomId, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyGameToken(token: string): Promise<{
  sub: string;
  roomId: string;
  name: string | null;
}> {
  const { payload } = await jwtVerify(token, getSecret());
  const sub = payload.sub;
  const roomId = payload.roomId as string | undefined;
  if (!sub || !roomId) throw new Error("Invalid token payload");
  return {
    sub,
    roomId,
    name: (payload.name as string) ?? null,
  };
}
