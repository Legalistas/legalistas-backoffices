"use client";

import { Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	POSTS_AI_INTERNAL_LINKS_ENDPOINT,
	POSTS_ENDPOINT,
} from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";
import type {
	AiInternalLinkSuggestion,
	AiInternalLinksResponse,
} from "@/types/blog";

interface AiInternalLinksDialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	contentHtml: string;
	/**
	 * Callback con el HTML del contentHtml ya con los links aplicados.
	 * El componente reemplaza in-place el primer match del `anchorText` por
	 * `<a href="/consejos-legales/<slug>">anchorText</a>`.
	 */
	onApply: (newContentHtml: string) => void;
}

const LANDING_URL =
	process.env.NEXT_PUBLIC_LANDING_URL || "https://legalistas.ar";

interface PostCandidate {
	id: number;
	title: string;
	slug: string;
	excerpt: string;
}

const escapeRegex = (s: string): string =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Inserta un <a> rodeando la PRIMERA ocurrencia del anchor en HTML,
// evitando reemplazos dentro de etiquetas HTML existentes (busca solo texto plano).
function insertLinkInHtml(
	html: string,
	anchorText: string,
	href: string,
): { changed: boolean; html: string } {
	if (!anchorText.trim()) return { changed: false, html };
	const linkHtml = `<a href="${href}" class="internal-link">${anchorText}</a>`;

	// Split por etiquetas para no tocar lo que está adentro de tags ni de <a> ya existentes.
	const parts = html.split(/(<[^>]+>)/g);
	let inAnchor = false;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (!part) continue;
		if (part.startsWith("<")) {
			const tag = part.toLowerCase();
			if (tag.startsWith("<a ") || tag === "<a>") inAnchor = true;
			else if (tag === "</a>") inAnchor = false;
			continue;
		}
		if (inAnchor) continue;
		const re = new RegExp(escapeRegex(anchorText), "i");
		if (re.test(part)) {
			parts[i] = part.replace(re, linkHtml);
			return { changed: true, html: parts.join("") };
		}
	}
	return { changed: false, html };
}

export function AiInternalLinksDialog({
	open,
	onClose,
	title,
	contentHtml,
	onApply,
}: AiInternalLinksDialogProps) {
	const { data: session } = useSession();
	const [loading, setLoading] = useState(false);
	const [suggestions, setSuggestions] = useState<AiInternalLinkSuggestion[]>(
		[],
	);
	const [picked, setPicked] = useState<Set<number>>(new Set());
	const [error, setError] = useState<string | null>(null);

	const togglePick = (i: number) => {
		setPicked((prev) => {
			const next = new Set(prev);
			if (next.has(i)) next.delete(i);
			else next.add(i);
			return next;
		});
	};

	const generate = async () => {
		if (!title.trim() || !contentHtml.trim()) {
			setError("Necesitás título y contenido para sugerir links");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			// 1) Traer catálogo de posts publicados.
			const listRes = await fetch(`${POSTS_ENDPOINT}?per_page=50&status=publish`, {
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!listRes.ok) throw new Error("Error al traer catálogo de posts");
			const listJson = await listRes.json();
			const candidates: PostCandidate[] = (listJson.posts || []).map(
				(p: any) => ({
					id: p.id,
					title: p.title || "",
					slug: p.slug || "",
					excerpt: (p.excerpt || "").replace(/<[^>]+>/g, " ").slice(0, 200),
				}),
			);

			// 2) Pedirle a la IA que elija de ese catálogo.
			const res = await fetch(POSTS_AI_INTERNAL_LINKS_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ title, contentHtml, candidates }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Error" }));
				throw new Error(err.error || "Error en la IA");
			}
			const data: AiInternalLinksResponse = await res.json();
			setSuggestions(data.suggestions);
			// Pre-tildar todas las sugerencias.
			setPicked(new Set(data.suggestions.map((_, i) => i)));
			if (data.suggestions.length === 0) {
				setError(
					"La IA no encontró links relevantes. Probá con otro contenido o más posts publicados.",
				);
			}
		} catch (err) {
			console.error("[InternalLinks]", err);
			const msg = err instanceof Error ? err.message : "Error";
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	const applyPicked = () => {
		const chosen = suggestions.filter((_, i) => picked.has(i));
		if (chosen.length === 0) {
			toast.error("Seleccioná al menos un link");
			return;
		}
		let workingHtml = contentHtml;
		const applied: number[] = [];
		const skipped: number[] = [];
		for (let i = 0; i < chosen.length; i++) {
			const s = chosen[i];
			const href = `/consejos-legales/${s.targetSlug}`;
			const result = insertLinkInHtml(workingHtml, s.anchorText, href);
			if (result.changed) {
				workingHtml = result.html;
				applied.push(i);
			} else {
				skipped.push(i);
			}
		}
		onApply(workingHtml);
		toast.success(
			`${applied.length} links insertados${skipped.length > 0 ? `, ${skipped.length} saltados (anchor no encontrado)` : ""}`,
		);
		setSuggestions([]);
		setPicked(new Set());
		setError(null);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-purple-600" />
						Sugerencias de links internos
					</DialogTitle>
					<DialogDescription>
						La IA recomienda a qué posts existentes linkear desde este contenido.
						Elegí cuáles aplicar.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-3 py-2">
					{suggestions.length === 0 && !loading && (
						<div className="text-center py-8 space-y-3">
							<p className="text-sm text-gray-500">
								Click en "Generar" para que la IA analice el contenido y proponga
								links internos relevantes.
							</p>
							<Button
								type="button"
								onClick={generate}
								className="bg-purple-600 hover:bg-purple-700 text-white"
							>
								<Sparkles className="h-4 w-4 mr-2" />
								Generar sugerencias
							</Button>
						</div>
					)}

					{loading && (
						<div className="text-center py-12 text-sm text-gray-500 flex items-center justify-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Consultando IA...
						</div>
					)}

					{error && (
						<div className="rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
							{error}
						</div>
					)}

					{suggestions.map((s, i) => {
						const isPicked = picked.has(i);
						return (
							<button
								type="button"
								key={i}
								onClick={() => togglePick(i)}
								className={cn(
									"w-full text-left rounded-lg border p-3 transition-colors",
									isPicked
										? "border-primary bg-primary/5"
										: "border-gray-200 dark:border-gray-700 hover:border-gray-300",
								)}
							>
								<div className="flex items-start gap-2.5">
									<div
										className={cn(
											"h-4 w-4 rounded border mt-0.5 shrink-0 flex items-center justify-center",
											isPicked
												? "border-primary bg-primary text-white"
												: "border-gray-300 dark:border-gray-600",
										)}
									>
										{isPicked && <Check className="h-3 w-3" />}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-gray-900 dark:text-white">
											Anchor:{" "}
											<span className="font-medium bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">
												{s.anchorText}
											</span>
										</p>
										<p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
											<ExternalLink className="h-3 w-3" />
											<span className="truncate font-mono">
												{LANDING_URL}/consejos-legales/{s.targetSlug}
											</span>
										</p>
										<p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
											{s.reasoning}
										</p>
									</div>
								</div>
							</button>
						);
					})}
				</div>

				{suggestions.length > 0 && (
					<div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
						<Button
							type="button"
							variant="outline"
							onClick={generate}
							disabled={loading}
						>
							{loading ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Sparkles className="h-4 w-4 mr-2" />
							)}
							Regenerar
						</Button>
						<Button
							type="button"
							onClick={applyPicked}
							disabled={picked.size === 0}
							className="bg-primary hover:bg-primary/85 text-white"
						>
							<Check className="h-4 w-4 mr-2" />
							Aplicar {picked.size > 0 ? `(${picked.size})` : ""}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
