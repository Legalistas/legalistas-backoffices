"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AiVariantLike {
	text: string;
	reasoning?: string;
	intent?: string;
}

interface AiSuggestionPopoverProps<TBody> {
	/** Endpoint absoluto al que hacer POST con `body` */
	endpoint: string;
	/** Body que se envía al backend en cada click del botón */
	body: TBody;
	/** Función que extrae las variantes de la respuesta del backend */
	extract: (data: any) => AiVariantLike[];
	/** Lo que se aplica cuando el usuario clickea una variante */
	onPick: (variant: AiVariantLike) => void;
	/** Label corto mostrado en el botón ✨ */
	label?: string;
	title?: string;
	/** Validación previa al fetch — si devuelve string, se muestra como error y no hace request */
	validate?: () => string | null;
}

export function AiSuggestionPopover<TBody>({
	endpoint,
	body,
	extract,
	onPick,
	label = "Generar con IA",
	title = "Variantes generadas",
	validate,
}: AiSuggestionPopoverProps<TBody>) {
	const { data: session } = useSession();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [variants, setVariants] = useState<AiVariantLike[]>([]);
	const [error, setError] = useState<string | null>(null);

	const fetchVariants = async () => {
		if (validate) {
			const v = validate();
			if (v) {
				setError(v);
				setOpen(true);
				return;
			}
		}
		setError(null);
		setLoading(true);
		setOpen(true);
		try {
			const res = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ error: "Error" }));
				throw new Error(err.error || "Error en la IA");
			}
			const data = await res.json();
			const list = extract(data);
			if (!list.length) {
				setError("La IA no devolvió ninguna variante. Probá de nuevo.");
			}
			setVariants(list);
		} catch (err) {
			console.error("[AiSuggestionPopover]", err);
			const msg = err instanceof Error ? err.message : "Error en la IA";
			setError(msg);
			toast.error(msg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						if (!open) fetchVariants();
					}}
					className={cn(
						"inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium border transition-colors",
						"border-purple-200 bg-purple-50 text-purple-700",
						"hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-700/40 dark:text-purple-300 dark:hover:bg-purple-900/30",
					)}
					title={label}
				>
					<Sparkles className="h-3 w-3" />
					<span>{label}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-96 p-0 max-h-[480px] overflow-hidden flex flex-col"
			>
				<div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
					<Sparkles className="h-3.5 w-3.5 text-purple-600" />
					<span className="text-sm font-semibold text-gray-900 dark:text-white">
						{title}
					</span>
					{!loading && variants.length > 0 && (
						<button
							type="button"
							onClick={fetchVariants}
							className="ml-auto text-[11px] text-gray-500 hover:text-primary"
						>
							regenerar
						</button>
					)}
				</div>

				<div className="overflow-y-auto p-2 space-y-2">
					{loading && (
						<div className="flex items-center justify-center py-8 text-sm text-gray-500">
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Consultando IA...
						</div>
					)}

					{!loading && error && (
						<div className="rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
							{error}
						</div>
					)}

					{!loading &&
						!error &&
						variants.map((v, i) => (
							<button
								key={i}
								type="button"
								onClick={() => {
									onPick(v);
									setOpen(false);
								}}
								className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 hover:border-primary hover:bg-primary/5 transition-colors group"
							>
								<p className="text-sm text-gray-900 dark:text-white leading-snug">
									{v.text}
								</p>
								<div className="flex items-center gap-2 mt-1">
									{v.intent && (
										<span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
											{v.intent}
										</span>
									)}
									<span className="text-[10px] text-gray-400">
										{v.text.length} car.
									</span>
								</div>
								{v.reasoning && (
									<p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic">
										{v.reasoning}
									</p>
								)}
							</button>
						))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
