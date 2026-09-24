"use client";

import { Check, Loader2, Lock, Unlock, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { POSTS_SLUG_CHECK_ENDPOINT } from "@/constant/api-endpoints";
import { isValidSlug, slugify } from "@/lib/blog/slugify";
import { cn } from "@/lib/utils";
import type { SlugCheckResponse } from "@/types/blog";

interface SlugInputProps {
	title: string;
	value: string;
	onChange: (slug: string) => void;
	/** ID del post si estamos editando — se excluye en el slug-check */
	excludeId?: number | null;
}

type State =
	| { kind: "idle" }
	| { kind: "checking" }
	| { kind: "available" }
	| { kind: "taken" }
	| { kind: "invalid_format" }
	| { kind: "error" };

export function SlugInput({
	title,
	value,
	onChange,
	excludeId,
}: SlugInputProps) {
	const { data: session } = useSession();
	// Si el slug todavía no fue tocado manualmente, sigue al título.
	const [locked, setLocked] = useState(false);
	const [state, setState] = useState<State>({ kind: "idle" });
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	// Auto-sync con el title cuando no está locked.
	useEffect(() => {
		if (locked) return;
		const auto = slugify(title);
		if (auto !== value) onChange(auto);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [title, locked]);

	const checkSlug = useCallback(
		async (slug: string) => {
			if (!slug) {
				setState({ kind: "idle" });
				return;
			}
			if (!isValidSlug(slug)) {
				setState({ kind: "invalid_format" });
				return;
			}
			setState({ kind: "checking" });
			try {
				const url = new URL(POSTS_SLUG_CHECK_ENDPOINT, window.location.origin);
				url.searchParams.set("slug", slug);
				if (excludeId != null) {
					url.searchParams.set("excludeId", String(excludeId));
				}
				const res = await fetch(url.toString(), {
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});
				const data: SlugCheckResponse = await res.json();
				if (data.available) {
					setState({ kind: "available" });
				} else if (data.reason === "invalid_format") {
					setState({ kind: "invalid_format" });
				} else {
					setState({ kind: "taken" });
				}
			} catch (err) {
				console.error("[SlugInput] check:", err);
				setState({ kind: "error" });
			}
		},
		[excludeId, session?.user?.accessToken],
	);

	// Debounce 400ms sobre cambios de `value`.
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => checkSlug(value), 400);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [value, checkSlug]);

	const statusUi = (() => {
		switch (state.kind) {
			case "checking":
				return (
					<div className="flex items-center gap-1 text-xs text-gray-400">
						<Loader2 className="h-3 w-3 animate-spin" />
						<span>verificando...</span>
					</div>
				);
			case "available":
				return (
					<div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
						<Check className="h-3 w-3" />
						<span>disponible</span>
					</div>
				);
			case "taken":
				return (
					<div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
						<X className="h-3 w-3" />
						<span>ya existe otro post con este slug</span>
					</div>
				);
			case "invalid_format":
				return (
					<div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
						<X className="h-3 w-3" />
						<span>formato inválido (solo a-z, 0-9 y guiones)</span>
					</div>
				);
			case "error":
				return (
					<div className="flex items-center gap-1 text-xs text-gray-500">
						<X className="h-3 w-3" />
						<span>error al verificar</span>
					</div>
				);
			default:
				return null;
		}
	})();

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
					Slug
				</label>
				<button
					type="button"
					onClick={() => setLocked(!locked)}
					className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-primary"
					title={
						locked
							? "Slug manual — el título no lo va a sobreescribir"
							: "Slug automático desde el título"
					}
				>
					{locked ? (
						<>
							<Lock className="h-3 w-3" />
							<span>manual</span>
						</>
					) : (
						<>
							<Unlock className="h-3 w-3" />
							<span>auto</span>
						</>
					)}
				</button>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-gray-400 shrink-0">/</span>
				<Input
					value={value}
					onChange={(e) => {
						if (!locked) setLocked(true);
						onChange(e.target.value.toLowerCase());
					}}
					className={cn(
						"h-9 font-mono text-sm",
						state.kind === "taken" || state.kind === "invalid_format"
							? "border-red-300 focus:border-red-400"
							: state.kind === "available"
								? "border-green-300 focus:border-green-400"
								: "",
					)}
					placeholder="auto-generado-desde-el-titulo"
				/>
			</div>
			{statusUi}
		</div>
	);
}
