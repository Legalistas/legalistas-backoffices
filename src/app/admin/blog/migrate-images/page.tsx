"use client";

import {
	AlertCircle,
	ArrowLeft,
	Check,
	Download,
	Loader2,
	Play,
	RefreshCw,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PerImageResult {
	src: string;
	newUrl?: string;
	skipped?: boolean;
	error?: string;
}

interface PerPostResult {
	id: number;
	title: string;
	updated: boolean;
	images: PerImageResult[];
	sql?: string;
}

interface BatchResponse {
	page: number;
	per_page: number;
	total: number;
	totalPages: number;
	processed: PerPostResult[];
	usingManifest: boolean;
	dryRun: boolean;
	error?: string;
}

const PER_PAGE = 5;

export default function MigrateImagesPage() {
	const [running, setRunning] = useState(false);
	const [paused, setPaused] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [totalPosts, setTotalPosts] = useState(0);
	const [postsDone, setPostsDone] = useState(0);
	const [postsUpdated, setPostsUpdated] = useState(0);
	const [imagesMigrated, setImagesMigrated] = useState(0);
	const [imagesSkipped, setImagesSkipped] = useState(0);
	const [imagesErrored, setImagesErrored] = useState(0);
	const [usingManifest, setUsingManifest] = useState<boolean | null>(null);
	const [log, setLog] = useState<PerPostResult[]>([]);
	const [globalError, setGlobalError] = useState<string | null>(null);
	const [dryRun, setDryRun] = useState(true);
	const [sqlStatements, setSqlStatements] = useState<string[]>([]);
	const pausedRef = useRef(false);
	const dryRunRef = useRef(false);

	const reset = () => {
		setRunning(false);
		setPaused(false);
		pausedRef.current = false;
		setCurrentPage(1);
		setTotalPages(0);
		setTotalPosts(0);
		setPostsDone(0);
		setPostsUpdated(0);
		setImagesMigrated(0);
		setImagesSkipped(0);
		setImagesErrored(0);
		setUsingManifest(null);
		setLog([]);
		setGlobalError(null);
		setSqlStatements([]);
	};

	const start = useCallback(async () => {
		setRunning(true);
		setPaused(false);
		pausedRef.current = false;
		dryRunRef.current = dryRun;
		setGlobalError(null);

		let page = 1;
		// Si ya hay progreso parcial y no es un reset, retomar.
		if (totalPages > 0 && postsDone > 0 && postsDone < totalPosts) {
			page = Math.floor(postsDone / PER_PAGE) + 1;
		} else {
			setCurrentPage(1);
			setPostsDone(0);
			setPostsUpdated(0);
			setImagesMigrated(0);
			setImagesSkipped(0);
			setImagesErrored(0);
			setLog([]);
			setSqlStatements([]);
		}

		try {
			while (true) {
				if (pausedRef.current) {
					break;
				}
				setCurrentPage(page);
				const res = await fetch("/api/blog/migrate-images", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						page,
						per_page: PER_PAGE,
						dryRun: dryRunRef.current,
					}),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({ error: "Error" }));
					throw new Error(err.error || `HTTP ${res.status}`);
				}
				const data: BatchResponse = await res.json();

				if (page === 1) {
					setUsingManifest(data.usingManifest);
				}
				setTotalPages(data.totalPages);
				setTotalPosts(data.total);

				// Acumular contadores
				let batchMigrated = 0;
				let batchSkipped = 0;
				let batchErrored = 0;
				let batchUpdated = 0;
				for (const p of data.processed) {
					if (p.updated) batchUpdated++;
					for (const img of p.images) {
						if (img.error) batchErrored++;
						else if (img.skipped) batchSkipped++;
						else if (img.newUrl) batchMigrated++;
					}
				}
				setPostsDone((v) => v + data.processed.length);
				setPostsUpdated((v) => v + batchUpdated);
				setImagesMigrated((v) => v + batchMigrated);
				setImagesSkipped((v) => v + batchSkipped);
				setImagesErrored((v) => v + batchErrored);
				setLog((prev) => [...prev, ...data.processed]);

				const batchSql = data.processed
					.map((p) => p.sql)
					.filter((s): s is string => !!s);
				if (batchSql.length > 0) {
					setSqlStatements((prev) => [...prev, ...batchSql]);
				}

				if (page >= data.totalPages) {
					toast.success("Migración completa");
					break;
				}
				page++;
			}
		} catch (err) {
			console.error("[migrate]", err);
			const msg = err instanceof Error ? err.message : "Error en la migración";
			setGlobalError(msg);
			toast.error(msg);
		} finally {
			setRunning(false);
			setPaused(false);
		}
	}, [postsDone, totalPages, totalPosts]);

	const pause = () => {
		pausedRef.current = true;
		setPaused(true);
	};

	const downloadSql = () => {
		if (sqlStatements.length === 0) return;
		const header = [
			`-- Migración de imágenes blog → MinIO`,
			`-- Generado: ${new Date().toISOString()}`,
			`-- Posts con cambios: ${sqlStatements.length}`,
			`-- Aplicar dentro de una transacción para poder rollback en caso de error.`,
			``,
			`START TRANSACTION;`,
			``,
		].join("\n");
		const footer = [``, `COMMIT;`, ``].join("\n");
		const body = sqlStatements.join("\n\n");
		const sql = header + body + footer;
		const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `migrate-blog-images-${new Date().toISOString().slice(0, 10)}.sql`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const progress = totalPosts > 0 ? Math.round((postsDone / totalPosts) * 100) : 0;
	const isFinished = totalPosts > 0 && postsDone >= totalPosts && !running;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link
					href="/admin/blog"
					className="p-2 rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5"
					title="Volver al listado"
				>
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						Migrar imágenes a MinIO
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
						Trae todas las imágenes históricas del blog al bucket MinIO y
						actualiza las URLs en la DB.
					</p>
				</div>
			</div>

			{/* Tarjeta de estado */}
			<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5 shadow-sm space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							{!running && postsDone === 0 && "Listo para iniciar"}
							{running && !paused && "Migrando..."}
							{paused && "Pausado"}
							{isFinished &&
								(dryRunRef.current
									? "Listo (SQL generado, DB sin tocar)"
									: "Migración completa")}
						</h3>
						{usingManifest !== null && (
							<p className="text-[11px] text-gray-500 mt-0.5">
								{usingManifest
									? "Usando manifest del landing como fuente preferida para featured images"
									: "Sin manifest disponible — descargando desde URLs en DB"}
							</p>
						)}
					</div>
					<div className="flex items-center gap-3">
						{!running && postsDone === 0 && (
							<label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
								<Checkbox
									checked={dryRun}
									onCheckedChange={(v) => setDryRun(v === true)}
								/>
								Solo generar SQL (no aplicar)
							</label>
						)}
						{sqlStatements.length > 0 && (
							<Button
								type="button"
								variant="outline"
								onClick={downloadSql}
								className="flex items-center gap-2"
								title={`Descargar ${sqlStatements.length} UPDATE${sqlStatements.length > 1 ? "s" : ""}`}
							>
								<Download className="h-4 w-4" />
								Descargar SQL ({sqlStatements.length})
							</Button>
						)}
						{!running ? (
							<>
								{postsDone > 0 && !isFinished && (
									<Button
										type="button"
										variant="outline"
										onClick={reset}
										className="flex items-center gap-2"
									>
										<RefreshCw className="h-4 w-4" />
										Reiniciar
									</Button>
								)}
								<Button
									type="button"
									onClick={start}
									className="bg-primary hover:bg-primary/85 text-white flex items-center gap-2"
								>
									<Play className="h-4 w-4" />
									{postsDone === 0
										? dryRun
											? "Generar SQL"
											: "Iniciar"
										: isFinished
											? "Re-correr"
											: "Continuar"}
								</Button>
							</>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={pause}
								className="flex items-center gap-2"
							>
								<Loader2 className="h-4 w-4 animate-spin" />
								Pausar
							</Button>
						)}
					</div>
				</div>

				{/* Barra de progreso */}
				{totalPosts > 0 && (
					<div>
						<div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
							<span>
								{postsDone} de {totalPosts} posts
							</span>
							<span>{progress}%</span>
						</div>
						<div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
						</div>
						<div className="flex justify-between text-[11px] text-gray-400 mt-1">
							<span>
								Batch {currentPage} / {totalPages || "?"}
							</span>
							<span>{PER_PAGE} posts por batch</span>
						</div>
					</div>
				)}

				{/* Stats */}
				{(postsDone > 0 || running) && (
					<div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
						<Stat
							label={dryRunRef.current ? "Posts con SQL" : "Posts actualizados"}
							value={dryRunRef.current ? sqlStatements.length : postsUpdated}
							tone="success"
						/>
						<Stat label="Imágenes migradas" value={imagesMigrated} tone="success" />
						<Stat
							label="Saltadas (ya en MinIO)"
							value={imagesSkipped}
							tone="info"
						/>
						<Stat
							label="Errores"
							value={imagesErrored}
							tone={imagesErrored > 0 ? "error" : "info"}
						/>
					</div>
				)}

				{globalError && (
					<div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
						<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
						<span>{globalError}</span>
					</div>
				)}
			</div>

			{/* Log */}
			{log.length > 0 && (
				<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 shadow-sm overflow-hidden">
					<div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							Log
						</h3>
					</div>
					<div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
						{log
							.slice()
							.reverse()
							.map((post) => {
								const errs = post.images.filter((i) => i.error).length;
								const ok = post.images.filter((i) => i.newUrl && !i.skipped)
									.length;
								const skipped = post.images.filter((i) => i.skipped).length;
								return (
									<details
										key={`${post.id}-${ok}-${errs}-${skipped}`}
										className="px-4 py-2"
									>
										<summary className="cursor-pointer flex items-center gap-2 text-sm">
											{post.updated ? (
												<Check className="h-4 w-4 text-green-600" />
											) : errs > 0 ? (
												<X className="h-4 w-4 text-red-600" />
											) : (
												<Check className="h-4 w-4 text-gray-400" />
											)}
											<span className="font-medium text-gray-900 dark:text-white truncate">
												{post.title}
											</span>
											<span className="text-[11px] text-gray-500 ml-auto">
												{ok > 0 && `${ok} migradas`}
												{ok > 0 && skipped > 0 && " · "}
												{skipped > 0 && `${skipped} saltadas`}
												{errs > 0 &&
													` · ${errs} error${errs > 1 ? "es" : ""}`}
											</span>
										</summary>
										<div className="mt-2 pl-6 space-y-1">
											{post.images.map((img, i) => (
												<div
													key={i}
													className="flex items-center gap-2 text-[11px]"
												>
													{img.error ? (
														<X className="h-3 w-3 text-red-500" />
													) : img.skipped ? (
														<Check className="h-3 w-3 text-gray-400" />
													) : (
														<Check className="h-3 w-3 text-green-500" />
													)}
													<span
														className={cn(
															"truncate flex-1 font-mono",
															img.error
																? "text-red-600 dark:text-red-400"
																: "text-gray-500",
														)}
														title={img.src}
													>
														{img.src}
													</span>
													{img.error && (
														<span className="text-red-500 shrink-0">
															{img.error}
														</span>
													)}
												</div>
											))}
										</div>
									</details>
								);
							})}
					</div>
				</div>
			)}
		</div>
	);
}

function Stat({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: "success" | "info" | "error";
}) {
	const cls = {
		success: "text-green-600",
		info: "text-gray-600 dark:text-gray-300",
		error: "text-red-600",
	}[tone];
	return (
		<div className="rounded-lg bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-gray-800 p-3">
			<p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
				{label}
			</p>
			<p className={cn("text-xl font-bold mt-0.5", cls)}>{value}</p>
		</div>
	);
}
