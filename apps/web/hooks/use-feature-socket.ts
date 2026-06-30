import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "~/trpc/client";

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    // NEXT_PUBLIC_API_URL is e.g. "https://api.indecode.in/trpc" — we need just the origin
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let socketUrl: string;
    try {
      socketUrl = new URL(rawUrl).origin;
    } catch {
      socketUrl = rawUrl;
    }
    socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function useFeatureSocket(featureId: string) {
  const utils = trpc.useUtils();
  const featureIdRef = useRef(featureId);
  featureIdRef.current = featureId;

  useEffect(() => {
    if (!featureId) return;

    const sock = getSocket();
    sock.emit("joinFeature", featureId);

    // Listen for task status updates — optimistically patch the tRPC cache
    const handleTaskUpdated = (updatedTask: any) => {
      // Optimistically update the task in the list cache
      utils.task.listByFeature.setData(
        { featureRequestId: featureIdRef.current },
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((t) =>
            t.id === updatedTask.id ? { ...t, status: updatedTask.status } : t
          );
        }
      );
    };

    // Listen for feature status updates — patch cache AND refetch to get full data
    const handleFeatureUpdated = (updatedFeature: any) => {
      // Optimistically patch the status first for instant UI response
      utils.featureRequest.getById.setData(
        { featureRequestId: featureIdRef.current },
        (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, status: updatedFeature.status };
        }
      );

      // Then do a full refetch to get any other data that may have changed
      utils.featureRequest.getById.invalidate({ featureRequestId: featureIdRef.current });
      utils.task.listByFeature.invalidate({ featureRequestId: featureIdRef.current });

      // If status is "review", the AI agent is done — leave the room
      if (updatedFeature.status === "review") {
        sock.emit("leaveFeature", featureIdRef.current);
      }
    };

    sock.on("taskUpdated", handleTaskUpdated);
    sock.on("featureUpdated", handleFeatureUpdated);

    return () => {
      sock.off("taskUpdated", handleTaskUpdated);
      sock.off("featureUpdated", handleFeatureUpdated);
      sock.emit("leaveFeature", featureId);
    };
  }, [featureId, utils]);
}
