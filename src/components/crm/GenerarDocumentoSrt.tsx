"use client";

import { FileSignature, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LEADS_SRT_DOCUMENT_ENDPOINT } from "@/constant/api-endpoints";
import type { CrmDocument, Lead } from "@/types/crm";

// Carta Poder SRT and Acepta Patrocinio, filled with the worker's data and the
// assigned representative's. The backend files the PDF in the lead's
// Documents and voids the previous one of the same type.

type Tipo = "carta-poder" | "patrocinio";

const TIPOS: { tipo: Tipo; label: string }[] = [
	{ tipo: "carta-poder", label: "Carta Poder SRT" },
	{ tipo: "patrocinio", label: "Acepta Patrocinio" },
];

export const ANULADO = "ANULADO — ";

export default function GenerarDocumentoSrt({
	lead,
	onLeadUpdate,
}: {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}) {
	const { data: session } = useSession();
	const [generando, setGenerando] = useState<Tipo | null>(null);

	const generar = async (tipo: Tipo, label: string) => {
		if (generando) return;
		setGenerando(tipo);
		try {
			const res = await fetch(LEADS_SRT_DOCUMENT_ENDPOINT(Number(lead.id), tipo), {
				method: "POST",
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			const { document, url, anulados } = body as {
				document: CrmDocument;
				url: string | null;
				anulados: number;
			};
			const categoria = `srt-${tipo}`;
			onLeadUpdate({
				...lead,
				crmDocument: [
					document,
					...(lead.crmDocument ?? []).map((d) =>
						d.category === categoria && !d.description?.startsWith(ANULADO)
							? { ...d, description: `${ANULADO}${d.description ?? ""}` }
							: d,
					),
				],
			});
			toast.success(
				anulados > 0
					? `${label} generada. La anterior quedó anulada.`
					: `${label} generada y guardada en Documentos.`,
			);
			if (url) window.open(url, "_blank", "noopener,noreferrer");
		} catch (err) {
			toast.error((err as Error).message, { duration: 8000 });
		} finally {
			setGenerando(null);
		}
	};

	return (
		<div className="flex flex-wrap gap-2">
			{TIPOS.map(({ tipo, label }) => (
				<Button
					key={tipo}
					variant="outline"
					size="sm"
					className="gap-1.5"
					disabled={generando !== null}
					onClick={() => generar(tipo, label)}
				>
					{generando === tipo ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<FileSignature className="h-4 w-4" />
					)}
					{label}
				</Button>
			))}
		</div>
	);
}
