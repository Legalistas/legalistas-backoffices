"use client";

import { Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Caja } from "@/types/caja";
import { formatARS } from "./api";

interface CajasGridProps {
	cajas: Caja[];
	selectedId: number | null;
	onSelect: (id: number) => void;
	/** Solo admins: lápiz para editar nombre / saldo inicial. */
	onEdit?: (caja: Caja) => void;
}

function EditButton({
	caja,
	onEdit,
	className,
}: {
	caja: Caja;
	onEdit: (c: Caja) => void;
	className?: string;
}) {
	return (
		<Button
			variant="ghost"
			size="icon"
			title={`Editar ${caja.nombre}`}
			className={cn("h-7 w-7 text-muted-foreground", className)}
			onClick={() => onEdit(caja)}
		>
			<Pencil className="h-3.5 w-3.5" />
		</Button>
	);
}

function Saldo({ valor, className }: { valor: number; className?: string }) {
	return (
		<span className={cn("tabular-nums", valor < 0 && "text-red-600", className)}>
			{formatARS(valor)}
		</span>
	);
}

function MesResumen({ caja }: { caja: Caja }) {
	return (
		<p className="text-xs text-muted-foreground">
			Este mes:{" "}
			<span className="text-emerald-600 tabular-nums">+{formatARS(caja.ingresosMes)}</span>{" "}
			<span className="text-red-600 tabular-nums">−{formatARS(caja.egresosMes)}</span>
		</p>
	);
}

/** Tarjetas de cajas. Las contenedoras (Caja Principal) listan sus sub-cajas. */
export default function CajasGrid({ cajas, selectedId, onSelect, onEdit }: CajasGridProps) {
	if (cajas.length === 0) {
		return <p className="text-sm text-muted-foreground">No hay cajas en este grupo.</p>;
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{cajas.map((caja) => (
				<Card
					key={caja.id}
					className={cn(
						"relative gap-0 py-0 transition-shadow",
						selectedId === caja.id && "ring-2 ring-primary",
					)}
				>
					<button
						type="button"
						onClick={() => onSelect(caja.id)}
						className="w-full rounded-t-xl p-5 text-left hover:bg-muted/40"
					>
						<div className="flex items-start justify-between gap-2">
							<p className="font-medium">{caja.nombre}</p>
							{caja.owner && (
								<span className="flex items-center gap-1 text-xs text-muted-foreground">
									<User className="h-3 w-3" />
									{caja.owner.name}
								</span>
							)}
						</div>
						<Saldo valor={caja.saldo} className="mt-2 block text-2xl font-semibold" />
						<div className="mt-1">
							<MesResumen caja={caja} />
						</div>
					</button>
					{onEdit && (
						<EditButton caja={caja} onEdit={onEdit} className="absolute right-3 bottom-3" />
					)}

					{caja.esContenedora && (
						<CardContent className="space-y-1 border-t px-2 py-2">
							{caja.hijas.map((h) => (
								<div key={h.id} className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => onSelect(h.id)}
										className={cn(
											"flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60",
											selectedId === h.id && "bg-muted font-medium",
										)}
									>
										<span>{h.nombre}</span>
										<Saldo valor={h.saldo} />
									</button>
									{onEdit && <EditButton caja={h} onEdit={onEdit} />}
								</div>
							))}
						</CardContent>
					)}
				</Card>
			))}
		</div>
	);
}
