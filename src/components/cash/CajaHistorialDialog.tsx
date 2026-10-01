"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "@/components/shared/SelectSimple";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CASH_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type AccionHistorial = "ALTA" | "EDICION" | "BAJA" | "CIERRE" | "REPARACION";

interface HistorialItem {
	id: number;
	accion: AccionHistorial;
	origen: "CAJA" | "TARJETA" | "AGENDA";
	transactionId: number | null;
	detalle: string | null;
	createdAt: string;
	usuario: { id: number; name: string } | null;
	cajaUsuario: { id: number; name: string } | null;
}

const ACCIONES: Record<AccionHistorial, { label: string; className: string }> = {
	ALTA: {
		label: "Alta",
		className:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	},
	EDICION: {
		label: "Edición",
		className:
			"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
	},
	BAJA: {
		label: "Baja",
		className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
	},
	CIERRE: {
		label: "Cierre de mes",
		className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	},
	REPARACION: {
		label: "Reparación",
		className:
			"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
	},
};

const ORIGENES: Partial<Record<HistorialItem["origen"], string>> = {
	TARJETA: "Pago de resumen de tarjeta",
	AGENDA: "Desde Gastos e Ingresos",
};

const OPCIONES_ACCION = [
	{ value: "todas", label: "Todas" },
	...Object.entries(ACCIONES).map(([value, { label }]) => ({ value, label })),
];

const LIMITE = 50;

const fechaHora = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", {
		timeZone: "America/Argentina/Buenos_Aires",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

interface CajaHistorialDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	users: { id: number; name: string }[];
	/** Abre filtrado por un movimiento (botón de la fila). */
	transactionId?: number | null;
}

/**
 * Historial de la Caja Principal (GET /cash/historial): quién cargó, editó y
 * borró cada movimiento, y cuándo; también los cierres de mes. Solo lo ven
 * los roles de Caja Principal (el backend responde 403 al resto).
 */
export default function CajaHistorialDialog({
	open,
	onOpenChange,
	token,
	users,
	transactionId,
}: CajaHistorialDialogProps) {
	const [accion, setAccion] = useState("todas");
	const [usuarioId, setUsuarioId] = useState("todos");
	const [movimiento, setMovimiento] = useState("");
	const [desde, setDesde] = useState("");
	const [hasta, setHasta] = useState("");

	const [items, setItems] = useState<HistorialItem[]>([]);
	const [total, setTotal] = useState(0);
	const [pagina, setPagina] = useState(1);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Descarta respuestas viejas si los filtros cambian antes de que lleguen.
	const pedido = useRef(0);

	// Al abrir: sin filtros, o filtrado por el movimiento de la fila.
	useEffect(() => {
		if (!open) return;
		setAccion("todas");
		setUsuarioId("todos");
		setDesde("");
		setHasta("");
		setMovimiento(transactionId ? String(transactionId) : "");
	}, [open, transactionId]);

	const opcionesUsuarios = useMemo(
		() => [
			{ value: "todos", label: "Todos" },
			...[...users]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((u) => ({ value: String(u.id), label: u.name })),
		],
		[users],
	);

	const cargar = useCallback(
		async (numeroPagina: number) => {
			if (!token) return;
			const params = new URLSearchParams({
				page: String(numeroPagina),
				limit: String(LIMITE),
			});
			if (accion !== "todas") params.set("accion", accion);
			if (usuarioId !== "todos") params.set("usuarioId", usuarioId);
			const mov = Number(movimiento);
			if (Number.isInteger(mov) && mov > 0) params.set("transactionId", String(mov));
			if (desde) params.set("desde", desde);
			if (hasta) params.set("hasta", hasta);

			const id = ++pedido.current;
			setCargando(true);
			setError(null);
			try {
				const res = await fetch(`${CASH_ENDPOINT}/historial?${params}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (id !== pedido.current) return;
				if (!res.ok) {
					setError(await apiErrorMessage(res, "No se pudo cargar el historial."));
					if (numeroPagina === 1) setItems([]);
					return;
				}
				const data: { items: HistorialItem[]; total: number } = await res.json();
				if (id !== pedido.current) return;
				setItems((prev) => (numeroPagina === 1 ? data.items : [...prev, ...data.items]));
				setTotal(data.total);
				setPagina(numeroPagina);
			} catch {
				if (id === pedido.current) setError("No se pudo cargar el historial.");
			} finally {
				if (id === pedido.current) setCargando(false);
			}
		},
		[token, accion, usuarioId, movimiento, desde, hasta],
	);

	useEffect(() => {
		if (open) cargar(1);
	}, [open, cargar]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Historial de cambios de la caja</DialogTitle>
					<DialogDescription>
						Quién cargó, editó o borró cada movimiento, y cuándo. Se registra desde
						el 01/10/2026.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					<div className="space-y-1.5">
						<Label>Acción</Label>
						<Select options={OPCIONES_ACCION} value={accion} onValueChange={setAccion} />
					</div>
					<div className="space-y-1.5">
						<Label>Hecho por</Label>
						<Select
							options={opcionesUsuarios}
							value={usuarioId}
							onValueChange={setUsuarioId}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="historial-movimiento">Nº de movimiento</Label>
						<Input
							id="historial-movimiento"
							inputMode="numeric"
							placeholder="Ej: 1669"
							value={movimiento}
							onChange={(e) => setMovimiento(e.target.value.replace(/\D/g, ""))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="historial-desde">Desde</Label>
						<Input
							id="historial-desde"
							type="date"
							value={desde}
							onChange={(e) => setDesde(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="historial-hasta">Hasta</Label>
						<Input
							id="historial-hasta"
							type="date"
							value={hasta}
							onChange={(e) => setHasta(e.target.value)}
						/>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-auto">
					{error ? (
						<p className="py-10 text-center text-sm text-red-600">{error}</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="whitespace-nowrap">Fecha</TableHead>
									<TableHead>Acción</TableHead>
									<TableHead className="whitespace-nowrap">Mov.</TableHead>
									<TableHead>Caja de</TableHead>
									<TableHead>Hecho por</TableHead>
									<TableHead>Detalle</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.length === 0 && !cargando ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="py-10 text-center text-muted-foreground"
										>
											No hay cambios registrados con estos filtros.
										</TableCell>
									</TableRow>
								) : (
									items.map((i) => (
										<TableRow key={i.id} className="align-top">
											<TableCell className="whitespace-nowrap text-sm tabular-nums">
												{fechaHora(i.createdAt)}
											</TableCell>
											<TableCell>
												<Badge
													variant="secondary"
													className={cn("border-0", ACCIONES[i.accion]?.className)}
												>
													{ACCIONES[i.accion]?.label ?? i.accion}
												</Badge>
												{ORIGENES[i.origen] && (
													<p className="mt-1 text-[11px] text-muted-foreground">
														{ORIGENES[i.origen]}
													</p>
												)}
											</TableCell>
											<TableCell className="text-sm tabular-nums">
												{i.transactionId ? `#${i.transactionId}` : "—"}
											</TableCell>
											<TableCell className="text-sm">{i.cajaUsuario?.name ?? "—"}</TableCell>
											<TableCell className="text-sm">
												{i.usuario?.name ?? (
													<span className="text-muted-foreground">Sin dato</span>
												)}
											</TableCell>
											<TableCell className="min-w-72 whitespace-normal text-sm">
												{i.detalle}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</div>

				<div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
					<span>
						{items.length} de {total} cambios
					</span>
					<div className="flex items-center gap-2">
						{cargando && <Loader2 className="h-4 w-4 animate-spin" />}
						{items.length < total && (
							<Button
								variant="outline"
								size="sm"
								disabled={cargando}
								onClick={() => cargar(pagina + 1)}
							>
								Cargar más
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
