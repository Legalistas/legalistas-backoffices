"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { GOOGLE_CALENDAR_CALLBACK_ENDPOINT } from "@/constant/api-endpoints";

function GoogleCallbackContent() {
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);
	const [message, setMessage] = useState("Conectando Google Calendar...");
	const processed = useRef(false);

	useEffect(() => {
		if (processed.current || !session?.user?.accessToken) return;

		const code = searchParams.get("code");
		if (!code) {
			setStatus("error");
			setMessage("No se recibió código de autorización");
			return;
		}

		processed.current = true;

		fetch(GOOGLE_CALENDAR_CALLBACK_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.user.accessToken}`,
			},
			body: JSON.stringify({ code }),
		})
			.then(async (res) => {
				if (!res.ok) {
					const errorData = await res.json().catch(() => ({}));
					console.error("[Google Calendar] Backend error:", res.status, errorData);
					throw new Error(errorData.error || `Error ${res.status}`);
				}
				return res.json();
			})
			.then(() => {
				setStatus("success");
				setMessage("Google Calendar vinculado exitosamente. Redirigiendo...");
				setTimeout(() => {
					window.location.href = "/admin/calendar";
				}, 2000);
			})
			.catch((err) => {
				console.error("[Google Calendar] Error completo:", err);
				setStatus("error");
				setMessage(`Error al vincular: ${err.message}`);
			});
	}, [searchParams, session?.user?.accessToken]);

	return (
		<div className="flex min-h-[400px] items-center justify-center">
			<div className="text-center space-y-4">
				{status === "loading" && (
					<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
				)}
				{status === "success" && (
					<div className="h-12 w-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
						<svg
							className="h-6 w-6 text-emerald-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				)}
				{status === "error" && (
					<div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
						<svg
							className="h-6 w-6 text-destructive"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</div>
				)}
				<p className="text-foreground font-medium">{message}</p>
				{status === "success" && (
					<p className="text-sm text-muted-foreground">
						Esta ventana se cerrará automáticamente...
					</p>
				)}
				{status === "error" && (
					<button
						type="button"
						onClick={() => window.close()}
						className="text-sm text-primary underline"
					>
						Cerrar ventana
					</button>
				)}
			</div>
		</div>
	);
}

export default function GoogleCallbackPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-[400px] items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
				</div>
			}
		>
			<GoogleCallbackContent />
		</Suspense>
	);
}
