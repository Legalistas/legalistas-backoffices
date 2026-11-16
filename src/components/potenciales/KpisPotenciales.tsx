"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Fragment, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POTENCIALES_ENDPOINT } from "@/constant/api-endpoints";

// KPIs de Potenciales (sprint 4.h): consultas, factibles y factibilidad por mes,
// separadas en pagas, orgánicas y app. Factible = llegó al CRM (bot o a mano).

interface Cifra {
	consultas: number;
	factibles: number;
	factibilidad: number | null;
}
type Fila = { mes: number } & Record<"PAGA" | "ORGANICA" | "APP" | "TOTAL", Cifra>;

const COLUMNAS = [
	{ clave: "PAGA", texto: "Pagas" },
	{ clave: "ORGANICA", texto: "Orgánicas" },
	{ clave: "APP", texto: "App" },
	{ clave: "TOTAL", texto: "Total" },
] as const;
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })} %`);

export function KpisPotenciales() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const actual = new Date().getFullYear();
	const [anio, setAnio] = useState(actual);
	const [filas, setFilas] = useState<Fila[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		setFilas(null);
		fetch(`${POTENCIALES_ENDPOINT}/kpis?anio=${anio}`, { headers: { Authorization: `Bearer ${token}` } })
			.then(async (r) => {
				const cuerpo = await r.json().catch(() => ({}));
				if (!r.ok) throw new Error(cuerpo.error || `Error ${r.status}`);
				setFilas(cuerpo.data);
				setError(null);
			})
			.catch((e: Error) => setError(e.message));
	}, [token, anio]);

	const conDatos = filas?.filter((f) => f.TOTAL.consultas > 0) ?? [];
	const anios = Array.from({ length: Math.max(1, actual - 2025) }, (_, i) => actual - i);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
					<SelectTrigger className="w-28" aria-label="Año">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{anios.map((a) => (
							<SelectItem key={a} value={String(a)}>
								{a}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					Consulta = cada conversación nueva o "Nuevo accidente" de la app. Factible = llegó al embudo.
				</p>
			</div>

			{error ? (
				<p className="text-sm text-destructive">{error}</p>
			) : filas === null ? (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" /> Cargando…
				</p>
			) : conDatos.length === 0 ? (
				<p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
					Todavía no hay consultas en {anio}.
				</p>
			) : (
				<div className="overflow-x-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow className="bg-muted/50">
								<TableHead rowSpan={2}>Mes</TableHead>
								{COLUMNAS.map((c) => (
									<TableHead key={c.clave} colSpan={3} className="border-l text-center">
										{c.texto}
									</TableHead>
								))}
							</TableRow>
							<TableRow className="bg-muted/50">
								{COLUMNAS.map((c) => (
									<Fragment key={c.clave}>
										<TableHead key={`${c.clave}-c`} className="border-l text-right">
											Consultas
										</TableHead>
										<TableHead key={`${c.clave}-f`} className="text-right">
											Factibles
										</TableHead>
										<TableHead key={`${c.clave}-p`} className="text-right">
											%
										</TableHead>
									</Fragment>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{conDatos.map((f) => (
								<TableRow key={f.mes}>
									<TableCell className="font-medium">{MESES[f.mes - 1]}</TableCell>
									{COLUMNAS.map((c) => (
										<Fragment key={c.clave}>
											<TableCell key={`${c.clave}-c`} className="border-l text-right tabular-nums">
												{f[c.clave].consultas}
											</TableCell>
											<TableCell key={`${c.clave}-f`} className="text-right tabular-nums">
												{f[c.clave].factibles}
											</TableCell>
											<TableCell key={`${c.clave}-p`} className="text-right tabular-nums">
												{pct(f[c.clave].factibilidad)}
											</TableCell>
										</Fragment>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
