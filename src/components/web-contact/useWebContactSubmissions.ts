"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
	WEB_CONTACT_CONVERT_ENDPOINT,
	WEB_CONTACT_ENDPOINT,
	WEB_CONTACT_REJECT_ENDPOINT,
} from "@/constant/api-endpoints";
import type { WebContactSubmission } from "@/types/web-contact";

interface UseWebContactSubmissionsResult {
	data: WebContactSubmission[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
	reject: (id: number) => Promise<boolean>;
	convert: (id: number, leadId: number) => Promise<boolean>;
}

export function useWebContactSubmissions(
	status?: "PENDING" | "CONVERTED" | "REJECTED",
): UseWebContactSubmissionsResult {
	const { data: session } = useSession();
	const [data, setData] = useState<WebContactSubmission[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const token = session?.user?.accessToken;

	const load = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const url = status
				? `${WEB_CONTACT_ENDPOINT}?status=${status}`
				: WEB_CONTACT_ENDPOINT;
			const res = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				cache: "no-store",
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			setData(Array.isArray(json.data) ? json.data : []);
		} catch (err) {
			setError((err as Error).message);
			setData([]);
		} finally {
			setLoading(false);
		}
	}, [token, status]);

	useEffect(() => {
		void load();
	}, [load]);

	const reject = useCallback(
		async (id: number) => {
			if (!token) return false;
			try {
				const res = await fetch(WEB_CONTACT_REJECT_ENDPOINT(id), {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						reviewedById: session?.user?.id
							? Number.parseInt(session.user.id, 10)
							: undefined,
					}),
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				await load();
				return true;
			} catch {
				return false;
			}
		},
		[token, session?.user?.id, load],
	);

	const convert = useCallback(
		async (id: number, leadId: number) => {
			if (!token) return false;
			try {
				const res = await fetch(WEB_CONTACT_CONVERT_ENDPOINT(id), {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						leadId,
						reviewedById: session?.user?.id
							? Number.parseInt(session.user.id, 10)
							: undefined,
					}),
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				await load();
				return true;
			} catch {
				return false;
			}
		},
		[token, session?.user?.id, load],
	);

	return { data, loading, error, refresh: load, reject, convert };
}
