"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CASE_CRM_ENDPOINT } from "@/constant/api-endpoints";
import type { CaseCrm } from "@/types/case-activity";

/**
 * Datos del CRM de la causa (lead, notas, reunión de entrada). Si falla, la
 * causa se sigue viendo igual: el CRM es un agregado, no bloquea.
 */
export function useCaseCrm(caseId: string | number) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [crm, setCrm] = useState<CaseCrm | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		fetch(CASE_CRM_ENDPOINT(Number(caseId)), {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data: CaseCrm | null) => {
				if (!cancelled) setCrm(data);
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [caseId, token]);

	return { crm, loading };
}
