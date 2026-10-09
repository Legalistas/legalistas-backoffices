"use client";

import { CheckCircle2, Clock, HandCoins, Hourglass, Loader2, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { formatARS, formatFecha, MESES } from "@/components/caja/api";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CLOSINGS_COBROS_ENDPOINT } from "@/constant/api-endpoints";
import { buildFilteredUrl, useRolePermissions } from "@/hooks/useRolePermissions";
import { apiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

// Cobros del mes (Gestor de Cierres): lo que se cobró en el mes por fecha de
// cobro (no de cierre), lo que falta cobrar y la parte de los abogados
// representantes que quedó en una caja de Legalistas. El representante ve
// solo lo de sus causas (lo limita el servidor); el resto elige abogado.

interface DelCierre {
	closingId: number;
	caseId: number;
	causa: string;
	representanteId: number | null;
	representante: string | null;
}
interface Cobro extends DelCierre {
	id: string;
	fecha: string;
	concepto: "fee" | "pcl";
	monto: number;
}
interface Parte extends DelCierre {
	id: number;
	monto: number;
	estado: "pending" | "paid";
	fechaPago: string | null;
}
interface CobrosDelMesData {
	cobros: Cobro[];
	partes: Parte[];
	/** Lo que le falta cobrar a Legalistas, por abogado de la causa. */
	faltaCobrar: { representanteId: number | null; representante: string | null; monto: number }[];
}

const TODOS = "todos";
const CONCEPTO = { fee: "HP", pcl: "PCL" } as const;
const total = (filas: { monto: number }[]) => filas.reduce((suma, f) => suma + f.monto, 0);

export default function CobrosDelMes() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const permissions = useRolePermissions();
	const esRepresentante = permissions.isLawyer;

	const hoy = new Date();
	const [year, setYear] = useState(hoy.getFullYear());
	const [month, setMonth] = useState(hoy.getMonth() + 1);
	const [abogado, setAbogado] = useState(TODOS);
	const [data, setData] = useState<CobrosDelMesData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		fetch(
			buildFilteredUrl(CLOSINGS_COBROS_ENDPOINT, permissions, {
				year: String(year),
				month: String(month),
			}),
			{ headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
		)
			.then(async (res) => {
				if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudieron cargar los cobros"));
				setData((await res.json()).data);
			})
			.catch((e) => {
				if ((e as Error).name !== "AbortError") setError((e as Error).message);
			})
			.finally(() => setLoading(false));
		return () => controller.abort();
	}, [token, permissions, year, month]);

	// Abogados que aparecen en el mes, para el selector.
	const abogados = useMemo(() => {
		if (!data) return [];
		const porId = new Map<number, string>();
		for (const f of [...data.cobros, ...data.partes, ...data.faltaCobrar]) {
			if (f.representanteId) porId.set(f.representanteId, f.representante ?? `#${f.representanteId}`);
		}
		return [...porId].sort((a, b) => a[1].localeCompare(b[1]));
	}, [data]);

	const delAbogado = <T extends { representanteId: number | null }>(filas: T[]) =>
		abogado === TODOS ? filas : filas.filter((f) => String(f.representanteId) === abogado);

	const cobros = delAbogado(data?.cobros ?? []);
	const partes = delAbogado(data?.partes ?? []);
	const pendientes = partes.filter((p) => p.estado === "pending");
	const pagadas = partes.filter((p) => p.estado === "paid");
	const mesLabel = `${MESES[month - 1].toLowerCase()} ${year}`;
	const anios = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 3 + i);

	const tarjetas = [
		{
			titulo: "Cobrado en el mes",
			valor: total(cobros),
			detalle: `${cobros.length} ${cobros.length === 1 ? "cobro" : "cobros"} en ${mesLabel}`,
			icon: Wallet,
			color: "text-emerald-600",
		},
		{
			titulo: "Falta cobrar",
			valor: total(delAbogado(data?.faltaCobrar ?? [])),
			detalle: "La parte de Legalistas, de todos los cierres",
			icon: Hourglass,
			color: "text-amber-600",
		},
		{
			titulo: esRepresentante ? "Legalistas te debe" : "A pagar a representantes",
			valor: total(pendientes),
			detalle: `${esRepresentante ? "Tu" : "Su"} parte de lo que entró completo a Legalistas`,
			icon: Clock,
			color: "text-primary",
		},
		{
			titulo: esRepresentante ? "Te pagaron en el mes" : "Pagado a representantes",
			valor: total(pagadas),
			detalle: `En ${mesLabel}`,
			icon: HandCoins,
			color: "text-blue-600",
		},
	];

	const cabecera = "px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500";
	const celda = "px-4 py-3 text-sm";
	const marco =
		"overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/5";

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-2">
				<Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
					<SelectTrigger className="w-40" aria-label="Mes">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{MESES.map((m, i) => (
							<SelectItem key={m} value={String(i + 1)}>
								{m}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
					<SelectTrigger className="w-24" aria-label="Año">
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
				{!esRepresentante && abogados.length > 1 && (
					<Select value={abogado} onValueChange={setAbogado}>
						<SelectTrigger className="w-60" aria-label="Abogado">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={TODOS}>Todos los abogados</SelectItem>
							{abogados.map(([id, nombre]) => (
								<SelectItem key={id} value={String(id)}>
									{nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				{loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
			</div>

			{error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				{tarjetas.map((t) => (
					<div key={t.titulo} className={cn(marco, "p-4")}>
						<div className="flex items-start justify-between gap-2">
							<p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
								{t.titulo}
							</p>
							<t.icon className={cn("h-5 w-5 shrink-0", t.color)} />
						</div>
						<p className={cn("mt-1 text-xl font-bold tabular-nums", t.color)}>
							{formatARS(t.valor)}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">{t.detalle}</p>
					</div>
				))}
			</div>

			<section className="space-y-2">
				<h2 className="text-base font-semibold">Cobros de {mesLabel}</h2>
				<div className={marco}>
					<Table>
						<TableHeader className="bg-gray-50 dark:bg-white/5">
							<TableRow>
								<TableHead className={cabecera}>Fecha</TableHead>
								<TableHead className={cabecera}>Causa</TableHead>
								{!esRepresentante && <TableHead className={cabecera}>Abogado</TableHead>}
								<TableHead className={cabecera}>Concepto</TableHead>
								<TableHead className={cn(cabecera, "text-right")}>Cobrado</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cobros.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={esRepresentante ? 4 : 5}
										className="px-4 py-8 text-center text-sm text-muted-foreground"
									>
										{loading ? "Cargando…" : `No hubo cobros en ${mesLabel}.`}
									</TableCell>
								</TableRow>
							) : (
								cobros.map((c) => (
									<TableRow key={c.id}>
										<TableCell className={cn(celda, "whitespace-nowrap tabular-nums")}>
											{formatFecha(c.fecha)}
										</TableCell>
										<TableCell className={cn(celda, "font-medium")}>{c.causa}</TableCell>
										{!esRepresentante && (
											<TableCell className={cn(celda, "text-muted-foreground")}>
												{c.representante ?? "—"}
											</TableCell>
										)}
										<TableCell className={celda}>{CONCEPTO[c.concepto] ?? c.concepto}</TableCell>
										<TableCell className={cn(celda, "text-right font-medium tabular-nums")}>
											{formatARS(c.monto)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</section>

			<section className="space-y-2">
				<div>
					<h2 className="text-base font-semibold">
						{esRepresentante ? "Tu parte en Legalistas" : "Parte de los representantes"}
					</h2>
					<p className="text-sm text-muted-foreground">
						{esRepresentante
							? "Cuando un cobro entra completo a Legalistas, tu parte queda acá hasta que te la pagan. Si cobraste vos y transferiste la parte de Legalistas, no aparece."
							: "Lo que entró a una caja de Legalistas por encima de su parte. Se paga desde Gastos e Ingresos (categoría Representantes)."}
					</p>
				</div>
				<div className={marco}>
					<Table>
						<TableHeader className="bg-gray-50 dark:bg-white/5">
							<TableRow>
								<TableHead className={cabecera}>Causa</TableHead>
								{!esRepresentante && <TableHead className={cabecera}>Abogado</TableHead>}
								<TableHead className={cabecera}>Estado</TableHead>
								<TableHead className={cn(cabecera, "text-right")}>Monto</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{partes.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={esRepresentante ? 3 : 4}
										className="px-4 py-8 text-center text-sm text-muted-foreground"
									>
										{loading ? "Cargando…" : "No hay nada pendiente ni pagado en el mes."}
									</TableCell>
								</TableRow>
							) : (
								partes.map((p) => (
									<TableRow key={p.id}>
										<TableCell className={cn(celda, "font-medium")}>{p.causa}</TableCell>
										{!esRepresentante && (
											<TableCell className={cn(celda, "text-muted-foreground")}>
												{p.representante ?? "—"}
											</TableCell>
										)}
										<TableCell className={celda}>
											{p.estado === "paid" ? (
												<span className="inline-flex items-center gap-1 text-emerald-700">
													<CheckCircle2 className="h-4 w-4" />
													Pagado{p.fechaPago ? ` el ${formatFecha(p.fechaPago)}` : ""}
												</span>
											) : (
												<span className="inline-flex items-center gap-1 text-amber-700">
													<Clock className="h-4 w-4" />
													Pendiente de pago
												</span>
											)}
										</TableCell>
										<TableCell className={cn(celda, "text-right font-medium tabular-nums")}>
											{formatARS(p.monto)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</section>
		</div>
	);
}
