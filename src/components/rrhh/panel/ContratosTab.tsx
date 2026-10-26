"use client";

import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatARS } from "@/components/caja/api";
import { abrirDocumento } from "@/components/rrhh/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTRATO_ESTADO_LABEL, CONTRATO_TIPO_LABEL } from "@/constant/rrhh";
import { fechaCorta, panelFetch } from "./shared";

interface ContratoPanel {
	id: number;
	userId: number;
	nombre: string;
	type: string;
	status: string;
	startDate: string;
	endDate: string | null;
	baseSalary: string | null;
	documentUrl: string | null;
	documentos: { id: number; titulo: string }[];
}

type Filtro = "VIGENTES" | "POR_VENCER" | "TODOS";

const AVISO_DIAS = 30;
const DIA_MS = 86_400_000;

/** Whole days from today to the end date (negative = already past). */
const diasHasta = (fin: string) => {
	const hoy = new Date();
	const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
	return Math.round((new Date(fin).getTime() - hoyUtc) / DIA_MS);
};

const porVencer = (c: ContratoPanel) =>
	c.status === "ACTIVE" && !!c.endDate && diasHasta(c.endDate) <= AVISO_DIAS;

/** Everyone's contracts in one table, the ones about to expire first. */
export default function ContratosTab() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [contratos, setContratos] = useState<ContratoPanel[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [filtro, setFiltro] = useState<Filtro>("VIGENTES");

	useEffect(() => {
		if (!token) return;
		panelFetch<{ data: ContratoPanel[] }>("/contratos", token)
			.then((r) => setContratos(r.data))
			.catch((err) => {
				setError((err as Error).message);
				setContratos([]);
			});
	}, [token]);

	const cuenta = useMemo(() => {
		const todos = contratos ?? [];
		return {
			VIGENTES: todos.filter((c) => c.status === "ACTIVE").length,
			POR_VENCER: todos.filter(porVencer).length,
			TODOS: todos.length,
		};
	}, [contratos]);

	const visibles = useMemo(() => {
		const lista = (contratos ?? []).filter((c) =>
			filtro === "TODOS" ? true : filtro === "VIGENTES" ? c.status === "ACTIVE" : porVencer(c),
		);
		// Closest end date first; open-ended contracts at the bottom.
		return lista.sort((a, b) => {
			if (!a.endDate) return b.endDate ? 1 : a.nombre.localeCompare(b.nombre);
			if (!b.endDate) return -1;
			return a.endDate.localeCompare(b.endDate);
		});
	}, [contratos, filtro]);

	const abrir = (id: number) => abrirDocumento(token, id).catch((err) => toast.error(err.message));

	const FILTROS: { key: Filtro; label: string }[] = [
		{ key: "VIGENTES", label: "Vigentes" },
		{ key: "POR_VENCER", label: `Vencen en ${AVISO_DIAS} días` },
		{ key: "TODOS", label: "Todos" },
	];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{FILTROS.map((f) => (
					<Button
						key={f.key}
						size="sm"
						variant={filtro === f.key ? "default" : "outline"}
						onClick={() => setFiltro(f.key)}
					>
						{f.label}
						<span className="ml-1.5 tabular-nums opacity-70">{contratos ? cuenta[f.key] : "…"}</span>
					</Button>
				))}
			</div>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs text-muted-foreground">
						<tr>
							<th className="px-3 py-2 font-medium">Persona</th>
							<th className="px-3 py-2 font-medium">Tipo</th>
							<th className="px-3 py-2 font-medium">Inicio</th>
							<th className="px-3 py-2 font-medium">Fin</th>
							<th className="px-3 py-2 text-right font-medium">Sueldo base</th>
							<th className="px-3 py-2 font-medium">Estado</th>
							<th className="px-3 py-2 font-medium">Contrato</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{contratos === null ? (
							Array.from({ length: 4 }).map((_, i) => (
								<tr key={i}>
									<td colSpan={7} className="px-3 py-2">
										<Skeleton className="h-8 w-full" />
									</td>
								</tr>
							))
						) : error || visibles.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
									{error ?? "No hay contratos en esta vista."}
								</td>
							</tr>
						) : (
							visibles.map((c) => {
								const dias = c.endDate ? diasHasta(c.endDate) : null;
								return (
									<tr key={c.id}>
										<td className="px-3 py-2">
											<Link
												href={`/admin/rrhh/${c.userId}?section=contracts`}
												className="font-medium text-foreground hover:underline"
											>
												{c.nombre}
											</Link>
										</td>
										<td className="px-3 py-2">{CONTRATO_TIPO_LABEL[c.type] ?? c.type}</td>
										<td className="px-3 py-2 tabular-nums">{fechaCorta(c.startDate)}</td>
										<td className="px-3 py-2">
											<span className="tabular-nums">{c.endDate ? fechaCorta(c.endDate) : "Sin fecha"}</span>
											{c.status === "ACTIVE" && dias !== null && dias <= AVISO_DIAS && (
												<Badge
													className={`ml-2 ${dias < 0 ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}
												>
													{dias < 0 ? `Venció hace ${-dias} d` : dias === 0 ? "Vence hoy" : `Vence en ${dias} d`}
												</Badge>
											)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{c.baseSalary ? formatARS(Number(c.baseSalary)) : "—"}
										</td>
										<td className="px-3 py-2">{CONTRATO_ESTADO_LABEL[c.status] ?? c.status}</td>
										<td className="px-3 py-2">
											<div className="flex flex-wrap gap-1">
												{c.documentos.map((d) => (
													<Button
														key={d.id}
														variant="ghost"
														size="sm"
														className="h-7 gap-1 px-2"
														title={d.titulo}
														onClick={() => abrir(d.id)}
													>
														<FileText className="h-3.5 w-3.5" />
														Ver
													</Button>
												))}
												{!c.documentos.length && c.documentUrl && (
													<Button variant="ghost" size="sm" className="h-7 gap-1 px-2" asChild>
														<a href={c.documentUrl} target="_blank" rel="noopener noreferrer">
															<ExternalLink className="h-3.5 w-3.5" />
															Ver
														</a>
													</Button>
												)}
												{!c.documentos.length && !c.documentUrl && (
													<span className="text-xs text-muted-foreground">Sin archivo</span>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
