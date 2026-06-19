"use client";

import {
	AlertCircle,
	Check,
	ChevronDown,
	Info,
	Loader2,
	Sparkles,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
	POSTS_AI_ANALYZE_ENDPOINT,
	POSTS_AI_SUGGEST_KEYWORD_ENDPOINT,
} from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";
import type {
	AiSeoAnalysisResponse,
	AiSeoAnalysisSuggestion,
	PostSchemaType,
} from "@/types/blog";
import { AiSuggestionPopover } from "./AiSuggestionPopover";

interface SeoScorePanelProps {
	focusKeyword: string;
	onFocusKeywordChange: (v: string) => void;
	title: string;
	slug: string;
	metaDescription: string;
	contentHtml: string;
	featuredImageAlt: string | null;
	schemaType?: PostSchemaType;
}

type Severity = "good" | "warn" | "bad" | "info";

interface SeoCheck {
	id: string;
	label: string;
	severity: Severity;
	detail?: string;
}

const stripHtml = (html: string) =>
	html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const extractH1H2 = (html: string): { h1: string[]; h2: string[] } => {
	const h1 = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) =>
		stripHtml(m[1]),
	);
	const h2 = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map((m) =>
		stripHtml(m[1]),
	);
	return { h1, h2 };
};

const imgAlts = (html: string): string[] => {
	const alts: string[] = [];
	const re = /<img\b[^>]*\balt\s*=\s*"([^"]*)"/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html)) !== null) alts.push(m[1]);
	return alts;
};

const imgCount = (html: string): number =>
	(html.match(/<img\b/gi) || []).length;

const wordCount = (text: string): number =>
	text.split(/\s+/).filter(Boolean).length;

const includes = (haystack: string, needle: string) =>
	needle && haystack.toLowerCase().includes(needle.toLowerCase());

const SEV_STYLES: Record<Severity, { icon: any; cls: string }> = {
	good: {
		icon: Check,
		cls: "text-green-600 dark:text-green-400",
	},
	warn: {
		icon: AlertCircle,
		cls: "text-orange-600 dark:text-orange-400",
	},
	bad: {
		icon: X,
		cls: "text-red-600 dark:text-red-400",
	},
	info: {
		icon: Info,
		cls: "text-gray-500 dark:text-gray-400",
	},
};

const PRIORITY_STYLES: Record<
	AiSeoAnalysisSuggestion["priority"],
	{ label: string; cls: string }
> = {
	high: {
		label: "Alta",
		cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
	},
	medium: {
		label: "Media",
		cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
	},
	low: {
		label: "Baja",
		cls: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
	},
};

export function SeoScorePanel({
	focusKeyword,
	onFocusKeywordChange,
	title,
	slug,
	metaDescription,
	contentHtml,
	featuredImageAlt,
	schemaType,
}: SeoScorePanelProps) {
	const { data: session } = useSession();
	const [aiResult, setAiResult] = useState<AiSeoAnalysisResponse | null>(null);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiExpanded, setAiExpanded] = useState(true);

	const runAiAnalysis = async () => {
		if (!title.trim() || !contentHtml.trim()) {
			toast.error("Necesitás título y contenido para analizar");
			return;
		}
		setAiLoading(true);
		try {
			const res = await fetch(POSTS_AI_ANALYZE_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					title,
					slug,
					metaDescription,
					focusKeyword,
					contentHtml,
					schemaType,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Error" }));
				throw new Error(err.error || "Error en el análisis IA");
			}
			const data: AiSeoAnalysisResponse = await res.json();
			setAiResult(data);
			setAiExpanded(true);
			toast.success("Análisis IA listo");
		} catch (err) {
			console.error("[SeoScorePanel] AI:", err);
			toast.error(err instanceof Error ? err.message : "Error en IA");
		} finally {
			setAiLoading(false);
		}
	};
	const checks = useMemo<SeoCheck[]>(() => {
		const kw = focusKeyword.trim();
		const text = stripHtml(contentHtml);
		const { h1, h2 } = extractH1H2(contentHtml);
		const wc = wordCount(text);
		const totalImgs = imgCount(contentHtml);
		const altsArr = imgAlts(contentHtml);
		const imgsMissingAlt = totalImgs - altsArr.filter(Boolean).length;
		const titleLen = title.length;
		const metaLen = metaDescription.length;

		const list: SeoCheck[] = [];

		// Sin focus keyword no podemos chequear la mayoría — solo longitudes.
		if (!kw) {
			list.push({
				id: "kw",
				severity: "info",
				label: "Definí una palabra clave principal para activar el scoring.",
			});
		} else {
			list.push({
				id: "kw-title",
				severity: includes(title, kw) ? "good" : "bad",
				label: includes(title, kw)
					? "La keyword aparece en el título"
					: "La keyword no aparece en el título — agregala lo antes posible",
			});
			list.push({
				id: "kw-slug",
				severity: includes(slug, kw.replace(/\s+/g, "-")) ? "good" : "warn",
				label: includes(slug, kw.replace(/\s+/g, "-"))
					? "La keyword aparece en el slug"
					: "La keyword no aparece en el slug",
			});
			list.push({
				id: "kw-meta",
				severity: includes(metaDescription, kw) ? "good" : "warn",
				label: includes(metaDescription, kw)
					? "La keyword aparece en la meta description"
					: "La keyword no aparece en la meta description",
			});
			list.push({
				id: "kw-h1",
				severity: h1.some((h) => includes(h, kw)) ? "good" : "warn",
				label:
					h1.length === 0
						? "No hay H1 en el contenido (usá el título principal del editor)"
						: h1.some((h) => includes(h, kw))
							? "La keyword aparece en un H1"
							: "La keyword no aparece en ningún H1",
			});
			list.push({
				id: "kw-h2",
				severity: h2.some((h) => includes(h, kw)) ? "good" : "warn",
				label: h2.some((h) => includes(h, kw))
					? "La keyword aparece en algún subtítulo (H2)"
					: "Sumá la keyword en algún subtítulo (H2)",
			});
			list.push({
				id: "kw-body",
				severity: includes(text, kw) ? "good" : "bad",
				label: includes(text, kw)
					? "La keyword aparece en el cuerpo"
					: "La keyword no aparece en el cuerpo del post",
			});
			list.push({
				id: "kw-featured-alt",
				severity:
					featuredImageAlt && includes(featuredImageAlt, kw) ? "good" : "info",
				label:
					featuredImageAlt && includes(featuredImageAlt, kw)
						? "La keyword aparece en el alt de la imagen destacada"
						: "Bonus: incluí la keyword en el alt de la imagen destacada",
			});
		}

		// Longitudes
		list.push({
			id: "title-len",
			severity:
				titleLen >= 40 && titleLen <= 60
					? "good"
					: titleLen === 0
						? "bad"
						: "warn",
			label:
				titleLen === 0
					? "Faltan título"
					: `Título: ${titleLen} car. (ideal 40–60)`,
		});
		list.push({
			id: "meta-len",
			severity:
				metaLen >= 120 && metaLen <= 160
					? "good"
					: metaLen === 0
						? "bad"
						: "warn",
			label:
				metaLen === 0
					? "Falta meta description"
					: `Meta description: ${metaLen} car. (ideal 120–160)`,
		});
		list.push({
			id: "slug",
			severity: slug ? "good" : "bad",
			label: slug ? `Slug: /${slug}` : "Falta slug",
		});

		// Contenido
		list.push({
			id: "wc",
			severity: wc >= 300 ? "good" : wc >= 150 ? "warn" : "bad",
			label: `Longitud del contenido: ${wc} palabras (ideal ≥ 300)`,
		});

		// Imágenes
		if (totalImgs > 0) {
			list.push({
				id: "imgs-alt",
				severity: imgsMissingAlt === 0 ? "good" : "warn",
				label:
					imgsMissingAlt === 0
						? `Todas las ${totalImgs} imágenes tienen alt`
						: `${imgsMissingAlt} de ${totalImgs} imágenes sin alt`,
			});
		}

		return list;
	}, [
		focusKeyword,
		title,
		slug,
		metaDescription,
		contentHtml,
		featuredImageAlt,
	]);

	// Score 0–100: cada `good` suma, cada `warn` cuenta la mitad.
	const score = useMemo(() => {
		const scoreable = checks.filter((c) => c.severity !== "info");
		if (scoreable.length === 0) return 0;
		const points = scoreable.reduce((acc, c) => {
			if (c.severity === "good") return acc + 1;
			if (c.severity === "warn") return acc + 0.5;
			return acc;
		}, 0);
		return Math.round((points / scoreable.length) * 100);
	}, [checks]);

	const scoreColor =
		score >= 75
			? "text-green-600 bg-green-100 dark:bg-green-900/30"
			: score >= 50
				? "text-orange-600 bg-orange-100 dark:bg-orange-900/30"
				: "text-red-600 bg-red-100 dark:bg-red-900/30";

	return (
		<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold text-gray-900 dark:text-white">
					Análisis SEO
				</h4>
				<div
					className={cn(
						"flex items-center justify-center h-10 w-12 rounded-lg text-sm font-bold",
						scoreColor,
					)}
				>
					{score}
				</div>
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
						Palabra clave principal
					</label>
					<AiSuggestionPopover
						endpoint={POSTS_AI_SUGGEST_KEYWORD_ENDPOINT}
						body={{ title, contentHtml }}
						extract={(d) =>
							(d.candidates || []).map((c: any) => ({
								text: c.keyword,
								reasoning: c.reasoning,
								intent: c.intent,
							}))
						}
						onPick={(v) => onFocusKeywordChange(v.text)}
						label="Sugerir"
						title="Candidatos a focus keyword"
						validate={() =>
							!title.trim() || !contentHtml.trim()
								? "Necesitás título y contenido para sugerir"
								: null
						}
					/>
				</div>
				<Input
					value={focusKeyword}
					onChange={(e) => onFocusKeywordChange(e.target.value)}
					placeholder="ej: indemnización por accidente de trabajo"
					className="h-9"
				/>
				<p className="text-[11px] text-gray-400">
					La frase por la que querés rankear este post. Activa los chequeos abajo.
				</p>
			</div>

			<div>
				<p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
					Chequeos automáticos
				</p>
				<ul className="space-y-1.5">
					{checks.map((c) => {
						const sev = SEV_STYLES[c.severity];
						const Icon = sev.icon;
						return (
							<li key={c.id} className="flex items-start gap-2">
								<Icon className={cn("h-4 w-4 mt-0.5 shrink-0", sev.cls)} />
								<span className="text-xs text-gray-700 dark:text-gray-300">
									{c.label}
								</span>
							</li>
						);
					})}
				</ul>
			</div>

			{/* Análisis IA — sección separada */}
			<div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<Sparkles className="h-3.5 w-3.5 text-purple-600" />
						<p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
							Análisis con IA
						</p>
						{aiResult && (
							<span className="text-[10px] text-gray-400">
								· {aiResult.model}
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={runAiAnalysis}
						disabled={aiLoading}
						className={cn(
							"inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium border transition-colors",
							"border-purple-200 bg-purple-50 text-purple-700",
							"hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-700/40 dark:text-purple-300 dark:hover:bg-purple-900/30",
							aiLoading && "opacity-60 cursor-wait",
						)}
					>
						{aiLoading ? (
							<>
								<Loader2 className="h-3 w-3 animate-spin" />
								<span>Analizando...</span>
							</>
						) : (
							<>
								<Sparkles className="h-3 w-3" />
								<span>{aiResult ? "Re-analizar" : "Analizar con IA"}</span>
							</>
						)}
					</button>
				</div>

				{aiResult && (
					<div className="rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-900/10">
						<button
							type="button"
							onClick={() => setAiExpanded(!aiExpanded)}
							className="w-full flex items-center justify-between px-3 py-2"
						>
							<div className="flex items-center gap-3">
								<div
									className={cn(
										"flex items-center justify-center h-8 w-10 rounded-md text-xs font-bold",
										aiResult.score >= 75
											? "bg-green-100 text-green-700 dark:bg-green-900/30"
											: aiResult.score >= 50
												? "bg-orange-100 text-orange-700 dark:bg-orange-900/30"
												: "bg-red-100 text-red-700 dark:bg-red-900/30",
									)}
								>
									{aiResult.score}
								</div>
								<span className="text-xs text-gray-700 dark:text-gray-300">
									IA: {aiResult.strengths.length} fortalezas ·{" "}
									{aiResult.weaknesses.length} debilidades ·{" "}
									{aiResult.suggestions.length} sugerencias
								</span>
							</div>
							<ChevronDown
								className={cn(
									"h-4 w-4 text-gray-400 transition-transform",
									aiExpanded && "rotate-180",
								)}
							/>
						</button>

						{aiExpanded && (
							<div className="px-3 pb-3 space-y-3 border-t border-purple-200/60 dark:border-purple-900/40 pt-3">
								{aiResult.strengths.length > 0 && (
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400 mb-1">
											Fortalezas
										</p>
										<ul className="space-y-1">
											{aiResult.strengths.map((s, i) => (
												<li
													key={i}
													className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
												>
													<Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-600" />
													<span>{s}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								{aiResult.weaknesses.length > 0 && (
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400 mb-1">
											Debilidades
										</p>
										<ul className="space-y-1">
											{aiResult.weaknesses.map((w, i) => (
												<li
													key={i}
													className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
												>
													<X className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" />
													<span>{w}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								{aiResult.suggestions.length > 0 && (
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
											Sugerencias
										</p>
										<ul className="space-y-2">
											{aiResult.suggestions.map((s, i) => {
												const prio = PRIORITY_STYLES[s.priority];
												return (
													<li
														key={i}
														className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-2"
													>
														<div className="flex items-start justify-between gap-2">
															<p className="text-xs font-medium text-gray-900 dark:text-white">
																{s.title}
															</p>
															<span
																className={cn(
																	"text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shrink-0",
																	prio.cls,
																)}
															>
																{prio.label}
															</span>
														</div>
														<p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
															{s.detail}
														</p>
													</li>
												);
											})}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{!aiResult && !aiLoading && (
					<p className="text-[11px] text-gray-400">
						Click en "Analizar con IA" para obtener feedback cualitativo,
						fortalezas, debilidades y sugerencias accionables.
					</p>
				)}
			</div>
		</div>
	);
}
