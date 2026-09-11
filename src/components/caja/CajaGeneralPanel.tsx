"use client";

import { Fragment, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CAJA_GRUPO_LABEL } from "@/constant/caja";
import { cn } from "@/lib/utils";
import type { Caja, CajaGrupo, CajaResumen, CajaTotales } from "@/types/caja";
import { cajaFetch, finDeMes, formatARS } from "./api";

const Monto = ({ valor, className }: { valor: number; className?: string }) => (
	<span className={cn("tabular-nums", valor < 0 && "text-red-600", className)}>
		{formatARS(valor)}
	</span>
);

const nombreMes = (mes: string) => {
	const [y, m] = mes.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

/** Primer día de los 6 meses que terminan en `mes` (YYYY-MM). */
const inicioSeisMeses = (mes: string) => {
	const [y, m] = mes.split("-").map(Number);
	const d = new Date(y, m - 6, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/** Caja General: saldo de cada caja por grupo, resultado por mes y por rubro. */
export default function CajaGeneralPanel({
	cajas,
	general,
	mes,
	token,
	version,
}: {
	cajas: Caja[];
	general: CajaTotales;
	/** YYYY-MM elegido: el resumen muestra los 6 meses que terminan en él. */
	mes: string;
	token: string | undefined;
	version: number;
}) {
	const [resumen, setResumen] = useState<CajaResumen | null>(null);

	useEffect(() => {
		if (!token) return;
		const params = new URLSearchParams({ desde: inicioSeisMeses(mes), hasta: finDeMes(mes) });
		cajaFetch<{ data: CajaResumen }>(`/resumen?${params}`, token)
			.then((r) => setResumen(r.data))
			.catch((e) => console.error("[Caja] Error cargando resumen:", e));
	}, [token, mes, version]);

	const grupos = (Object.keys(CAJA_GRUPO_LABEL) as CajaGrupo[])
		.map((g) => ({ grupo: g, cajas: cajas.filter((c) => c.grupo === g) }))
		.filter((g) => g.cajas.length > 0);

	return (
		<div className="grid gap-6 xl:grid-cols-2">
			<Card className="xl:row-span-2">
				<CardHeader>
					<CardTitle className="text-base">Saldo por caja</CardTitle>
					<CardDescription>La Caja General es la suma de todas las cajas.</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow>
								<TableHead>Caja</TableHead>
								<TableHead className="text-right">Saldo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{grupos.map(({ grupo, cajas: delGrupo }) => (
								<Fragment key={grupo}>
									{delGrupo.map((c) => (
										<Fragment key={c.id}>
											<TableRow>
												<TableCell className={cn(c.esContenedora && "font-medium")}>
													{c.nombre}
												</TableCell>
												<TableCell className="text-right">
													<Monto valor={c.saldo} className={cn(c.esContenedora && "font-medium")} />
												</TableCell>
											</TableRow>
											{c.hijas.map((h) => (
												<TableRow key={h.id} className="text-muted-foreground">
													<TableCell className="pl-8">{h.nombre}</TableCell>
													<TableCell className="text-right">
														<Monto valor={h.saldo} />
													</TableCell>
												</TableRow>
											))}
										</Fragment>
									))}
									<TableRow className="bg-muted/30">
										<TableCell className="font-medium">
											Subtotal {CAJA_GRUPO_LABEL[grupo].toLowerCase()}
										</TableCell>
										<TableCell className="text-right font-medium">
											<Monto valor={delGrupo.reduce((s, c) => s + c.saldo, 0)} />
										</TableCell>
									</TableRow>
								</Fragment>
							))}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell className="font-semibold">Caja General</TableCell>
								<TableCell className="text-right font-semibold">
									<Monto valor={general.saldo} />
								</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Resultado por mes</CardTitle>
					<CardDescription>
						6 meses hasta <span className="capitalize">{nombreMes(mes)}</span>, sin transferencias
						entre cajas.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{!resumen ? (
						<Skeleton className="h-32 w-full" />
					) : (
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead>Mes</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Egresos</TableHead>
									<TableHead className="text-right">Diferencia</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{resumen.porMes.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
											Sin movimientos en el período
										</TableCell>
									</TableRow>
								) : (
									resumen.porMes.map((f) => (
										<TableRow key={f.mes}>
											<TableCell className="capitalize">{nombreMes(f.mes)}</TableCell>
											<TableCell className="text-right tabular-nums text-emerald-600">
												{formatARS(f.ingresos)}
											</TableCell>
											<TableCell className="text-right tabular-nums text-red-600">
												{formatARS(f.egresos)}
											</TableCell>
											<TableCell className="text-right font-medium">
												<Monto valor={f.ingresos - f.egresos} />
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Por rubro</CardTitle>
					<CardDescription>Mismo período.</CardDescription>
				</CardHeader>
				<CardContent>
					{!resumen ? (
						<Skeleton className="h-32 w-full" />
					) : (
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead>Rubro</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Egresos</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{resumen.porRubro.length === 0 ? (
									<TableRow>
										<TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
											Sin movimientos en el período
										</TableCell>
									</TableRow>
								) : (
									resumen.porRubro.map((r) => (
										<TableRow key={`${r.tipo}-${r.rubroId}`}>
											<TableCell>{r.nombre}</TableCell>
											<TableCell className="text-right tabular-nums text-emerald-600">
												{r.tipo === "INGRESO" ? formatARS(r.total) : ""}
											</TableCell>
											<TableCell className="text-right tabular-nums text-red-600">
												{r.tipo === "EGRESO" ? formatARS(r.total) : ""}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
