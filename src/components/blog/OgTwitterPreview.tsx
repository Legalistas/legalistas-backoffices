"use client";

import { Facebook, Twitter } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OgTwitterPreviewProps {
	ogTitle: string;
	ogDescription: string;
	ogImage: string | null;
	twitterTitle: string;
	twitterDescription: string;
	twitterImage: string | null;
	siteUrl?: string;
}

export function OgTwitterPreview({
	ogTitle,
	ogDescription,
	ogImage,
	twitterTitle,
	twitterDescription,
	twitterImage,
	siteUrl = "legalistas.ar",
}: OgTwitterPreviewProps) {
	const [view, setView] = useState<"og" | "twitter">("og");

	const isOg = view === "og";
	const title = isOg ? ogTitle : twitterTitle || ogTitle;
	const desc = isOg ? ogDescription : twitterDescription || ogDescription;
	const image = isOg ? ogImage : twitterImage || ogImage;

	const displayTitle = title || "Título del post";
	const displayDesc =
		desc || "Descripción del post para compartir en redes sociales.";

	return (
		<div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold text-gray-900 dark:text-white">
					Vista previa redes sociales
				</h4>
				<div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
					<button
						type="button"
						onClick={() => setView("og")}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded text-xs",
							view === "og"
								? "bg-primary/10 text-primary"
								: "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5",
						)}
					>
						<Facebook className="h-3 w-3" />
						<span>OG (FB/LinkedIn/WA)</span>
					</button>
					<button
						type="button"
						onClick={() => setView("twitter")}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded text-xs",
							view === "twitter"
								? "bg-primary/10 text-primary"
								: "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5",
						)}
					>
						<Twitter className="h-3 w-3" />
						<span>X/Twitter</span>
					</button>
				</div>
			</div>

			<div className="max-w-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
				<div className="aspect-video bg-gray-100 dark:bg-white/5">
					{image ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={image}
							alt=""
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
							sin imagen
						</div>
					)}
				</div>
				<div
					className={cn(
						"px-3 py-2",
						isOg ? "bg-gray-50 dark:bg-white/5" : "bg-white dark:bg-gray-950",
					)}
				>
					<div className="flex items-center gap-1.5">
						<div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center p-0.5 shrink-0">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src="/images/logo/logo-icon.svg"
								alt="Legalistas"
								className="h-full w-full object-contain"
							/>
						</div>
						<p className="text-[11px] text-gray-500 uppercase tracking-wide truncate">
							{siteUrl}
						</p>
					</div>
					<p
						className={cn(
							"font-semibold leading-snug line-clamp-2 mt-1",
							isOg ? "text-sm text-gray-900 dark:text-white" : "text-sm",
						)}
					>
						{displayTitle}
					</p>
					<p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
						{displayDesc}
					</p>
				</div>
			</div>
		</div>
	);
}
