"use client";

import { CheckSquare, Square } from "lucide-react";
import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import {
	type AportePago,
	type AportesDetalle,
	algunaTarjetaActiva,
	calcularAportes,
	PORCENTAJE_CAJA,
	PORCENTAJE_CAPITAL,
	PORCENTAJES_OTRO,
	porcentajesOtro,
	type TarjetaAporte,
	textoPagoAporte,
} from "@/lib/aportes-cierre";
import { cn } from "@/lib/utils";

// Aportes de un cierre en tres tarjetas (alta y edición): 13 % del capital,
// 7 % de la Caja y 5,4 % / 9 %. Cada una se activa por cierre y lleva a mano
// lo que aporta el representante; lo que resta es de Legalistas.
// Al guardar el cierre, cada aporte queda pendiente en Gastos e Ingresos;
// cuando Contabilidad lo paga desde una caja, acá figura "Aporte pagado".

const ars = (n: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
const pct = (n: number) => `${String(n).replace(".", ",")} %`;

const inputClass =
	"w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted disabled:text-muted-foreground";

function Monto({
	id,
	label,
	value,
	onChange,
	disabled,
	ayuda,
}: {
	id: string;
	label: string;
	value: number;
	onChange: (n: number) => void;
	disabled?: boolean;
	ayuda?: string;
}) {
	return (
		<div className="space-y-1">
			<label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</label>
			<div className="relative">
				<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
					$
				</span>
				<input
					id={id}
					type="number"
					step="0.01"
					min="0"
					value={value || ""}
					onChange={(e) => onChange(Number(e.target.value) || 0)}
					disabled={disabled}
					placeholder="0,00"
					className={inputClass}
				/>
			</div>
			{ayuda && <p className="text-xs text-amber-600">{ayuda}</p>}
		</div>
	);
}

function Lectura({ label, valor, fuerte }: { label: string; valor: string; fuerte?: boolean }) {
	return (
		<div className="flex items-baseline justify-between gap-2 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className={cn("tabular-nums", fuerte && "font-semibold text-foreground")}>{valor}</span>
		</div>
	);
}

function Tarjeta({
	titulo,
	detalle,
	activa,
	onActiva,
	calculo,
	representante,
	onRepresentante,
	conRepresentante,
	id,
	pagos,
	children,
}: {
	titulo: string;
	detalle: string;
	activa: boolean;
	onActiva: (v: boolean) => void;
	calculo: TarjetaAporte;
	/** Lo que se cargó a mano (puede superar el aporte: se avisa y se toma el tope). */
	representante: number;
	onRepresentante: (n: number) => void;
	conRepresentante: boolean;
	id: string;
	/** Filas de Gastos e Ingresos de esta tarjeta (vacío si el cierre todavía no se guardó así). */
	pagos: AportePago[];
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				"rounded-lg border p-4 space-y-3 transition-colors",
				activa ? "border-primary/40 bg-primary/5" : "border-border",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm font-semibold text-foreground">{titulo}</p>
					<p className="text-xs text-muted-foreground">{detalle}</p>
				</div>
				<Switch checked={activa} onCheckedChange={onActiva} aria-label={`Aplicar ${titulo}`} />
			</div>
			{activa && (
				<>
					{children}
					<Lectura label="Aporte" valor={ars(calculo.aporte)} fuerte />
					<Monto
						id={`${id}-representante`}
						label="Aporta el representante ($)"
						value={conRepresentante ? representante : 0}
						onChange={onRepresentante}
						disabled={!conRepresentante}
						ayuda={
							conRepresentante && representante > calculo.aporte
								? `No puede superar el aporte: se toma ${ars(calculo.aporte)}.`
								: undefined
						}
					/>
					<Lectura label="Aporta Legalistas" valor={ars(calculo.legalistas)} />
					<div className="space-y-1 border-t border-border/60 pt-2">
						{pagos.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								Al guardar queda pendiente en Gastos e Ingresos, para pagarlo desde una caja.
							</p>
						) : (
							pagos.map((p) => (
								<p
									key={p.id}
									className={cn(
										"flex items-start gap-1.5 text-xs",
										p.pagado
											? "text-emerald-700 dark:text-emerald-400"
											: "text-amber-700 dark:text-amber-400",
									)}
								>
									{p.pagado ? (
										<CheckSquare className="mt-px h-3.5 w-3.5 shrink-0" />
									) : (
										<Square className="mt-px h-3.5 w-3.5 shrink-0" />
									)}
									<span>{textoPagoAporte(p)}</span>
								</p>
							))
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default function AportesCards({
	value,
	onChange,
	capital,
	conRepresentante,
	anteriores,
	pagos = [],
	desdeNegociacion = false,
}: {
	value: AportesDetalle;
	onChange: (v: AportesDetalle) => void;
	/** El cierre sale de una negociación: la tercera tarjeta ofrece 9,3 % en vez de 9 %. */
	desdeNegociacion?: boolean;
	/** Capital cerrado: base de la tarjeta del 13 %. */
	capital: number;
	conRepresentante: boolean;
	/** Cierre cargado antes de las tarjetas: sus aportes se conservan mientras no se active ninguna. */
	anteriores?: { representante: number; legalistas: number } | null;
	/** Estado de pago de cada aporte (viene del cierre guardado). */
	pagos?: AportePago[];
}) {
	const calc = calcularAportes(value, capital, conRepresentante);
	// Las que tocan según de dónde sale el cierre. Si el cierre ya tenía guardada
	// otra válida (un 9 % en uno de negociación), se sigue mostrando.
	const baseOtro = porcentajesOtro(desdeNegociacion);
	const opcionesOtro =
		baseOtro.includes(value.otro.porcentaje) || !PORCENTAJES_OTRO.includes(value.otro.porcentaje)
			? baseOtro
			: [...baseOtro, value.otro.porcentaje];
	const usaAnteriores = !!anteriores && !algunaTarjetaActiva(value);
	const totales = usaAnteriores
		? {
				total: anteriores.representante + anteriores.legalistas,
				representante: anteriores.representante,
				legalistas: anteriores.legalistas,
			}
		: calc;

	return (
		<div className="border border-border rounded-xl p-5 space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
				<h4 className="font-semibold text-sm text-foreground">Aportes</h4>
				<p className="text-xs text-muted-foreground">
					Total <span className="font-semibold text-foreground">{ars(totales.total)}</span>
					{" · "}Representante {ars(totales.representante)}
					{" · "}Legalistas {ars(totales.legalistas)}
				</p>
			</div>

			{usaAnteriores && (
				<p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
					Este cierre tiene aportes cargados con el formato anterior ({ars(totales.total)}). Se
					conservan tal cual mientras no actives ninguna tarjeta; si activás alguna, se reemplazan
					por lo que cargues acá.
				</p>
			)}

			<div className="grid gap-4 lg:grid-cols-3">
				<Tarjeta
					id="aporte-capital"
					titulo={`${pct(PORCENTAJE_CAPITAL)} sobre el capital`}
					detalle="Fijo, sobre el capital cerrado."
					activa={value.capital.activa}
					onActiva={(activa) => onChange({ ...value, capital: { ...value.capital, activa } })}
					calculo={calc.tarjetas.capital}
					representante={value.capital.representante}
					onRepresentante={(representante) =>
						onChange({ ...value, capital: { ...value.capital, representante } })
					}
					conRepresentante={conRepresentante}
					pagos={pagos.filter((p) => p.tarjeta === "capital")}
				>
					<Lectura label="Capital cerrado" valor={ars(capital)} />
				</Tarjeta>

				<Tarjeta
					id="aporte-caja"
					titulo={`${pct(PORCENTAJE_CAJA)} de la Caja`}
					detalle="Fijo, sobre el monto que cargues."
					activa={value.caja.activa}
					onActiva={(activa) => onChange({ ...value, caja: { ...value.caja, activa } })}
					calculo={calc.tarjetas.caja}
					representante={value.caja.representante}
					onRepresentante={(representante) =>
						onChange({ ...value, caja: { ...value.caja, representante } })
					}
					conRepresentante={conRepresentante}
					pagos={pagos.filter((p) => p.tarjeta === "caja")}
				>
					<Monto
						id="aporte-caja-base"
						label="Se aplica sobre ($)"
						value={value.caja.base}
						onChange={(base) => onChange({ ...value, caja: { ...value.caja, base } })}
					/>
				</Tarjeta>

				<Tarjeta
					id="aporte-otro"
					titulo={porcentajesOtro(desdeNegociacion).map(pct).join(" o ")}
					detalle="Elegís el porcentaje y el monto."
					activa={value.otro.activa}
					onActiva={(activa) => onChange({ ...value, otro: { ...value.otro, activa } })}
					calculo={calc.tarjetas.otro}
					representante={value.otro.representante}
					onRepresentante={(representante) =>
						onChange({ ...value, otro: { ...value.otro, representante } })
					}
					conRepresentante={conRepresentante}
					pagos={pagos.filter((p) => p.tarjeta === "otro")}
				>
					<div className="space-y-1">
						<span className="text-xs text-muted-foreground">Porcentaje</span>
						<div className="grid grid-cols-2 gap-2">
							{opcionesOtro.map((p) => (
								<button
									key={p}
									type="button"
									aria-pressed={value.otro.porcentaje === p}
									onClick={() => onChange({ ...value, otro: { ...value.otro, porcentaje: p } })}
									className={cn(
										"h-10 rounded-lg border text-sm transition-colors",
										value.otro.porcentaje === p
											? "border-primary bg-primary/10 font-medium text-primary"
											: "border-border bg-background text-muted-foreground hover:bg-muted",
									)}
								>
									{pct(p)}
								</button>
							))}
						</div>
					</div>
					<Monto
						id="aporte-otro-base"
						label="Se aplica sobre ($)"
						value={value.otro.base}
						onChange={(base) => onChange({ ...value, otro: { ...value.otro, base } })}
					/>
				</Tarjeta>
			</div>

			<p className="text-xs text-muted-foreground">
				Los aportes de Legalistas se descuentan de Honorarios (HP), no de PCL.{" "}
				{conRepresentante
					? "Lo que aporta el representante se carga a mano (no sigue el porcentaje de HP y PCL) y se le descuenta de su parte cuando Legalistas se la paga."
					: "Sin representante, todo el aporte es de Legalistas."}
			</p>
		</div>
	);
}
