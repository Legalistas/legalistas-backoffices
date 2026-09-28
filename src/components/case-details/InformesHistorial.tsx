"use client";

import { Bell, FileDown, History, Loader2, Mail, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CASE_INFORMES_ENDPOINT, INFORME_DESCARGA_URL } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";

// Historial de informes periódicos del caso (relevamiento 12): cada versión
// guardada, con los envíos al cliente (canal, fecha, destinatario, quién).

export type CanalEnvio = "EMAIL" | "WHATSAPP" | "PUSH";

interface EnvioInforme {
	id: number;
	canal: CanalEnvio;
	destinatario: string | null;
	createdAt: string;
	enviadoPor: { id: number; name: string } | null;
}

export interface InformeHistorial {
	id: number;
	fileName: string;
	description: string | null;
	downloadToken: string | null;
	uploadedAt: string;
	uploadedBy: { id: number; name: string } | null;
	informeEnvios: EnvioInforme[];
	link: string | null;
	/** Los anteriores al historial se perdieron en los deploys: sin PDF. */
	disponible: boolean;
}

const CANALES: Record<CanalEnvio, { label: string; icono: typeof Mail; clase: string }> = {
	EMAIL: { label: "Email", icono: Mail, clase: "border-sky-200 bg-sky-50 text-sky-700" },
	WHATSAPP: { label: "WhatsApp", icono: Send, clase: "border-green-200 bg-green-50 text-green-700" },
	PUSH: { label: "Push", icono: Bell, clase: "border-orange-200 bg-orange-50 text-orange-700" },
};

/** "28/09/2026 15:30" en hora argentina. */
export const fechaHora = (fecha: string) =>
	new Date(fecha)
		.toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "America/Argentina/Buenos_Aires",
		})
		.replace(",", "");

interface InformesHistorialProps {
	caseId: number;
	/** Cambia cada vez que se guarda o envía un informe: vuelve a cargar. */
	recargar: number;
	onReenviar: (informe: InformeHistorial) => void;
}

export function InformesHistorial({ caseId, recargar, onReenviar }: InformesHistorialProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [informes, setInformes] = useState<InformeHistorial[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `recargar` fuerza la recarga
	useEffect(() => {
		if (!token) return;
		let vigente = true;
		(async () => {
			try {
				const res = await fetch(CASE_INFORMES_ENDPOINT(caseId), {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo cargar el historial"));
				const json = await res.json();
				if (vigente) {
					setInformes(json.data ?? []);
					setError(null);
				}
			} catch (e) {
				if (vigente) setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
			}
		})();
		return () => {
			vigente = false;
		};
	}, [caseId, token, recargar]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<History className="h-4 w-4 text-muted-foreground" />
					<p className="text-sm font-semibold text-foreground">Historial de informes</p>
				</div>
				{informes && informes.length > 0 && (
					<span className="text-xs text-muted-foreground">
						{informes.length} {informes.length === 1 ? "informe" : "informes"}
					</span>
				)}
			</div>

			{error ? (
				<p className="text-sm text-destructive">{error}</p>
			) : informes === null ? (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" /> Cargando…
				</div>
			) : informes.length === 0 ? (
				<p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
					Todavía no se generó ningún informe para este caso.
				</p>
			) : (
				<div className="divide-y rounded-lg border">
					{informes.map((inf, i) => (
						<div
							key={inf.id}
							className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
						>
							<div className="min-w-0 space-y-1.5">
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium text-foreground">{fechaHora(inf.uploadedAt)}</p>
									{i === 0 && (
										<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
											Último
										</span>
									)}
								</div>
								{inf.uploadedBy && (
									<p className="text-xs text-muted-foreground">Generado por {inf.uploadedBy.name}</p>
								)}
								<div className="flex flex-wrap gap-1.5">
									{inf.informeEnvios.length === 0 ? (
										<span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
											Sin enviar
										</span>
									) : (
										inf.informeEnvios.map((e) => {
											const canal = CANALES[e.canal] ?? CANALES.EMAIL;
											const Icono = canal.icono;
											return (
												<span
													key={e.id}
													title={e.enviadoPor ? `Enviado por ${e.enviadoPor.name}` : undefined}
													className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${canal.clase}`}
												>
													<Icono className="h-3 w-3" />
													{canal.label} · {fechaHora(e.createdAt)}
													{e.destinatario ? ` · ${e.destinatario}` : ""}
												</span>
											);
										})
									)}
								</div>
							</div>

							<div className="flex shrink-0 items-center gap-1.5">
								{inf.disponible && inf.downloadToken ? (
									<>
										<Button size="sm" variant="outline" asChild>
											<a href={INFORME_DESCARGA_URL(inf.downloadToken)} target="_blank" rel="noreferrer">
												<FileDown className="mr-1.5 h-3.5 w-3.5" />
												Ver PDF
											</a>
										</Button>
										<Button size="sm" variant="outline" onClick={() => onReenviar(inf)}>
											<Mail className="mr-1.5 h-3.5 w-3.5" />
											Reenviar
										</Button>
									</>
								) : (
									<span
										className="text-xs text-muted-foreground"
										title="Informe anterior al historial: el archivo estaba en el servidor y se perdió en una actualización."
									>
										PDF no disponible
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
