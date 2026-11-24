import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  namespace: "/trades",
})
export class TradesGateway {
  @WebSocketServer() server!: Server;
  publish(action: "created" | "amended" | "cancelled", id: string) {
    this.server.emit("trade.changed", {
      action,
      id,
      at: new Date().toISOString(),
    });
  }
}
