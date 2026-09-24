"use client";

import { CalendarClock, Eye, EyeOff, Globe, ShieldOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { PostSchemaType, PostStatus } from "@/types/blog";
import { SchemaTypeSelector } from "./SchemaTypeSelector";

interface PublishingSidebarProps {
	status: PostStatus;
	publishedAt: string; // YYYY-MM-DDTHH:mm o ""
	noindex: boolean;
	nofollow: boolean;
	canonical: string;
	schemaType: PostSchemaType;
	onStatusChange: (s: PostStatus) => void;
	onPublishedAtChange: (s: string) => void;
	onNoindexChange: (b: boolean) => void;
	onNofollowChange: (b: boolean) => void;
	onCanonicalChange: (s: string) => void;
	onSchemaTypeChange: (s: PostSchemaType) => void;
}

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
	{ value: "draft", label: "Borrador" },
	{ value: "publish", label: "Publicado" },
	{ value: "future", label: "Programado" },
];

export function PublishingSidebar(props: PublishingSidebarProps) {
	const {
		status,
		publishedAt,
		noindex,
		nofollow,
		canonical,
		schemaType,
		onStatusChange,
		onPublishedAtChange,
		onNoindexChange,
		onNofollowChange,
		onCanonicalChange,
		onSchemaTypeChange,
	} = props;

	const showScheduleField = status === "future" || status === "publish";

	return (
		<div className="space-y-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 shadow-sm">
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
				Publicación
			</h3>

			<div className="space-y-1.5">
				<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
					Estado
				</label>
				<Select
					value={status}
					onValueChange={(v) => onStatusChange(v as PostStatus)}
				>
					<SelectTrigger className="h-9">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{showScheduleField && (
				<div className="space-y-1.5">
					<label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
						<CalendarClock className="h-3.5 w-3.5" />
						Fecha de publicación
					</label>
					<Input
						type="datetime-local"
						value={publishedAt}
						onChange={(e) => onPublishedAtChange(e.target.value)}
						className="h-9"
					/>
					<p className="text-[11px] text-gray-400">
						{status === "future"
							? "Vacío = se publica manualmente. Con fecha futura = programado."
							: "Si está vacío y el post es 'Publicado', el backend setea la fecha al guardar."}
					</p>
				</div>
			)}

			<div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
				<h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
					Indexación
				</h4>

				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2">
						<EyeOff className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
						<div>
							<p className="text-sm text-gray-800 dark:text-gray-200">
								noindex
							</p>
							<p className="text-[11px] text-gray-400">
								Pedir a Google que no indexe esta URL.
							</p>
						</div>
					</div>
					<Switch checked={noindex} onCheckedChange={onNoindexChange} />
				</div>

				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-2">
						<ShieldOff className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
						<div>
							<p className="text-sm text-gray-800 dark:text-gray-200">
								nofollow
							</p>
							<p className="text-[11px] text-gray-400">
								No transferir autoridad a los links del post.
							</p>
						</div>
					</div>
					<Switch checked={nofollow} onCheckedChange={onNofollowChange} />
				</div>
			</div>

			<div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1.5">
				<label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
					<Globe className="h-3.5 w-3.5" />
					URL canónica
				</label>
				<Input
					type="url"
					value={canonical}
					onChange={(e) => onCanonicalChange(e.target.value)}
					placeholder="https://legalistas.ar/consejos-legales/..."
					className="h-9 text-sm"
				/>
				<p className="text-[11px] text-gray-400">
					Dejá vacío para que se derive automáticamente del slug en la landing.
					Solo pone una URL acá si el contenido es duplicado de otra página.
				</p>
			</div>

			<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
				<SchemaTypeSelector
					value={schemaType}
					onChange={onSchemaTypeChange}
				/>
			</div>

			{!noindex && status === "publish" && (
				<div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-start gap-2 text-[11px] text-green-700 dark:text-green-400">
					<Eye className="h-3.5 w-3.5 mt-0.5 shrink-0" />
					<p>Visible en Google y en la landing pública.</p>
				</div>
			)}
		</div>
	);
}
