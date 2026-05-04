import type { Server } from "socket.io";
import type { BlackjackRoom } from "./blackjackRoom";
import type { ShangyouRoom } from "./shangyouRoom";
import type { DoudizhuRoom } from "./doudizhuRoom";
import type { TexasHoldemRoom } from "./texasHoldemRoom";

export interface RuntimeRoom {
  roomId: string;
  sockets: Map<string, string>;
  gameType: string;
  ownerId: string;
  ruleSnapshot: unknown;
  blackjack?: BlackjackRoom;
  shangyou?: ShangyouRoom;
  doudizhu?: DoudizhuRoom;
  texas?: TexasHoldemRoom;
}

export function emitGameState(io: Server, roomId: string, rt: RuntimeRoom): void {
  for (const [socketId, userId] of rt.sockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    if (rt.blackjack) {
      socket.emit("gameState", rt.blackjack.publicState(userId));
    } else if (rt.shangyou) {
      socket.emit("gameState", rt.shangyou.publicState(userId));
    } else if (rt.doudizhu) {
      socket.emit("gameState", rt.doudizhu.publicState(userId));
    } else if (rt.texas) {
      socket.emit("gameState", rt.texas.publicState(userId));
    }
  }
}
