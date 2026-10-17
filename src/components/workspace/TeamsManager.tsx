"use client";

import { ArrowLeft, ChevronDown, Lock, Plus, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/useConfirm";
import { errorMessage, workspaceFetch } from "@/lib/workspace-api";
import type {
	WorkCandidate,
	WorkHome,
	WorkStructure,
	WorkStructureTeam,
	WorkTeamRole,
} from "@/types/workspace";
import { NewProjectDialog } from "./NewProjectDialog";

const ROLE_LABEL: Record<WorkTeamRole, string> = { ADMIN: "Administra", MEMBER: "Miembro" };

/** Searches firm accounts (server side) and adds the chosen one to the team. */
function AddPerson({
	orgId,
	team,
	token,
	onAdd,
}: {
	orgId: number;
	team: WorkStructureTeam;
	token: string | undefined;
	onAdd: (userId: number) => void;
}) {
	const [q, setQ] = useState("");
	const [results, setResults] = useState<WorkCandidate[]>([]);

	useEffect(() => {
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
	}, [q, orgId, token]);

	const inTeam = new Set(team.members.map((m) => m.user.id));
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm">
					<UserPlus className="size-4" />
					Sumar persona
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<Command shouldFilter={false}>
					<CommandInput placeholder="Nombre..." value={q} onValueChange={setQ} />
					<CommandList>
						<CommandEmpty>Nadie con ese nombre.</CommandEmpty>
						<CommandGroup>
							{results
								.filter((p) => !inTeam.has(p.id))
								.map((p) => (
									<CommandItem key={p.id} value={String(p.id)} onSelect={() => onAdd(p.id)}>
										<div className="min-w-0">
											<p className="truncate text-sm">{p.name ?? "Sin nombre"}</p>
											<p className="truncate text-xs text-muted-foreground">
												{p.orgRole === null
													? "Nuevo en el espacio de trabajo"
													: p.orgRole === "GUEST"
														? "Representante"
														: (p.email ?? "")}
											</p>
										</div>
									</CommandItem>
								))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default function TeamsManager() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const myId = Number(session?.user?.id) || null;
	const [orgId, setOrgId] = useState<number | null>(null);
	const [data, setData] = useState<WorkStructure | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [newTeamOpen, setNewTeamOpen] = useState(false);
	const [newTeamName, setNewTeamName] = useState("");
	const [newProjectTeam, setNewProjectTeam] = useState<WorkStructureTeam | null>(null);
	const { confirm, ConfirmationDialog } = useConfirm();

	// shortcut: uses the user's first organization; add a switcher when there is more than one.
	useEffect(() => {
		if (!token) return;
		workspaceFetch<WorkHome>("/home", token)
			.then((h) => (h.orgs[0] ? setOrgId(h.orgs[0].id) : setError("Todavía no estás en ningún equipo")))
			.catch((e) => setError(errorMessage(e, "No se pudo cargar")));
	}, [token]);

	const load = useCallback(async () => {
		if (!orgId || !token) return;
		try {
			setData(await workspaceFetch<WorkStructure>(`/orgs/${orgId}/structure`, token));
		} catch (e) {
			setError(errorMessage(e, "No se pudieron cargar los equipos"));
		}
	}, [orgId, token]);

	useEffect(() => {
		load();
	}, [load]);

	const act = async (fn: () => Promise<unknown>, ok: string) => {
		try {
			await fn();
			toast.success(ok);
			await load();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo guardar"));
		}
	};

	const setMember = (teamId: number, userId: number, role: WorkTeamRole, ok: string) =>
		act(
			() => workspaceFetch(`/teams/${teamId}/members`, token, { method: "PUT", json: { userId, role } }),
			ok,
		);

	const removeMember = async (team: WorkStructureTeam, user: { id: number; name: string | null }) => {
		const okd = await confirm({
			title: "Quitar del equipo",
			description: `${user.name ?? "Esta persona"} deja de ver los tableros de ${team.name}. Sus tareas quedan como están.`,
			confirmLabel: "Quitar",
			variant: "destructive",
		});
		if (okd) {
			act(
				() => workspaceFetch(`/teams/${team.id}/members/${user.id}`, token, { method: "DELETE" }),
				"Persona quitada del equipo",
			);
		}
	};

	const createTeam = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!orgId || !newTeamName.trim()) return;
		await act(
			() => workspaceFetch(`/orgs/${orgId}/teams`, token, { method: "POST", json: { name: newTeamName.trim() } }),
			"Equipo creado",
		);
		setNewTeamOpen(false);
		setNewTeamName("");
	};

	if (error) return <p className="py-16 text-center text-sm text-muted-foreground">{error}</p>;

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<header className="flex flex-wrap items-center gap-3">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/admin/workspace" aria-label="Volver al espacio de trabajo">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div className="min-w-0 flex-1">
					<h1 className="text-2xl font-semibold">Equipos y personas</h1>
					<p className="text-sm text-muted-foreground">
						Quién está en cada equipo y qué proyectos tiene. Quien administra un equipo puede sumar gente y crear
						proyectos.
					</p>
				</div>
				{data?.permissions.createTeam && (
					<Button onClick={() => setNewTeamOpen(true)}>
						<Plus className="size-4" />
						Nuevo equipo
					</Button>
				)}
			</header>

			{data && data.direction.length > 0 && (
				<section
					aria-labelledby="direccion"
					className="rounded-xl border border-border bg-card p-4 dark:bg-board-column"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h2 id="direccion" className="text-base font-semibold">
							Dirección
						</h2>
						<p className="text-xs text-muted-foreground">Ven y editan todos los equipos y tableros</p>
					</div>
					<ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
						{data.direction.map((m) => (
							<li key={m.user.id} className="flex items-center gap-2">
								<GroupAvatar size="sm" users={[{ name: m.user.name ?? undefined, image: m.user.image ?? undefined }]} />
								<span className="text-sm">{m.user.name}</span>
								<span className="text-xs text-muted-foreground">{m.role === "OWNER" ? "Dueño" : "Administra"}</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{!data ? (
				<div className="space-y-3">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
			) : (
				<div className="space-y-3">
					{data.teams.map((team) => (
						<Collapsible
							key={team.id}
							defaultOpen={team.members.length <= 12}
							className="rounded-xl border border-border bg-card dark:bg-board-column"
						>
							<div className="flex flex-wrap items-center gap-3 p-4">
								<CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary">
									<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
									<div className="min-w-0">
										<h2 className="truncate text-base font-semibold">{team.name}</h2>
										<p className="text-xs text-muted-foreground tabular-nums">
											{team.members.length} {team.members.length === 1 ? "persona" : "personas"} ·{" "}
											{team.projects.length} {team.projects.length === 1 ? "proyecto" : "proyectos"}
										</p>
									</div>
									<GroupAvatar
										max={5}
										className="ml-auto hidden sm:flex"
										users={team.members.map((m) => ({
											name: m.user.name ?? undefined,
											image: m.user.image ?? undefined,
										}))}
									/>
								</CollapsibleTrigger>
								{team.permissions.manageMembers && orgId && (
									<AddPerson
										orgId={orgId}
										team={team}
										token={token}
										onAdd={(userId) => setMember(team.id, userId, "MEMBER", "Persona sumada al equipo")}
									/>
								)}
							</div>
							<CollapsibleContent className="border-t border-border px-4 py-3">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
									<ul className="divide-y divide-border">
										{team.members.map((m) => (
											<li key={m.user.id} className="flex items-center gap-3 py-2">
												<GroupAvatar
													users={[{ name: m.user.name ?? undefined, image: m.user.image ?? undefined }]}
												/>
												<span className="min-w-0 flex-1 truncate text-sm">{m.user.name ?? "Sin nombre"}</span>
												{team.permissions.manageMembers ? (
													<>
														<Select
															value={m.role}
															onValueChange={(v) =>
																setMember(team.id, m.user.id, v as WorkTeamRole, "Rol actualizado")
															}
														>
															<SelectTrigger size="sm" className="w-32" aria-label={`Rol de ${m.user.name}`}>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
																<SelectItem value="MEMBER">{ROLE_LABEL.MEMBER}</SelectItem>
															</SelectContent>
														</Select>
														<Button
															variant="ghost"
															size="icon"
															className="size-8 text-muted-foreground hover:text-destructive"
															aria-label={`Quitar a ${m.user.name} del equipo`}
															disabled={m.user.id === myId}
															onClick={() => removeMember(team, m.user)}
														>
															<X className="size-4" />
														</Button>
													</>
												) : (
													<span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>
												)}
											</li>
										))}
									</ul>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<h3 className="text-xs font-semibold text-muted-foreground">Proyectos</h3>
											{team.permissions.createProject && (
												<Button
													variant="ghost"
													size="sm"
													className="h-7 px-2 text-xs text-muted-foreground"
													onClick={() => setNewProjectTeam(team)}
												>
													<Plus className="size-3.5" />
													Proyecto
												</Button>
											)}
										</div>
										{team.projects.length === 0 ? (
											<p className="text-xs text-muted-foreground">Sin proyectos todavía.</p>
										) : (
											<ul className="space-y-1">
												{team.projects.map((p) => (
													<li key={p.id}>
														<Link
															href={`/admin/workspace/projects/${p.id}`}
															className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
														>
															<span className="min-w-0 flex-1 truncate">{p.name}</span>
															{p.privacy === "PRIVATE" && (
																<Lock className="size-3.5 text-muted-foreground" aria-label="Privado" />
															)}
														</Link>
													</li>
												))}
											</ul>
										)}
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>
					))}
				</div>
			)}

			<Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
				<DialogContent className="sm:max-w-md">
					<form onSubmit={createTeam} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Nuevo equipo</DialogTitle>
							<DialogDescription>Quedás como administrador; después sumás a las personas.</DialogDescription>
						</DialogHeader>
						<div className="space-y-1.5">
							<Label htmlFor="team-name">Nombre</Label>
							<Input
								id="team-name"
								autoFocus
								value={newTeamName}
								onChange={(e) => setNewTeamName(e.target.value)}
								placeholder="Ej.: Dirección"
								maxLength={120}
							/>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={!newTeamName.trim()}>
								Crear equipo
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<NewProjectDialog
				teams={newProjectTeam ? [newProjectTeam] : null}
				token={token}
				onOpenChange={(open) => !open && setNewProjectTeam(null)}
			/>
			{ConfirmationDialog}
		</div>
	);
}
