"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { API_BASE_URL } from "@/constant/api-endpoints";

/**
 * After "Cerrar las otras sesiones" on another device, the backend answers 401
 * with code SESSION_REVOKED. The panel calls the API with plain fetch all over,
 * so this wraps window.fetch once instead of touching every call.
 */
export function useSignOutOnRevokedSession() {
	useEffect(() => {
		const original = window.fetch;
		let signingOut = false;

		window.fetch = async (...args: Parameters<typeof fetch>) => {
			const res = await original(...args);
			if (res.status !== 401 || signingOut) return res;

			const [input] = args;
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			if (url.startsWith(API_BASE_URL)) {
				res
					.clone()
					.json()
					.then((body) => {
						if (body?.code === "SESSION_REVOKED" && !signingOut) {
							signingOut = true;
							signOut({ callbackUrl: "/signin" });
						}
					})
					.catch(() => {});
			}
			return res;
		};

		return () => {
			window.fetch = original;
		};
	}, []);
}
