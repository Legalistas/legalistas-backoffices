"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/shared/Pagination";
import { cn } from "@/lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { POST_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import type { Post, PostTerm } from "@/types/blog";
import { PostStatusBadge } from "./PostStatusBadge";

interface BlogTableProps {
	posts: Post[];
	pagination: {
		page: number;
		per_page: number;
		total: number;
		total_pages: number;
	};
	onPageChange: (page: number) => void;
	onRefresh: () => void;
	selectedIds: Set<number>;
	onToggleSelect: (id: number) => void;
	onToggleSelectAll: () => void;
}

const parseTerms = (raw: Post["categories"] | Post["tags"]): PostTerm[] => {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

const formatDate = (iso: string) => {
	const d = new Date(iso);
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return `${day}/${month}/${d.getFullYear()}`;
};

const stripHtml = (html: string) =>
	html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const headerCell =
	"px-3 py-3 text-sm font-semibold text-gray-700 dark:text-gray-400";
const bodyCell = "px-3 py-3 text-sm text-gray-700 dark:text-gray-300";

const LANDING_BASE_URL =
	process.env.NEXT_PUBLIC_LANDING_URL || "https://legalistas.ar";

export function BlogTable({
	posts,
	pagination,
	onPageChange,
	onRefresh,
	selectedIds,
	onToggleSelect,
	onToggleSelectAll,
}: BlogTableProps) {
	const allVisibleSelected =
		posts.length > 0 && posts.every((p) => selectedIds.has(p.id));
	const someVisibleSelected =
		posts.some((p) => selectedIds.has(p.id)) && !allVisibleSelected;
	const router = useRouter();
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();

	const handleDelete = async (id: number) => {
		const ok = await confirm({
			description: "¿Eliminar este post? La acción no se puede deshacer.",
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			const res = await fetch(POST_BY_ID_ENDPOINT(id), {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!res.ok) throw new Error("Error al eliminar");
			toast.success("Post eliminado");
			onRefresh();
		} catch (err) {
			console.error("[blog] delete:", err);
			toast.error("No se pudo eliminar el post");
		}
	};

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
			<Table className="w-full">
				<TableHeader className="bg-gray-50 dark:bg-white/5">
					<TableRow>
						<TableCell className={`${headerCell} w-[3%]`}>
							<Checkbox
								checked={
									allVisibleSelected
										? true
										: someVisibleSelected
											? "indeterminate"
											: false
								}
								onCheckedChange={onToggleSelectAll}
								aria-label="Seleccionar todo lo visible"
							/>
						</TableCell>
						<TableCell className={`${headerCell} w-[37%]`}>Post</TableCell>
						<TableCell className={`${headerCell} w-[12%]`}>Estado</TableCell>
						<TableCell className={`${headerCell} w-[18%]`}>
							Categorías
						</TableCell>
						<TableCell className={`${headerCell} w-[12%]`}>Autor</TableCell>
						<TableCell className={`${headerCell} w-[10%]`}>Fecha</TableCell>
						<TableCell className={`${headerCell} text-right w-[8%]`}>
							Acción
						</TableCell>
					</TableRow>
				</TableHeader>
				<TableBody>
					{posts.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={7}
								className="px-4 py-12 text-center text-sm text-gray-500"
							>
								No hay posts con esos filtros.
							</TableCell>
						</TableRow>
					) : (
						posts.map((post) => {
							const cats = parseTerms(post.categories);
							const excerpt = stripHtml(post.excerpt || "");
							const isSelected = selectedIds.has(post.id);
							return (
								<TableRow
									key={post.id}
									className={cn(
										"group transition-colors",
										isSelected
											? "bg-primary/5 hover:bg-primary/10"
											: "hover:bg-gray-50 dark:hover:bg-white/5",
									)}
								>
									<TableCell className={bodyCell}>
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => onToggleSelect(post.id)}
											aria-label={`Seleccionar ${post.title}`}
										/>
									</TableCell>
									<TableCell className={bodyCell}>
										<div className="flex items-start gap-3">
											{post.featuredImageUrl ? (
												<div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-white/5">
													{/* eslint-disable-next-line @next/next/no-img-element */}
													<img
														src={post.featuredImageUrl}
														alt={post.featuredImageAlt || ""}
														className="h-full w-full object-cover"
													/>
												</div>
											) : (
												<div className="h-12 w-16 shrink-0 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] text-gray-400">
													sin imagen
												</div>
											)}
											<div className="min-w-0 flex-1">
												<Link
													href={`/admin/blog/${post.id}/edit`}
													className="block text-sm font-medium text-gray-900 dark:text-white hover:text-primary truncate"
													title={post.title}
												>
													{post.title || "(sin título)"}
												</Link>
												<p
													className="text-xs text-gray-500 dark:text-gray-400 truncate"
													title={excerpt}
												>
													/{post.slug}
												</p>
												{excerpt && (
													<p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
														{excerpt}
													</p>
												)}
											</div>
										</div>
									</TableCell>
									<TableCell className={bodyCell}>
										<PostStatusBadge status={post.status} />
									</TableCell>
									<TableCell className={bodyCell}>
										<div className="flex flex-wrap gap-1">
											{cats.length === 0 ? (
												<span className="text-xs text-gray-400">—</span>
											) : (
												cats.slice(0, 2).map((c) => (
													<span
														key={c.id}
														className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
													>
														{c.name}
													</span>
												))
											)}
											{cats.length > 2 && (
												<span className="text-[10px] text-gray-400">
													+{cats.length - 2}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell className={bodyCell}>
										<span className="truncate" title={post.authorName}>
											{post.authorName || "—"}
										</span>
									</TableCell>
									<TableCell className={bodyCell}>
										<span className="text-xs">
											{formatDate(post.publishedAt || post.date)}
										</span>
									</TableCell>
									<TableCell className="px-3 py-3 text-right">
										<div className="flex items-center justify-end gap-1">
											{post.status === "publish" && (
												<a
													href={`${LANDING_BASE_URL}/consejos-legales/${post.slug}`}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5"
													title="Ver en el sitio público"
												>
													<ExternalLink className="h-4 w-4" />
													<span className="sr-only">Ver público</span>
												</a>
											)}
											<button
												onClick={() => router.push(`/admin/blog/${post.id}/edit`)}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-white/5"
												title="Editar"
											>
												<Pencil className="h-4 w-4" />
												<span className="sr-only">Editar</span>
											</button>
											<button
												onClick={() => handleDelete(post.id)}
												className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5"
												title="Eliminar"
											>
												<Trash2 className="h-4 w-4" />
												<span className="sr-only">Eliminar</span>
											</button>
										</div>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>

			{pagination.total_pages > 1 && (
				<div className="px-6 py-4">
					<Pagination
						currentPage={pagination.page}
						totalPages={pagination.total_pages}
						totalItems={pagination.total}
						itemsPerPage={pagination.per_page}
						onPageChange={onPageChange}
					/>
				</div>
			)}

			{ConfirmationDialog}
		</div>
	);
}
