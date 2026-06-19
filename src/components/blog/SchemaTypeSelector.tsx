"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { PostSchemaType } from "@/types/blog";

const OPTIONS: { value: PostSchemaType; label: string; help: string }[] = [
	{
		value: "BlogPosting",
		label: "BlogPosting",
		help: "Entradas de blog. Es la opción por defecto y la que mejor matchea para Google Discover.",
	},
	{
		value: "Article",
		label: "Article",
		help: "Artículos genéricos. Útil cuando el contenido no encaja bien como BlogPosting o NewsArticle.",
	},
	{
		value: "NewsArticle",
		label: "NewsArticle",
		help: "Notas con valor noticioso. Eleva la chance de aparecer en Google News pero requiere E-E-A-T fuerte.",
	},
	{
		value: "HowTo",
		label: "HowTo",
		help: "Guías paso a paso. Solo si el contenido es realmente instructivo y secuencial.",
	},
	{
		value: "FAQPage",
		label: "FAQPage",
		help: "Páginas con preguntas frecuentes. Solo si tenés un bloque Q&A formal.",
	},
];

interface SchemaTypeSelectorProps {
	value: PostSchemaType;
	onChange: (value: PostSchemaType) => void;
}

export function SchemaTypeSelector({
	value,
	onChange,
}: SchemaTypeSelectorProps) {
	const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
	return (
		<div className="space-y-1.5">
			<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
				Tipo de Schema.org
			</label>
			<Select
				value={value}
				onValueChange={(v) => onChange(v as PostSchemaType)}
			>
				<SelectTrigger className="h-9">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p className="text-[11px] text-gray-400">{current.help}</p>
		</div>
	);
}
