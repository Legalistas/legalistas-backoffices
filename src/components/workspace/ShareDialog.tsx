"use client";

import { UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, workspaceFetch } from "@/lib/workspace-api";
import type { WorkCandidate, WorkPerson, WorkProjectAccess, WorkProjectRole } from "@/types/workspace";

const ROLE_LABEL: Record<WorkProjectRole, string> = {
	ADMIN: "Administra",
	EDITOR: "Edita",
	COMMENTER: "Comenta",
	VIEWER: "Solo ve",
};

interface Props {
	open: boolean;
	projectId: number;
	orgId: number;
	token: string | undefined;
	onOpenChange: (open: boolean) => void;
	/** Who sees the board changed: reload what depends on it. */
	onChanged: () => void;
}

function PersonRow({ user, children }: { user: WorkPerson; children: React.ReactNode }) {
	return (
		<li className="flex items-center gap-3 py-2">
			<GroupAvatar size="sm" users={[{ name: user.name ?? undefined, image: user.image ?? undefined }]} />
			<span className="min-w-0 flex-1 truncate text-sm">{user.name ?? "Sin nombre"}</span>
			{children}
		</li>
	);
}

/** "Compartir": who sees the board, and adding or removing people. */
export function ShareDialog({ open, projectId, orgId, token, onOpenChange, onChanged }: Props) {
	const [data, setData] = useState<WorkProjectAccess | null>(null);
	const [q, setQ] = useState("");
	const [results, setResults] = useState<WorkCandidate[]>([]);

	const load = useCallback(async () => {
		try {
			setData(await workspaceFetch<WorkProjectAccess>(`/projects/${projectId}/access`, token));
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo cargar quién ve el tablero"));
		}
	}, [projectId, token]);

	useEffect(() => {
		if (open) load();
	}, [open, load]);

	useEffect(() => {
		if (!open || !data?.permissions.manageMembers) return;
		let alive = true;
		const timer = setTimeout(() => {
			workspaceFetch<WorkCandidate[]>(`/orgs/${orgId}/people?q=${encodeURIComponent(q)}`, token)
				.then((r) => alive && setResults(r))
				.catch(() => alive && setResults([]));
		}, 200);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [q, open, orgId, token, data?.permissions.manageMembers]);

	const act = async (fn: () => Promise<unknown>, ok: string) => {
		try {
			await fn();
			toast.success(ok);
			await load();
			onChanged();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo guardar"));
		}
	};

	const setMember = (userId: number, role: WorkProjectRole, ok: string) =>
		act(() => workspaceFetch(`/projects/${projectId}/members`, token, { method: "PUT", json: { userId, role } }), ok);

	const manage = !!data?.permissions.manageMembers;
	const teamName = data?.project.team?.name;
	const withAccess = new Set([
		...(data?.members ?? []).map((m) => m.user.id),
		...(data?.team ?? []).map((m) => m.user.id),
	]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Compartir {data?.project.name ?? "tablero"}</DialogTitle>
					<DialogDescription>Quién ve este tablero y qué puede hacer.</DialogDescription>
				</DialogHeader>

				{!data ? (
					<Skeleton className="h-48" />
				) : (
					<div className="space-y-5">
						<div className="flex flex-wrap items-center gap-3">
							<span className="text-sm font-medium">Lo ven</span>
							<Select
								value={data.project.privacy}
								disabled={!data.permissions.edit}
								onValueChange={(v) =>
									act(
										() =>
											workspaceFetch(`/projects/${projectId}`, token, {
												method: "PATCH",
												json: { privacy: v },
											}),
										v === "PRIVATE"
											? "Ahora lo ven solo las personas agregadas"
											: "Ahora lo ve todo el equipo",
									)
								}
							>
								<SelectTrigger size="sm" className="w-64">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="TEAM">Todo el equipo{teamName ? ` ${teamName}` : ""}</SelectItem>
									<SelectItem value="PRIVATE">Solo las personas agregadas</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{manage && (
							<Popover>
								<PopoverTrigger asChild>
									<Button variant="outline" size="sm">
										<UserPlus className="size-4" />
										Agregar persona
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80 p-0" align="start">
									<Command shouldFilter={false}>
										<CommandInput placeholder="Nombre..." value={q} onValueChange={setQ} />
										<CommandList>
											<CommandEmpty>Nadie con ese nombre.</CommandEmpty>
											<CommandGroup>
												{results
													.filter((p) => !withAccess.has(p.id))
													.map((p) => (
														<CommandItem
															key={p.id}
															value={String(p.id)}
															onSelect={() => setMember(p.id, "EDITOR", "Persona agregada al tablero")}
														>
															<span className="truncate">{p.name ?? "Sin nombre"}</span>
														</CommandItem>
													))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						)}

						<section>
							<h3 className="text-xs font-semibold text-muted-foreground">
								Personas agregadas · {data.members.length}
							</h3>
							{data.members.length === 0 ? (
								<p className="py-2 text-sm text-muted-foreground">Nadie agregado a mano.</p>
							) : (
								<ul className="divide-y divide-border">
									{data.members.map((m) => (
										<PersonRow key={m.user.id} user={m.user}>
											{manage ? (
												<>
													<Select
														value={m.role}
														onValueChange={(v) => setMember(m.user.id, v as WorkProjectRole, "Rol actualizado")}
													>
														<SelectTrigger size="sm" className="w-32" aria-label={`Rol de ${m.user.name}`}>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{(Object.keys(ROLE_LABEL) as WorkProjectRole[]).map((r) => (
																<SelectItem key={r} value={r}>
																	{ROLE_LABEL[r]}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Button
														variant="ghost"
														size="icon"
														className="size-8 text-muted-foreground hover:text-destructive"
														aria-label={`Quitar a ${m.user.name} del tablero`}
														onClick={() =>
															act(
																() =>
																	workspaceFetch(`/projects/${projectId}/members/${m.user.id}`, token, {
																		method: "DELETE",
																	}),
																"Persona quitada del tablero",
															)
														}
													>
														<X className="size-4" />
													</Button>
												</>
											) : (
												<span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>
											)}
										</PersonRow>
									))}
								</ul>
							)}
						</section>

						{data.team.length > 0 && (
							<section>
								<h3 className="text-xs font-semibold text-muted-foreground">
									Por el equipo {teamName} · {data.team.length}
								</h3>
								<ul className="max-h-56 divide-y divide-border overflow-y-auto [scrollbar-width:thin]">
									{data.team.map((m) => (
										<PersonRow key={m.user.id} user={m.user}>
											<span className="text-xs text-muted-foreground">
												{m.role === "ADMIN" ? "Administra" : "Edita"}
											</span>
										</PersonRow>
									))}
								</ul>
								{manage && (
									<p className="mt-2 text-xs text-muted-foreground">
										Para que alguien del equipo deje de verlo, cambiá arriba a "Solo las personas agregadas" y
										quitalo de la lista.
									</p>
								)}
							</section>
						)}

						{data.orgAdmins.length > 0 && (
							<section>
								<h3 className="text-xs font-semibold text-muted-foreground">Dirección (ve todo)</h3>
								<ul className="divide-y divide-border">
									{data.orgAdmins.map((u) => (
										<PersonRow key={u.id} user={u}>
											<span className="text-xs text-muted-foreground">Ve todo</span>
										</PersonRow>
									))}
								</ul>
							</section>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
