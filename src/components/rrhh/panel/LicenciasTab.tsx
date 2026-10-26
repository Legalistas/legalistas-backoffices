"use client";

import { Check, FileText, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { abrirDocumento } from "@/components/rrhh/api";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { LEAVE_APPROVE_ENDPOINT, LEAVE_REJECT_ENDPOINT } from "@/constant/api-endpoints";
import { LICENCIA_LABEL } from "@/constant/rrhh";
import { apiErrorMessage } from "@/lib/api-error";
import { fechaCorta } from "./shared";

export interface LicenciaPanel {
	id: number;
	userId: number;
	nombre: string;
	type: string;
	startDate: string;
	endDate: string;
	daysRequested: number;
	reason: string | null;
	documentUrl: string | null;
	createdAt: string;
	documentos: { id: number; titulo: string }[];
	/** Vacation balance of the year (vacations only). */
	saldo: { anio: number; corresponden: number | null; disponibles: number | null; pedidos: number } | null;
}

/** Everyone's pending leave requests: approve or reject without opening each file. */
export default function LicenciasTab({
	licencias,
	onCambio,
}: {
	/** null = loading. */
	licencias: LicenciaPanel[] | null;
	onCambio: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [trabajando, setTrabajando] = useState<number | null>(null);
	const [rechazar, setRechazar] = useState<LicenciaPanel | null>(null);
	const [motivo, setMotivo] = useState("");

	const accion = async (l: LicenciaPanel, url: string, ok: string, body?: object) => {
		setTrabajando(l.id);
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: body ? JSON.stringify(body) : undefined,
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo guardar"));
			toast.success(ok);
			setRechazar(null);
			onCambio();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setTrabajando(null);
		}
	};

	if (licencias === null) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-20 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (licencias.length === 0) {
		return (
			<p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
				No hay solicitudes pendientes.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{licencias.map((l) => {
				const dias = l.type === "MEDICAL_APPOINTMENT" ? "Unas horas" : `${l.daysRequested} ${l.daysRequested === 1 ? "día" : "días"}`;
				const disponibles = l.saldo?.disponibles;
				const excede = disponibles != null && l.daysRequested > disponibles;
				return (
					<div key={l.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
						<div className="min-w-0 space-y-1">
							<p className="text-sm">
								<Link href={`/admin/rrhh/${l.userId}?section=leaves`} className="font-medium text-foreground hover:underline">
									{l.nombre}
								</Link>
								<span className="text-muted-foreground"> · {LICENCIA_LABEL[l.type] ?? l.type}</span>
							</p>
							<p className="text-sm text-foreground tabular-nums">
								{fechaCorta(l.startDate)}
								{l.endDate.slice(0, 10) !== l.startDate.slice(0, 10) && ` al ${fechaCorta(l.endDate)}`} · {dias}
							</p>
							{l.saldo && (
								<p className={`text-xs ${excede ? "text-destructive" : "text-muted-foreground"}`}>
									{disponibles != null
										? `Le quedan ${disponibles} de ${l.saldo.corresponden} días de vacaciones en ${l.saldo.anio}${excede ? ": pide más de lo que le queda" : ""}`
										: "Sin fecha de ingreso: no se puede calcular el saldo de vacaciones"}
								</p>
							)}
							{l.reason && <p className="text-xs text-muted-foreground">Motivo: {l.reason}</p>}
							{l.documentos.length > 0 && (
								<div className="flex flex-wrap gap-1 pt-1">
									{l.documentos.map((d) => (
										<Button
											key={d.id}
											variant="outline"
											size="sm"
											className="h-7 gap-1 px-2"
											onClick={() => abrirDocumento(token, d.id).catch((err) => toast.error(err.message))}
										>
											<FileText className="h-3.5 w-3.5" />
											{d.titulo}
										</Button>
									))}
								</div>
							)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={trabajando === l.id}
								onClick={() => {
									setMotivo("");
									setRechazar(l);
								}}
							>
								<X className="mr-1.5 h-3.5 w-3.5" />
								Rechazar
							</Button>
							<Button
								size="sm"
								disabled={trabajando === l.id}
								onClick={() => accion(l, LEAVE_APPROVE_ENDPOINT(l.id), "Solicitud aprobada")}
							>
								{trabajando === l.id ? (
									<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
								) : (
									<Check className="mr-1.5 h-3.5 w-3.5" />
								)}
								Aprobar
							</Button>
						</div>
					</div>
				);
			})}

			<Dialog open={!!rechazar} onOpenChange={(o) => !o && setRechazar(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Rechazar la solicitud</DialogTitle>
						<DialogDescription>
							{rechazar && `${rechazar.nombre} · ${LICENCIA_LABEL[rechazar.type] ?? rechazar.type}`}. El motivo
							lo ve la persona en Mi perfil.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						value={motivo}
						onChange={(e) => setMotivo(e.target.value)}
						placeholder="Motivo (opcional)"
						rows={3}
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRechazar(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={!rechazar || trabajando === rechazar.id}
							onClick={() =>
								rechazar &&
								accion(rechazar, LEAVE_REJECT_ENDPOINT(rechazar.id), "Solicitud rechazada", {
									rejectionReason: motivo.trim() || null,
								})
							}
						>
							Rechazar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
