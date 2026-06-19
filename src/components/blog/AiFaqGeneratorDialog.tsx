"use client";

import { Check, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { POSTS_AI_GENERATE_FAQ_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";
import type { AiFaqQuestion, AiFaqResponse } from "@/types/blog";

interface AiFaqGeneratorDialogProps {
	open: boolean;
	onClose: () => void;
	/** Para generar las FAQ */
	title: string;
	contentHtml: string;
	focusKeyword: string;
	/** Callback que se llama con el HTML del bloque FAQ generado para que el padre lo concatene al contenido */
	onInsert: (faqHtml: string) => void;
}

const escapeHtml = (s: string): string =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const buildFaqHtml = (questions: AiFaqQuestion[]): string => {
	if (questions.length === 0) return "";
	const items = questions
		.map(
			(q) =>
				`<details class="faq-item"><summary><strong>${escapeHtml(q.question)}</strong></summary><p>${escapeHtml(q.answer)}</p></details>`,
		)
		.join("");
	return `<section class="faq-section"><h2>Preguntas frecuentes</h2>${items}</section>`;
};

export function AiFaqGeneratorDialog({
	open,
	onClose,
	title,
	contentHtml,
	focusKeyword,
	onInsert,
}: AiFaqGeneratorDialogProps) {
	const { data: session } = useSession();
	const [loading, setLoading] = useState(false);
	const [questions, setQuestions] = useState<AiFaqQuestion[]>([]);
	const [error, setError] = useState<string | null>(null);

	const generate = async () => {
		if (!title.trim() || !contentHtml.trim()) {
			setError("Necesitás título y contenido para generar FAQ");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(POSTS_AI_GENERATE_FAQ_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ title, contentHtml, focusKeyword }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Error" }));
				throw new Error(err.error || "Error en la IA");
			}
			const data: AiFaqResponse = await res.json();
			setQuestions(data.questions);
			if (data.questions.length === 0) {
				setError("La IA no devolvió preguntas. Probá de nuevo.");
			}
		} catch (err) {
			console.error("[FAQ]", err);
			const msg = err instanceof Error ? err.message : "Error";
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	const updateQuestion = (i: number, patch: Partial<AiFaqQuestion>) => {
		setQuestions((prev) =>
			prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
		);
	};

	const removeQuestion = (i: number) => {
		setQuestions((prev) => prev.filter((_, idx) => idx !== i));
	};

	const addBlank = () => {
		setQuestions((prev) => [...prev, { question: "", answer: "" }]);
	};

	const insert = () => {
		const filtered = questions.filter(
			(q) => q.question.trim() && q.answer.trim(),
		);
		if (filtered.length === 0) {
			toast.error("Agregá al menos una pregunta válida");
			return;
		}
		const html = buildFaqHtml(filtered);
		onInsert(html);
		toast.success(`${filtered.length} preguntas insertadas al final del post`);
		// Reset y cerrar
		setQuestions([]);
		setError(null);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-purple-600" />
						Generador de FAQ con IA
					</DialogTitle>
					<DialogDescription>
						La IA analiza el post y propone preguntas frecuentes para captar
						búsquedas long-tail. Podés editarlas antes de insertarlas.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-3 py-2">
					{questions.length === 0 && !loading && (
						<div className="text-center py-8 space-y-3">
							<p className="text-sm text-gray-500">
								Click en "Generar" para que la IA proponga FAQ desde el contenido.
							</p>
							<Button
								type="button"
								onClick={generate}
								className="bg-purple-600 hover:bg-purple-700 text-white"
							>
								<Sparkles className="h-4 w-4 mr-2" />
								Generar con IA
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

					{questions.map((q, i) => (
						<div
							key={i}
							className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-gray-50 dark:bg-white/3"
						>
							<div className="flex items-start justify-between gap-2">
								<span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
									Pregunta {i + 1}
								</span>
								<button
									type="button"
									onClick={() => removeQuestion(i)}
									className="text-gray-400 hover:text-red-600 p-1"
									title="Quitar"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
							<input
								type="text"
								value={q.question}
								onChange={(e) =>
									updateQuestion(i, { question: e.target.value })
								}
								placeholder="Pregunta..."
								className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
							/>
							<textarea
								value={q.answer}
								onChange={(e) => updateQuestion(i, { answer: e.target.value })}
								placeholder="Respuesta..."
								rows={3}
								className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
							/>
						</div>
					))}

					{questions.length > 0 && (
						<button
							type="button"
							onClick={addBlank}
							className={cn(
								"w-full flex items-center justify-center gap-1.5 py-2 text-xs rounded-md",
								"border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:border-primary hover:text-primary transition-colors",
							)}
						>
							<Plus className="h-3 w-3" />
							Agregar manualmente
						</button>
					)}
				</div>

				{questions.length > 0 && (
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
							onClick={insert}
							className="bg-primary hover:bg-primary/85 text-white"
						>
							<Check className="h-4 w-4 mr-2" />
							Insertar al post
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
