"use client";

import { Check, Copy, Loader2, Save, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { CRM_ANALYZER_ENDPOINT, LEADS_NOTES_ENDPOINT } from "@/constant/api-endpoints";
import type { Lead } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface LeadAiAnalyzerProps {
	lead: Lead;
}

// La IA devuelve *negrita* estilo WhatsApp (asterisco simple) — ver
// backend/src/modules/crm-analyzer/prompt.ts. Distinto del **doble
// asterisco** que usa LEXIA en AnalistaPanel.tsx.
function formatWhatsAppMarkdown(text: string): string {
	return text.replace(/\*(.*?)\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}

export default function LeadAiAnalyzer({ lead }: LeadAiAnalyzerProps) {
	const { data: session } = useSession();
	const [notes, setNotes] = useState("");
	const [summary, setSummary] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const handleAnalyze = async () => {
		if (!notes.trim() || loading) return;
		setLoading(true);
		setSummary(null);
		setSaved(false);
		try {
			const res = await fetch(CRM_ANALYZER_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					notes,
					leadName: lead.name || lead.user?.name,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.error || "Error al analizar las notas");
			}
			const data = await res.json();
			setSummary(data.summary);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Error al analizar las notas",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		if (!summary) return;
		navigator.clipboard.writeText(summary);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSaveToNotes = async () => {
		if (!summary || saving) return;
		setSaving(true);
		try {
			const res = await fetch(LEADS_NOTES_ENDPOINT(Number(lead.id)), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					note: formatWhatsAppMarkdown(summary),
					userId: session?.user?.id
						? Number.parseInt(session.user.id, 10)
						: undefined,
				}),
			});
			if (!res.ok) throw new Error(`Error: ${res.status}`);
			setSaved(true);
			toast.success("Guardado en Notas");
		} catch {
			toast.error("Error al guardar en Notas");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-4">
			<h3 className="flex items-center gap-2 text-lg font-semibold">
				<Sparkles className="h-5 w-5 text-primary" />
				Analizar con IA
			</h3>
			<p className="text-sm text-muted-foreground">
				Pegá las notas crudas de la consulta y la IA arma un mensaje prolijo
				para pasarle a la abogada o abogado responsable.
			</p>

			<Textarea
				value={notes}
				onChange={(e) => setNotes(e.target.value)}
				placeholder="Ej: No se asesoró con un abogado, escribió pero no recibió respuesta. Se le acalambraba la pierna, es mucama en el hospital. También dermatitis. LUMBALGIA: ALTA: 04/03/2026 Siniestro:2975463"
				rows={6}
				disabled={loading}
			/>

			<Button onClick={handleAnalyze} disabled={!notes.trim() || loading}>
				{loading ? (
					<>
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						Analizando...
					</>
				) : (
					<>
						<Sparkles className="h-4 w-4 mr-2" />
						Analizar con IA
					</>
				)}
			</Button>

			{summary && (
				<div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
					<div
						className="text-sm leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML generado localmente a partir de texto plano de la IA, no de input de usuario sin sanitizar.
						dangerouslySetInnerHTML={{
							__html: formatWhatsAppMarkdown(summary),
						}}
					/>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleCopy}>
							{copied ? (
								<>
									<Check className="h-3.5 w-3.5 mr-1.5" />
									Copiado
								</>
							) : (
								<>
									<Copy className="h-3.5 w-3.5 mr-1.5" />
									Copiar mensaje
								</>
							)}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleSaveToNotes}
							disabled={saving || saved}
						>
							{saving ? (
								<>
									<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
									Guardando...
								</>
							) : saved ? (
								<>
									<Check className="h-3.5 w-3.5 mr-1.5" />
									Guardado en Notas
								</>
							) : (
								<>
									<Save className="h-3.5 w-3.5 mr-1.5" />
									Guardar en Notas
								</>
							)}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
