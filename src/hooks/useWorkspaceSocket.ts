"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { TaskChangedEvent } from "@/types/workspace";

/**
 * Live notices for a board (someone created, moved or commented on a task).
 * Only the notice arrives; the receiver re-fetches the data. `null` = the
 * socket reconnected and may have missed notices: reload everything.
 */
export function useProjectRealtime(
	projectId: number,
	token: string | undefined,
	onChange: (e: TaskChangedEvent | null) => void,
) {
	const handler = useRef(onChange);
	handler.current = onChange;

	useEffect(() => {
		if (!token) return;
		const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/workspace`, {
			auth: { token },
			path: "/socket.io",
			transports: ["websocket", "polling"],
		});
		let first = true;
		socket.on("connect", () => {
			socket.emit("project:join", projectId);
			if (!first) handler.current(null);
			first = false;
		});
		socket.on("task:changed", (e: TaskChangedEvent) => handler.current(e));
		return () => {
			socket.emit("project:leave", projectId);
			socket.disconnect();
		};
	}, [projectId, token]);
}
