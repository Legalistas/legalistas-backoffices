"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
	Scale,
	Users2,
	ArrowRightLeft,
	Handshake,
	Loader2,
	Search,
} from "lucide-react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	CASES_ENDPOINT,
	CUSTOMERS_ENDPOINT,
	NEGOTIATIONS_ENDPOINT,
	CLOSINGS_ENDPOINT,
} from "@/constant/api-endpoints";

// ── Types ────────────────────────────────────────────────────────────
interface SearchResult {
	id: number;
	label: string;
	description?: string;
	href: string;
	category: "causas" | "clientes" | "negociaciones" | "cierres";
}

interface ApiMeta {
	total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
	causas: { icon: Scale, label: "Causas" },
	clientes: { icon: Users2, label: "Clientes" },
	negociaciones: { icon: ArrowRightLeft, label: "Negociaciones" },
	cierres: { icon: Handshake, label: "Cierres" },
} as const;

async function searchAll(
	query: string,
	token: string,
	signal: AbortSignal,
): Promise<SearchResult[]> {
	const headers = { Authorization: `Bearer ${token}` };
	const limit = 5;

	const [casesRes, customersRes, negotiationsRes, closingsRes] =
		await Promise.allSettled([
			fetch(
				`${CASES_ENDPOINT}?search=${encodeURIComponent(query)}&limit=${limit}`,
				{ headers, signal },
			),
			fetch(
				`${CUSTOMERS_ENDPOINT}?search=${encodeURIComponent(query)}&limit=${limit}`,
				{ headers, signal },
			),
			fetch(
				`${NEGOTIATIONS_ENDPOINT}?search=${encodeURIComponent(query)}&limit=${limit}`,
				{ headers, signal },
			),
			fetch(
				`${CLOSINGS_ENDPOINT}?search=${encodeURIComponent(query)}&limit=${limit}`,
				{ headers, signal },
			),
		]);

	const results: SearchResult[] = [];

	// Causas
	if (casesRes.status === "fulfilled" && casesRes.value.ok) {
		const json = await casesRes.value.json();
		const items = json.data ?? json;
		for (const c of items) {
			results.push({
				id: c.id,
				label: c.title || `Causa #${c.id}`,
				description: c.number
					? `Nº ${c.number}`
					: c.customer?.name
						? c.customer.name
						: undefined,
				href: `/admin/legal-cases/${c.id}`,
				category: "causas",
			});
		}
	}

	// Clientes
	if (customersRes.status === "fulfilled" && customersRes.value.ok) {
		const json = await customersRes.value.json();
		const items = json.data ?? json;
		for (const c of items) {
			results.push({
				id: c.id,
				label: c.name || `Cliente #${c.id}`,
				description: c.email || undefined,
				href: `/admin/customers`,
				category: "clientes",
			});
		}
	}

	// Negociaciones
	if (negotiationsRes.status === "fulfilled" && negotiationsRes.value.ok) {
		const json = await negotiationsRes.value.json();
		const items = json.data ?? json;
		for (const n of items) {
			const caseTitle = n.case?.title || n.causa?.title || "";
			results.push({
				id: n.id,
				label: caseTitle || `Negociación #${n.id}`,
				description: n.status || undefined,
				href: `/admin/negotiation?openId=${n.id}`,
				category: "negociaciones",
			});
		}
	}

	// Cierres
	if (closingsRes.status === "fulfilled" && closingsRes.value.ok) {
		const json = await closingsRes.value.json();
		const items = json.data ?? json;
		for (const c of items) {
			const caseTitle = c.case?.title || "";
			results.push({
				id: c.id,
				label: caseTitle || `Cierre #${c.id}`,
				description: c.type || undefined,
				href: `/admin/closing-manager?openId=${c.id}`,
				category: "cierres",
			});
		}
	}

	return results;
}

// ── Component ────────────────────────────────────────────────────────

export default function GlobalSearch() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const { data: session } = useSession();
	const abortRef = useRef<AbortController | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Cmd+K / Ctrl+K shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	// Reset on close
	useEffect(() => {
		if (!open) {
			setQuery("");
			setResults([]);
			setLoading(false);
		}
	}, [open]);

	// Debounced search
	const handleSearch = useCallback(
		(value: string) => {
			setQuery(value);

			// Cancel previous
			abortRef.current?.abort();
			if (debounceRef.current) clearTimeout(debounceRef.current);

			if (!value.trim() || value.trim().length < 2) {
				setResults([]);
				setLoading(false);
				return;
			}

			setLoading(true);

			debounceRef.current = setTimeout(async () => {
				const token = session?.user?.accessToken;
				if (!token) {
					setLoading(false);
					return;
				}

				const controller = new AbortController();
				abortRef.current = controller;

				try {
					const data = await searchAll(
						value.trim(),
						token,
						controller.signal,
					);
					setResults(data);
				} catch {
					// aborted or network error — ignore
				} finally {
					setLoading(false);
				}
			}, 350);
		},
		[session],
	);

	const handleSelect = (href: string) => {
		setOpen(false);
		router.push(href);
	};

	// Group results by category
	const grouped = results.reduce(
		(acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		},
		{} as Record<string, SearchResult[]>,
	);

	return (
		<>
			{/* Trigger button styled like the old input */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="relative flex h-10 w-full items-center rounded-lg border border-input bg-muted/40 pl-9 pr-16 text-sm text-muted-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
			>
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
				<span>Buscar causas, clientes, negociaciones...</span>
				<kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded-md border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:flex">
					<span className="text-xs">⌘</span>K
				</kbd>
			</button>

			{/* Command palette dialog */}
			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="Búsqueda Global"
				description="Buscar en causas, clientes, negociaciones y cierres"
				showCloseButton={false}
			>
				<CommandInput
					placeholder="Buscar causas, clientes, negociaciones, cierres..."
					value={query}
					onValueChange={handleSearch}
				/>
				<CommandList>
					{loading && (
						<div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							Buscando...
						</div>
					)}

					{!loading && query.trim().length >= 2 && results.length === 0 && (
						<CommandEmpty>
							No se encontraron resultados para &ldquo;{query}&rdquo;
						</CommandEmpty>
					)}

					{!loading &&
						query.trim().length < 2 &&
						results.length === 0 && (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Escribí al menos 2 caracteres para buscar
							</div>
						)}

					{Object.entries(grouped).map(([category, items]) => {
						const config =
							CATEGORY_CONFIG[
								category as keyof typeof CATEGORY_CONFIG
							];
						const Icon = config.icon;
						return (
							<CommandGroup key={category} heading={config.label}>
								{items.map((item) => (
									<CommandItem
										key={`${category}-${item.id}`}
										value={`${item.label} ${item.description ?? ""}`}
										onSelect={() => handleSelect(item.href)}
										className="cursor-pointer"
									>
										<Icon className="mr-2 size-4 shrink-0" />
										<div className="flex flex-col min-w-0">
											<span className="truncate font-medium">
												{item.label}
											</span>
											{item.description && (
												<span className="truncate text-xs text-muted-foreground">
													{item.description}
												</span>
											)}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						);
					})}
				</CommandList>
			</CommandDialog>
		</>
	);
}
