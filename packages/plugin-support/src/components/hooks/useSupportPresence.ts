"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

type PresenceApi = {
  list: unknown;
  heartbeat: unknown;
  disconnect: unknown;
};

type PresenceEntry = {
  userId: string;
  online?: boolean;
  data?: Record<string, unknown>;
  name?: string;
};

type UseSupportPresenceArgs = {
  presenceApi: PresenceApi;
  roomId: string;
  userId: string;
  intervalMs?: number;
};

const INVALID_ROOM_ID_PREFIX = "__support:";

const isValidRoomId = (roomId: string) =>
  roomId.trim().length > 0 && !roomId.startsWith(INVALID_ROOM_ID_PREFIX);

export const useSupportPresence = ({
  presenceApi,
  roomId,
  userId,
  intervalMs = 10_000,
}: UseSupportPresenceArgs): PresenceEntry[] => {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const heartbeat = useMutation(presenceApi.heartbeat as any) as (args: {
    roomId: string;
    userId: string;
    sessionId: string;
    interval?: number;
  }) => Promise<{ roomToken: string; sessionToken: string }>;
  const disconnect = useMutation(presenceApi.disconnect as any) as (args: {
    sessionToken: string;
  }) => Promise<null>;

  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sessionTokenRef.current) {
      void disconnect({ sessionToken: sessionTokenRef.current });
    }
    setSessionId(crypto.randomUUID());
    setSessionToken(null);
    setRoomToken(null);
  }, [disconnect, roomId, userId]);

  useEffect(() => {
    if (!isValidRoomId(roomId)) return;
    if (!userId.trim()) return;

    const sendHeartbeat = async () => {
      const response = await heartbeat({
        roomId,
        userId,
        sessionId,
        interval: intervalMs,
      });
      if (!response?.roomToken || !response?.sessionToken) return;
      setRoomToken(response.roomToken);
      setSessionToken(response.sessionToken);
    };

    void sendHeartbeat();
    intervalRef.current = setInterval(() => {
      void sendHeartbeat();
    }, intervalMs);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (sessionTokenRef.current) {
          void disconnect({ sessionToken: sessionTokenRef.current });
        }
        return;
      }

      void sendHeartbeat();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        void sendHeartbeat();
      }, intervalMs);
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      if (sessionTokenRef.current) {
        void disconnect({ sessionToken: sessionTokenRef.current });
      }
    };
  }, [disconnect, heartbeat, intervalMs, roomId, sessionId, userId]);

  const state = useQuery(
    presenceApi.list as any,
    roomToken ? ({ roomToken, limit: 100 } as any) : "skip",
  ) as PresenceEntry[] | undefined;

  return useMemo(() => {
    const entries = state ?? [];
    return [...entries].sort((a, b) => {
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      return 0;
    });
  }, [state, userId]);
};
