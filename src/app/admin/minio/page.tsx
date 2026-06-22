"use client";

import {
	CheckCircle2,
	Database,
	FolderTree,
	Loader2,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	MINIO_BACKFILL_ENDPOINT,
	MINIO_BOOTSTRAP_ENDPOINT,
	MINIO_HEALTH_ENDPOINT,
} from "@/constant/api-endpoints";

type Json = Record<string, unknown> | unknown[] | null;

interface CallOptions {
	method?: "GET" | "POST";
	body?: Record<string, unknown>;
}

export default function MinioAdminPage() {
	const { data: session } = useSession();

	const [healthLoading, setHealthLoading] = useState(false);
	const [healthResult, setHealthResult] = useState<Json>(null);

	const [bootstrapLoading, setBootstrapLoading] = useState(false);
	const [bootstrapResult, setBootstrapResult] = useState<Json>(null);

	const [backfillLoading, setBackfillLoading] = useState(false);
	const [backfillResult, setBackfillResult] = useState<Json>(null);
	const [backfillLimit, setBackfillLimit] = useState(50);

	const callApi = async (
		url: string,
		opts: CallOptions = {},
	): Promise<Json> => {
		const token = session?.user?.accessToken;
		if (!token) throw new Error("Sesión expirada");
		const response = await fetch(url, {
			method: opts.method ?? "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: opts.body ? JSON.stringify(opts.body) : undefined,
			cache: "no-store",
		});
		const json = (await response.json().catch(() => null)) as Json;
		if (!response.ok) {
			const message =
				(json as { error?: string; message?: string })?.error ??
				(json as { error?: string; message?: string })?.message ??
				`HTTP ${response.status}`;
			throw new Error(message);
		}
		return json;
	};

	const runHealth = async () => {
		setHealthLoading(true);
		setHealthResult(null);
		try {
			const json = await callApi(MINIO_HEALTH_ENDPOINT, { method: "GET" });
			setHealthResult(json);
			toast.success("Conexión MinIO OK");
		} catch (err) {
			toast.error((err as Error).message);
			setHealthResult({ ok: false, error: (err as Error).message });
		} finally {
			setHealthLoading(false);
		}
	};

	const runBootstrap = async (dryRun: boolean) => {
		setBootstrapLoading(true);
		setBootstrapResult(null);
		try {
			const json = await callApi(MINIO_BOOTSTRAP_ENDPOINT, {
				body: { dryRun },
			});
			setBootstrapResult(json);
			toast.success(
				dryRun ? "Bootstrap (dry-run) completado" : "Bootstrap ejecutado",
			);
		} catch (err) {
			toast.error((err as Error).message);
			setBootstrapResult({ ok: false, error: (err as Error).message });
		} finally {
			setBootstrapLoading(false);
		}
	};

	const runBackfill = async (dryRun: boolean) => {
		setBackfillLoading(true);
		setBackfillResult(null);
		try {
			const json = await callApi(MINIO_BACKFILL_ENDPOINT, {
				body: { dryRun, limit: backfillLimit },
			});
			setBackfillResult(json);
			toast.success(
				dryRun ? "Backfill (dry-run) completado" : "Backfill ejecutado",
			);
		} catch (err) {
			toast.error((err as Error).message);
			setBackfillResult({ ok: false, error: (err as Error).message });
		} finally {
			setBackfillLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
					MinIO — Carpetas de causas
				</h1>
				<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
					Bootstrap del árbol por representante, backfill desde la DB y
					verificación de conexión.
				</p>
			</div>

			<Alert>
				<AlertTitle>Cómo funciona</AlertTitle>
				<AlertDescription>
					<ol className="list-decimal pl-4 space-y-1 mt-2 text-sm">
						<li>
							<strong>Health</strong> — verifica que el backend puede hablar con
							MinIO.
						</li>
						<li>
							<strong>Bootstrap (dry-run)</strong> — muestra qué carpetas
							crearía sin escribir nada.
						</li>
						<li>
							<strong>Bootstrap</strong> — crea el árbol base (00_NUEVO_CASO,
							01_CRM, 02_ADMINISTRATIVO/ART, etc.) para todos los
							representantes activos.
						</li>
						<li>
							<strong>Backfill</strong> — recorre leads (WON) y casos
							existentes en la DB y crea sus carpetas en la ubicación que
							corresponde. Es idempotente.
						</li>
					</ol>
				</AlertDescription>
			</Alert>

			{/* Health */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="h-4 w-4" /> Health check
					</CardTitle>
					<CardDescription>
						Lista el prefijo <code>representantes/</code> en el bucket.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button onClick={runHealth} disabled={healthLoading}>
						{healthLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Database className="h-4 w-4" />
						)}
						<span className="ml-2">Verificar conexión</span>
					</Button>
					<ResultBlock data={healthResult} />
				</CardContent>
			</Card>

			{/* Bootstrap */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FolderTree className="h-4 w-4" /> Bootstrap por representante
					</CardTitle>
					<CardDescription>
						Crea el árbol base por cada representante activo
						(<code>00_NUEVO_CASO</code>, <code>01_CRM</code>,{" "}
						<code>02_ADMINISTRATIVO/*</code>, <code>03_JUDICIAL/*</code>,{" "}
						<code>04_CIERRE</code>, <code>05_ARCHIVADOS</code>).
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => runBootstrap(true)}
							disabled={bootstrapLoading}
						>
							{bootstrapLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : null}
							<span className="ml-2">Dry-run (no escribe)</span>
						</Button>
						<Button
							onClick={() => runBootstrap(false)}
							disabled={bootstrapLoading}
						>
							{bootstrapLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<FolderTree className="h-4 w-4" />
							)}
							<span className="ml-2">Ejecutar bootstrap</span>
						</Button>
					</div>
					<ResultBlock data={bootstrapResult} />
				</CardContent>
			</Card>

			{/* Backfill */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<RefreshCw className="h-4 w-4" /> Backfill desde DB
					</CardTitle>
					<CardDescription>
						Procesa leads WON y casos existentes con servicio ART o Tránsito.
						Crea las carpetas en la ubicación que corresponde según el estado
						actual de cada item.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-3">
						<label
							className="text-sm font-medium text-gray-700 dark:text-gray-300"
							htmlFor="backfill-limit"
						>
							Límite por corrida
						</label>
						<input
							id="backfill-limit"
							type="number"
							min={1}
							max={10000}
							value={backfillLimit}
							onChange={(e) =>
								setBackfillLimit(Math.max(1, Number(e.target.value) || 1))
							}
							className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
						/>
						<Badge variant="secondary">recomendado: 50 al principio</Badge>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => runBackfill(true)}
							disabled={backfillLoading}
						>
							{backfillLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : null}
							<span className="ml-2">Dry-run</span>
						</Button>
						<Button
							onClick={() => runBackfill(false)}
							disabled={backfillLoading}
						>
							{backfillLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
							<span className="ml-2">Ejecutar backfill</span>
						</Button>
					</div>
					<ResultBlock data={backfillResult} />
				</CardContent>
			</Card>
		</div>
	);
}

function ResultBlock({ data }: { data: Json }) {
	if (data == null) return null;
	const ok = (data as { ok?: boolean })?.ok !== false;
	return (
		<div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
			<div className="flex items-center gap-2 mb-2 text-sm font-medium">
				{ok ? (
					<CheckCircle2 className="h-4 w-4 text-green-600" />
				) : (
					<XCircle className="h-4 w-4 text-red-600" />
				)}
				{ok ? "Resultado" : "Falló"}
			</div>
			<pre className="text-xs overflow-auto max-h-80 text-gray-800 dark:text-gray-200">
				{JSON.stringify(data, null, 2)}
			</pre>
		</div>
	);
}
