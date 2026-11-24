import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { API } from "../lib/api";

export function useTradeEvents() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState("");

  useEffect(() => {
    const socket = io(`${API}/trades`, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["trades"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["audit"] });
    };

    const onConnect = () => {
      setConnected(true);
      refresh();
    };
    const onDisconnect = () => setConnected(false);
    const onTradeChanged = (event: { action: string; at: string }) => {
      setLastEvent(
        `${event.action} · ${new Date(event.at).toLocaleTimeString()}`,
      );
      refresh();
    };

    setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    socket.on("trade.changed", onTradeChanged);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
      socket.off("trade.changed", onTradeChanged);
      socket.disconnect();
    };
  }, [queryClient]);

  return { connected, lastEvent };
}
