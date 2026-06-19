"use client";

import { Calendar, Monitor, Smartphone, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { extractToc } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";
import type { PostTerm } from "@/types/blog";
import { TableOfContents } from "./TableOfContents";

interface BlogPostPreviewProps {
	open: boolean;
	onClose: () => void;
	post: {
		title: string;
		slug: string;
		excerpt: string;
		contentHtml: string;
		featuredImageUrl: string | null;
		featuredImageAlt: string | null;
		authorName: string;
		categories: PostTerm[];
		date?: string;
		publishedAt?: string | null;
	};
}

const formatDate = (iso: string) => {
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("es-AR", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
};

export function BlogPostPreview({ open, onClose, post }: BlogPostPreviewProps) {
	const [view, setView] = useState<"desktop" | "mobile">("desktop");
	const dateText = formatDate(post.publishedAt || post.date || new Date().toISOString());

	// TOC: extraído del contentHtml. También devuelve el HTML con `id`s en los headings.
	const { toc, html: contentWithIds } = useMemo(
		() => extractToc(post.contentHtml || ""),
		[post.contentHtml],
	);
	const showToc = toc.length >= 2;

	return (
		<Sheet open={open} onOpenChange={(o) => !o && onClose()}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-4xl p-0 overflow-hidden flex flex-col"
			>
				<SheetTitle className="sr-only">
					Vista previa: {post.title || "Post sin título"}
				</SheetTitle>

				{/* Toolbar de preview */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
					<div className="flex items-center gap-2">
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
						<span className="text-xs text-gray-400 ml-1">
							legalistas.ar/consejos-legales/{post.slug || "..."}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
						aria-label="Cerrar"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Viewport */}
				<div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4">
					<div
						className={cn(
							"mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg transition-all",
							view === "mobile" ? "max-w-sm" : "max-w-3xl",
						)}
					>
						<article className="px-6 sm:px-8 py-8">
							{/* Meta */}
							<div className="mb-4 flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 text-xs">
								<div className="flex items-center gap-1.5">
									<Calendar className="h-3.5 w-3.5" />
									<time>{dateText}</time>
								</div>
								{post.categories.length > 0 && (
									<div className="flex flex-wrap items-center gap-1.5">
										{post.categories.slice(0, 3).map((c, i) => (
											<span key={c.slug}>
												<span className="text-teal-600 dark:text-teal-400">
													{c.name}
												</span>
												{i < Math.min(post.categories.length, 3) - 1 && ", "}
											</span>
										))}
									</div>
								)}
								{post.authorName && (
									<div className="flex items-center gap-1.5">
										<User className="h-3.5 w-3.5" />
										<span>By {post.authorName}</span>
									</div>
								)}
							</div>

							{/* Título */}
							<h1 className="mb-6 font-bold text-3xl text-gray-900 dark:text-white leading-tight">
								{post.title || (
									<span className="text-gray-400 italic">
										(sin título)
									</span>
								)}
							</h1>

							{/* Featured image */}
							{post.featuredImageUrl && (
								<div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={post.featuredImageUrl}
										alt={post.featuredImageAlt || ""}
										className="w-full h-full object-cover"
									/>
								</div>
							)}

							{/* TOC auto-generado: solo se muestra si hay al menos 2 headings */}
							{showToc && (
								<TableOfContents items={toc} className="mb-6" />
							)}

							{/* Content. Las mismas clases que usa la landing en src/app/(main)/consejos-legales/[slug]/page.tsx */}
							{post.contentHtml ? (
								<div
									className="wp-block-content prose prose-lg max-w-none prose-a:text-art-800 prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-a:no-underline hover:prose-a:underline scroll-smooth"
									dangerouslySetInnerHTML={{ __html: contentWithIds }}
								/>
							) : (
								<p className="text-gray-400 italic">(sin contenido)</p>
							)}
						</article>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
