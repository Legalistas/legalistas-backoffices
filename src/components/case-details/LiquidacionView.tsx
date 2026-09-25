"use client";

import { Calculator, ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/constant/api-endpoints";
import type { CasesFiles } from "@/types/cases";
import { ExpedienteSelect } from "./ExpedienteSelect";

const LIQUIDACIONES_SUBPATH = "5_LIQUIDACIONES/";

interface PdfGuardado {
	key: string;
	name: string;
	size: number;
	lastModified: string | null;
}

interface LiquidacionViewProps {
	caseId: string;
	files: CasesFiles[];
	customerName?: string;
}

const formatBytes = (n: number) =>
	n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const formatFechaHora = (iso: string | null) =>
	iso
		? new Date(iso).toLocaleString("es-AR", {
				timeZone: "America/Argentina/Buenos_Aires",
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—";

/**
 * Liquidación LRT del caso: se calcula en la calculadora (con el expediente
 * elegido) y cada vez que se guarda queda un PDF nuevo en la carpeta
 * 5_LIQUIDACIONES del caso. Acá se listan todas las versiones.
 */
export const LiquidacionView = ({ caseId, files, customerName }: LiquidacionViewProps) => {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [fileId, setFileId] = useState<number | null>(null);
	const [pdfs, setPdfs] = useState<PdfGuardado[]>([]);
	const [rootKey, setRootKey] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [abriendo, setAbriendo] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`${API_BASE_URL}/cases/${caseId}/minio/list?subpath=${encodeURIComponent(LIQUIDACIONES_SUBPATH)}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			setRootKey(body.rootKey ?? "");
			// La más nueva primero.
			setPdfs(
				[...((body.files ?? []) as PdfGuardado[])].sort((a, b) =>
					(b.lastModified ?? "").localeCompare(a.lastModified ?? ""),
				),
			);
		} catch (e) {
			setError((e as Error).message);
			setPdfs([]);
		} finally {
			setLoading(false);
		}
	}, [caseId, token]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const abrir = async (pdf: PdfGuardado) => {
		if (!token) return;
		setAbriendo(pdf.key);
		try {
			const rel = pdf.key.slice(rootKey.length);
			const res = await fetch(
				`${API_BASE_URL}/cases/${caseId}/minio/object?subpath=${encodeURIComponent(rel)}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			window.open(body.url, "_blank", "noopener,noreferrer");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setAbriendo(null);
		}
	};

	const calculatorUrl = fileId
		? `/admin/calculator/accidents-work?caseId=${caseId}&fileId=${fileId}`
		: null;

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			<div className="flex items-center gap-2 border-b border-border px-5 py-4">
				<Calculator className="h-5 w-5 text-muted-foreground" />
				<h3 className="text-md font-semibold text-foreground">Liquidación</h3>
				<span className="text-xs text-muted-foreground">Accidente de trabajo (LRT)</span>
			</div>

			<div className="space-y-6 p-5">
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Elegí el expediente: la calculadora trae la fecha del accidente, la incapacidad y la
						edad del cliente a esa fecha. Al guardar, el PDF queda en la carpeta Liquidaciones
						del caso.
					</p>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<div className="sm:w-96">
							<ExpedienteSelect
								files={files}
								value={fileId}
								onChange={setFileId}
								customerName={customerName}
							/>
						</div>
						{calculatorUrl ? (
							<Button asChild className="gap-2">
								<Link href={calculatorUrl}>
									<Calculator className="h-4 w-4" />
									Calcular liquidación
								</Link>
							</Button>
						) : (
							<Button className="gap-2" disabled>
								<Calculator className="h-4 w-4" />
								Calcular liquidación
							</Button>
						)}
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h4 className="text-sm font-semibold text-foreground">Liquidaciones guardadas</h4>
						<Button variant="ghost" size="sm" onClick={cargar} disabled={loading}>
							<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
						</Button>
					</div>

					{loading ? (
						<div className="flex justify-center py-6">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : error ? (
						<p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
							{error}
						</p>
					) : pdfs.length === 0 ? (
						<p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
							Todavía no hay liquidaciones guardadas. Cada vez que guardes desde la calculadora
							queda una versión nueva acá; las anteriores no se pisan.
						</p>
					) : (
						<ul className="divide-y divide-border rounded-md border">
							{pdfs.map((pdf) => (
								<li key={pdf.key} className="flex items-center gap-3 px-3 py-2">
									<FileText className="h-4 w-4 shrink-0 text-red-500" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm text-foreground">{pdf.name}</p>
										<p className="text-xs text-muted-foreground">
											{formatFechaHora(pdf.lastModified)} · {formatBytes(pdf.size)}
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										className="gap-1.5"
										onClick={() => abrir(pdf)}
										disabled={abriendo === pdf.key}
									>
										{abriendo === pdf.key ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<ExternalLink className="h-3.5 w-3.5" />
										)}
										Ver
									</Button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
};
