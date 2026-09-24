"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GoogleSnippetPreviewProps {
	title: string;
	metaDescription: string;
	slug: string;
	siteUrl?: string;
	canonical?: string;
}

const TITLE_PIXEL_MAX_DESKTOP = 580;
const TITLE_PIXEL_MAX_MOBILE = 600;
const DESC_CHAR_MAX = 160;

export function GoogleSnippetPreview({
	title,
	metaDescription,
	slug,
	siteUrl = "https://legalistas.ar",
	canonical,
}: GoogleSnippetPreviewProps) {
	const [view, setView] = useState<"desktop" | "mobile">("desktop");
	const displayUrl =
		(canonical || `${siteUrl}/consejos-legales/${slug || "..."}`)
			.replace(/^https?:\/\//, "")
			.replace(/\/$/, "");

	const titleDisplay = title || "Título del post";
	const descDisplay =
		metaDescription ||
		"Tu meta description aparece acá. Apuntá a 140–160 caracteres y mencioná la keyword principal.";

	// Estimación grosera para el corte: ~9px por caracter en desktop, ~8.5 mobile.
	const isTitleClipped =
		titleDisplay.length * 9 >
		(view === "desktop" ? TITLE_PIXEL_MAX_DESKTOP : TITLE_PIXEL_MAX_MOBILE);
	const isDescClipped = descDisplay.length > DESC_CHAR_MAX;

	return (
		<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold text-gray-900 dark:text-white">
					Vista previa Google
				</h4>
				<div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
					<button
						type="button"
						onClick={() => setView("desktop")}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded text-xs",
							view === "desktop"
								? "bg-primary/10 text-primary"
								: "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5",
						)}
					>
						<Monitor className="h-3 w-3" />
						<span>Desktop</span>
					</button>
					<button
						type="button"
						onClick={() => setView("mobile")}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded text-xs",
							view === "mobile"
								? "bg-primary/10 text-primary"
								: "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5",
						)}
					>
						<Smartphone className="h-3 w-3" />
						<span>Mobile</span>
					</button>
				</div>
			</div>

			<div
				className={cn(
					"rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4",
					view === "mobile" && "max-w-sm",
				)}
			>
				<div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 mb-1">
					<div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center p-1 shrink-0">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src="/images/logo/logo-icon.svg"
							alt="Legalistas"
							className="h-full w-full object-contain"
						/>
					</div>
					<div className="flex flex-col leading-tight">
						<span className="text-gray-700 dark:text-gray-300 text-xs">
							Legalistas
						</span>
						<span className="text-gray-500 text-[11px]">{displayUrl}</span>
					</div>
				</div>
				<h3
					className={cn(
						"text-[#1a0dab] dark:text-[#8ab4f8] text-lg leading-tight hover:underline cursor-pointer line-clamp-2",
					)}
				>
					{titleDisplay}
				</h3>
				<p
					className={cn(
						"text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2",
					)}
				>
					{descDisplay}
				</p>
			</div>

			<div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
				<span
					className={cn(
						isTitleClipped && "text-orange-600 dark:text-orange-400 font-medium",
					)}
				>
					Título: {titleDisplay.length} car. {isTitleClipped && "(puede cortarse)"}
				</span>
				<span
					className={cn(
						isDescClipped && "text-orange-600 dark:text-orange-400 font-medium",
					)}
				>
					Meta: {descDisplay.length}/160 car. {isDescClipped && "(excedido)"}
				</span>
			</div>
		</div>
	);
}
