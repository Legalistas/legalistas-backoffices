"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import type { TaskChangedEvent } from "@/types/workspace";

/**
 * Avisos en vivo de un tablero (alguien creó, movió o comentó una tarea).
 * Llega solo el aviso; quien lo recibe vuelve a pedir los datos. `null` =
 * se reconectó y pudo perderse avisos: hay que recargar todo.
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
