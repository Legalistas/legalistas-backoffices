"use client";

import { ChevronDown, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { POSTS_AUTHORS_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";
import type { PostAuthor } from "@/types/blog";

interface AuthorSelectorProps {
	value: number | null;
	onChange: (authorId: number | null, author: PostAuthor | null) => void;
}

export function AuthorSelector({ value, onChange }: AuthorSelectorProps) {
	const { data: session } = useSession();
	const [authors, setAuthors] = useState<PostAuthor[]>([]);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Cargar autores cuando hay session.
	useEffect(() => {
		if (!session?.user?.accessToken) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await fetch(POSTS_AUTHORS_ENDPOINT, {
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});
				if (!res.ok) return;
				const data: PostAuthor[] = await res.json();
				if (!cancelled) setAuthors(data);
			} catch (err) {
				console.error("[AuthorSelector] fetch:", err);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [session?.user?.accessToken]);

	// Click fuera cierra el dropdown.
	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, []);

	const selected = authors.find((a) => a.id === value) ?? null;

	const filtered = search.trim()
		? authors.filter((a) =>
				`${a.name} ${a.jobTitle ?? ""}`
					.toLowerCase()
					.includes(search.trim().toLowerCase()),
			)
		: authors;

	const handlePick = (a: PostAuthor) => {
		onChange(a.id, a);
		setOpen(false);
		setSearch("");
	};

	return (
		<div className="space-y-1.5" ref={containerRef}>
			<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
				Autor
			</label>

			<div className="relative">
				<button
					type="button"
					onClick={() => {
						setOpen((o) => !o);
						setTimeout(() => inputRef.current?.focus(), 0);
					}}
					className="w-full flex items-center justify-between h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
				>
					<span className="flex items-center gap-2 truncate">
						{selected?.image ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={selected.image}
								alt=""
								className="h-6 w-6 rounded-full object-cover shrink-0"
							/>
						) : (
							<div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
								<User className="h-3.5 w-3.5 text-gray-400" />
							</div>
						)}
						<span
							className={cn(
								"truncate",
								selected ? "text-gray-900 dark:text-white" : "text-gray-400",
							)}
						>
							{selected ? selected.name : "Sin asignar"}
						</span>
					</span>
					<div className="flex items-center gap-1 shrink-0">
						{selected && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onChange(null, null);
								}}
								className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600"
							>
								<X className="h-3 w-3" />
							</button>
						)}
						<ChevronDown
							className={cn(
								"h-3.5 w-3.5 text-gray-400 transition-transform",
								open && "rotate-180",
							)}
						/>
					</div>
				</button>

				{open && (
					<div className="absolute z-30 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
						<div className="p-2 border-b border-gray-100 dark:border-gray-800">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
								<input
									ref={inputRef}
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Buscar autor..."
									className="w-full h-8 pl-8 pr-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 text-sm focus:bg-white dark:focus:bg-white/5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
								/>
							</div>
						</div>
						<div className="max-h-64 overflow-y-auto">
							{loading ? (
								<div className="px-3 py-3 text-xs text-gray-400 text-center">
									Cargando...
								</div>
							) : filtered.length === 0 ? (
								<div className="px-3 py-3 text-xs text-gray-400 text-center">
									{search ? "Sin resultados" : "No hay autores disponibles"}
								</div>
							) : (
								filtered.map((a) => (
									<button
										key={a.id}
										type="button"
										onClick={() => handlePick(a)}
										className={cn(
											"w-full flex items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors",
											a.id === value && "bg-primary/5",
										)}
									>
										{a.image ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={a.image}
												alt=""
												className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5"
											/>
										) : (
											<div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
												<User className="h-3.5 w-3.5 text-gray-400" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="font-medium text-gray-900 dark:text-white truncate">
												{a.name}
											</p>
											{a.jobTitle && (
												<p className="text-[11px] text-gray-500 truncate">
													{a.jobTitle}
												</p>
											)}
										</div>
									</button>
								))
							)}
						</div>
					</div>
				)}
			</div>

			{/* Mini preview del autor seleccionado para refuerzo E-E-A-T */}
			{selected && (selected.bio || selected.jobTitle) && (
				<div className="mt-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/3 p-2.5">
					{selected.jobTitle && (
						<p className="text-[11px] font-semibold text-primary">
							{selected.jobTitle}
						</p>
					)}
					{selected.bio && (
						<p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
							{selected.bio}
						</p>
					)}
					{!selected.bio && (
						<p className="text-[11px] text-orange-600 dark:text-orange-400 mt-1">
							Este autor todavía no tiene bio. Para mejor SEO/E-E-A-T agregale
							una desde el perfil del usuario.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
