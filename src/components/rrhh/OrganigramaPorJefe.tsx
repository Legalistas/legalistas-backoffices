"use client";

import { ChevronDown, ChevronRight, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { segmentoDe } from "@/constant/rrhh";
import { getRoleIdentifier, isInternalTeamMember } from "@/constant/team";
import type { User } from "@/types/users";

// Organigrama real: cada persona cuelga de quien figura en "Reporta a"
// (Datos laborales). Quien no tiene jefe y tiene gente a cargo es una raíz;
// el resto del equipo sin ubicar se lista abajo para completarlo.

interface Nodo {
	id: number;
	nombre: string;
	puesto: string;
	image: string | null;
	representante: boolean;
	hijos: Nodo[];
}

const iniciales = (nombre: string) => {
	const partes = nombre.trim().split(/\s+/).filter(Boolean);
	if (partes.length === 0) return "?";
	if (partes.length === 1) return partes[0][0]?.toUpperCase() ?? "?";
	return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const contar = (n: Nodo): number => n.hijos.reduce((s, h) => s + 1 + contar(h), 0);

function Tarjeta({ n, onOpen }: { n: Nodo; onOpen: (id: number) => void }) {
	return (
		<button
			type="button"
			onClick={() => onOpen(n.id)}
			className="flex w-56 items-center gap-2 rounded-lg border border-border bg-card p-2 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
		>
			<Avatar className="h-8 w-8">
				{n.image && <AvatarImage src={n.image} alt={n.nombre} />}
				<AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
					{iniciales(n.nombre)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<p className="truncate text-xs font-semibold text-foreground">{n.nombre}</p>
				<p className="truncate text-[11px] text-muted-foreground">{n.puesto}</p>
				{n.representante && (
					<Badge variant="outline" className="mt-0.5 h-4 px-1 text-[9px]">
						Representante
					</Badge>
				)}
			</div>
		</button>
	);
}

function Rama({ n, nivel, onOpen }: { n: Nodo; nivel: number; onOpen: (id: number) => void }) {
	const [abierta, setAbierta] = useState(nivel < 2 || n.hijos.length <= 4);
	return (
		<li className="organigrama-rama">
			<div className="flex flex-col items-center">
				<Tarjeta n={n} onOpen={onOpen} />
				{n.hijos.length > 0 && (
					<button
						type="button"
						onClick={() => setAbierta((a) => !a)}
						className="mt-1 inline-flex items-center gap-0.5 rounded-full border border-border bg-background px-2 text-[10px] text-muted-foreground hover:text-foreground"
					>
						{abierta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
						{contar(n)} a cargo
					</button>
				)}
			</div>
			{abierta && n.hijos.length > 0 && (
				<ul>
					{n.hijos.map((h) => (
						<Rama key={h.id} n={h} nivel={nivel + 1} onOpen={onOpen} />
					))}
				</ul>
			)}
		</li>
	);
}

export default function OrganigramaPorJefe({
	users,
	onOpen,
}: {
	users: User[];
	onOpen: (id: number) => void;
}) {
	const { raices, sinUbicar } = useMemo(() => {
		// Con ficha laboral entra siempre (aunque su rol no sea de los del equipo).
		const equipo = users.filter(
			(u) =>
				(u.employment || isInternalTeamMember(u)) &&
				!u.isBlocked &&
				u.employment?.status !== "TERMINATED",
		);
		const conFicha = equipo.filter((u) => u.employment);
		const ids = new Set(conFicha.map((u) => u.id));
		const hijosDe = new Map<number, User[]>();
		for (const u of conFicha) {
			const jefe = u.employment?.jefeId;
			if (jefe && ids.has(jefe) && jefe !== u.id) {
				hijosDe.set(jefe, [...(hijosDe.get(jefe) ?? []), u]);
			}
		}
		const armar = (u: User, visitados: Set<number>): Nodo => {
			visitados.add(u.id);
			const role = u.roleUser?.[0]?.role;
			return {
				id: u.id,
				nombre: u.name,
				puesto: u.employment?.position || role?.displayName || role?.name || "",
				image: u.image ?? null,
				representante: segmentoDe(u.employment?.segmento, getRoleIdentifier(u)) === "REPRESENTANTE",
				hijos: (hijosDe.get(u.id) ?? [])
					.filter((h) => !visitados.has(h.id))
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((h) => armar(h, visitados)),
			};
		};
		const visitados = new Set<number>();
		const raices = conFicha
			.filter((u) => {
				const jefe = u.employment?.jefeId;
				return (!jefe || !ids.has(jefe)) && hijosDe.has(u.id);
			})
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((u) => armar(u, visitados));
		const sinUbicar = equipo
			.filter((u) => !visitados.has(u.id))
			.sort((a, b) => a.name.localeCompare(b.name));
		return { raices, sinUbicar };
	}, [users]);

	return (
		<div className="space-y-6">
			<style>{`
				.organigrama ul { display: flex; justify-content: center; padding-top: 16px; position: relative; }
				.organigrama li { list-style: none; position: relative; padding: 16px 6px 0; display: flex; flex-direction: column; align-items: center; }
				.organigrama li::before, .organigrama li::after { content: ""; position: absolute; top: 0; right: 50%; width: 50%; height: 16px; border-top: 1px solid var(--border); }
				.organigrama li::after { right: auto; left: 50%; border-left: 1px solid var(--border); }
				.organigrama li:only-child::before, .organigrama li:only-child::after { display: none; }
				.organigrama li:only-child { padding-top: 0; }
				.organigrama li:first-child::before, .organigrama li:last-child::after { border: 0 none; }
				.organigrama li:last-child::before { border-right: 1px solid var(--border); border-radius: 0 6px 0 0; }
				.organigrama li:first-child::after { border-radius: 6px 0 0 0; }
				.organigrama ul ul::before { content: ""; position: absolute; top: 0; left: 50%; height: 16px; border-left: 1px solid var(--border); }
				.organigrama > ul { padding-top: 0; }
			`}</style>

			{raices.length === 0 ? (
				<div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
					<p className="text-sm font-medium text-foreground">Todavía no hay jefes cargados</p>
					<p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
						Completá "Reporta a" en Datos laborales de cada persona (Ficha RRHH) y el organigrama se
						arma solo.
					</p>
				</div>
			) : (
				<div className="organigrama overflow-x-auto pb-4">
					<ul>
						{raices.map((r) => (
							<Rama key={r.id} n={r} nivel={0} onOpen={onOpen} />
						))}
					</ul>
				</div>
			)}

			{sinUbicar.length > 0 && (
				<div className="rounded-lg border border-border p-4">
					<div className="mb-2 flex items-center gap-2">
						<UserX className="h-4 w-4 text-muted-foreground" />
						<p className="text-sm font-medium text-foreground">Sin ubicar ({sinUbicar.length})</p>
					</div>
					<p className="mb-3 text-xs text-muted-foreground">
						No tienen ficha laboral o no tienen "Reporta a" cargado. Abrí su ficha para completarlo.
					</p>
					<div className="flex flex-wrap gap-2">
						{sinUbicar.map((u) => (
							<button
								key={u.id}
								type="button"
								onClick={() => onOpen(u.id)}
								className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/40"
							>
								{u.name}
								{!u.employment && <span className="ml-1 text-muted-foreground">(sin ficha)</span>}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
