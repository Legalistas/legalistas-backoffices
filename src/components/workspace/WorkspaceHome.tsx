"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Check, Lock, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GroupAvatar } from "@/components/shared/GroupAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	dayOf,
	errorMessage,
	firstName,
	formatDay,
	greeting,
	projectColor,
	todayKey,
	workspaceFetch,
} from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkHome, WorkHomeProject, WorkMyTask } from "@/types/workspace";
import { CompleteToggle } from "./CompleteToggle";
import { NewProjectDialog } from "./NewProjectDialog";
import { NewTaskDialog } from "./NewTaskDialog";
import { ProjectIcon } from "./ProjectLook";

type Tab = "upcoming" | "late" | "done";

function Panel({
	title,
	icon,
	children,
	className,
}: {
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("flex flex-col rounded-2xl border border-border bg-card dark:bg-board-column", className)}>
			<header className="flex items-center gap-3 px-5 pt-5 pb-3">
				{icon}
				<h2 className="text-lg font-semibold">{title}</h2>
			</header>
			{children}
		</section>
	);
}

function TaskRow({ task, late, onToggle }: { task: WorkMyTask; late: boolean; onToggle: () => void }) {
	const done = !!task.completedAt;
	return (
		<li className="flex items-center gap-3 border-t border-border px-5 py-2.5 first:border-t-0 hover:bg-muted/40">
			<CompleteToggle
				done={done}
				onClick={onToggle}
				label={done ? `Reabrir "${task.title}"` : `Completar "${task.title}"`}
			/>
			<Link
				href={`/admin/workspace/projects/${task.project.id}?task=${task.id}`}
				className={cn("min-w-0 flex-1 truncate text-sm hover:underline", done && "text-muted-foreground")}
			>
				{task.title}
			</Link>
			<span className="hidden max-w-36 shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs sm:inline-flex">
				<span
					className="size-2 shrink-0 rounded-sm"
					style={{ backgroundColor: projectColor(task.project) }}
					aria-hidden
				/>
				<span className="truncate">{task.project.name}</span>
			</span>
			<span
				className={cn(
					"flex w-12 shrink-0 justify-end text-xs tabular-nums text-muted-foreground",
					late && "font-medium text-red-600 dark:text-red-400",
				)}
			>
				{task.dueDate ? (
					formatDay(task.dueDate)
				) : (
					<CalendarDays className="size-4 opacity-50" aria-label="Sin fecha" />
				)}
			</span>
		</li>
	);
}

function ProjectTile({ project }: { project: WorkHomeProject }) {
	return (
		<Link
			href={`/admin/workspace/projects/${project.id}`}
			className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary"
		>
			<span
				className="grid size-12 shrink-0 place-items-center rounded-xl text-white shadow-[0_2px_6px_-2px_rgba(15,23,42,0.35)]"
				style={{ backgroundColor: projectColor(project) }}
				aria-hidden
			>
				<ProjectIcon icon={project.icon} className="size-6" />
			</span>
			<span className="min-w-0">
				<span className="flex items-center gap-1.5">
					<span className="truncate text-sm font-semibold">{project.name}</span>
					{project.privacy === "PRIVATE" && (
						<Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Privado" />
					)}
				</span>
				<span className="block truncate text-xs text-muted-foreground">
					{project.team?.name ?? "Sin equipo"} · {project.openTasks}{" "}
					{project.openTasks === 1 ? "abierta" : "abiertas"}
				</span>
			</span>
		</Link>
	);
}

export default function WorkspaceHome() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const myId = Number(session?.user?.id) || null;
	const [home, setHome] = useState<WorkHome | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>("upcoming");
	const [newProjectOpen, setNewProjectOpen] = useState(false);
	const [newTaskOpen, setNewTaskOpen] = useState(false);

	const load = useCallback(async () => {
		if (!token) return;
		try {
			setHome(await workspaceFetch<WorkHome>("/home", token));
		} catch (e) {
			setError(errorMessage(e, "No se pudo cargar el espacio de trabajo"));
		}
	}, [token]);

	useEffect(() => {
		load();
	}, [load]);

	const today = todayKey();
	const lists = useMemo(() => {
		const open = home?.myTasks ?? [];
		const isLate = (t: WorkMyTask) => {
			const d = dayOf(t.dueDate);
			return !!d && d < today;
		};
		return {
			upcoming: open.filter((t) => !isLate(t)),
			late: open.filter(isLate),
			done: home?.myDone ?? [],
		};
	}, [home, today]);

	const toggle = async (task: WorkMyTask) => {
		try {
			await workspaceFetch(`/tasks/${task.id}`, token, {
				method: "PATCH",
				json: { completed: !task.completedAt },
			});
			if (!task.completedAt) toast.success("Tarea finalizada");
			load();
		} catch (e) {
			toast.error(errorMessage(e, "No se pudo actualizar la tarea"));
		}
	};

	const creatableTeams = (home?.teams ?? []).filter((t) => t.canCreateProject);
	const tabs: { key: Tab; label: string }[] = [
		{ key: "upcoming", label: "Próximas" },
		{ key: "late", label: `Con retraso${lists.late.length ? ` (${lists.late.length})` : ""}` },
		{ key: "done", label: "Finalizadas" },
	];
	const shown = lists[tab];

	if (error) return <p className="py-16 text-center text-sm text-muted-foreground">{error}</p>;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-sm text-muted-foreground first-letter:uppercase">
						{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
					</p>
					<h1 className="text-3xl font-semibold text-balance">
						{greeting()}
						{session?.user?.name ? `, ${firstName(session.user.name)}` : ""}
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{home && home.orgs.length > 0 && (
						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-full bg-muted/70 px-4 py-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">Mi semana</span>
							<span className="inline-flex items-center gap-1.5 tabular-nums">
								<Check className="size-4" />
								{home.summary.doneThisWeek}{" "}
								{home.summary.doneThisWeek === 1 ? "tarea finalizada" : "tareas finalizadas"}
							</span>
							<span className="inline-flex items-center gap-1.5 tabular-nums">
								<Users className="size-4" />
								{home.summary.collaborators}{" "}
								{home.summary.collaborators === 1 ? "colaborador" : "colaboradores"}
							</span>
						</div>
					)}
					{home && home.orgs.length > 0 && (
						<Button variant="outline" asChild>
							<Link href="/admin/workspace/teams">
								<Users className="size-4" />
								Equipos y personas
							</Link>
						</Button>
					)}
				</div>
			</header>

			{!home ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Skeleton className="h-96 rounded-2xl" />
					<Skeleton className="h-96 rounded-2xl" />
				</div>
			) : home.orgs.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
					<p className="font-medium">Todavía no estás en ningún equipo</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Pedile a Sistemas o a la dirección que te sumen a un equipo del espacio de trabajo.
					</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
						<Panel
							title="Mis tareas"
							icon={
								<GroupAvatar
									size="md"
									users={[{ name: session?.user?.name ?? undefined, image: session?.user?.image ?? undefined }]}
								/>
							}
						>
							<div role="tablist" aria-label="Mis tareas" className="flex gap-1 border-b border-border px-5">
								{tabs.map((t) => (
									<button
										key={t.key}
										type="button"
										role="tab"
										aria-selected={tab === t.key}
										onClick={() => setTab(t.key)}
										className={cn(
											"-mb-px border-b-2 px-2.5 pb-2 text-sm font-medium transition-colors",
											tab === t.key
												? "border-primary text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground",
										)}
									>
										{t.label}
									</button>
								))}
							</div>
							{tab !== "done" && (
								<button
									type="button"
									onClick={() => setNewTaskOpen(true)}
									disabled={home.projects.length === 0}
									className="flex items-center gap-2 px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
								>
									<Plus className="size-4" />
									Crear tarea
								</button>
							)}
							<ul className="max-h-[22rem] min-h-40 overflow-y-auto border-t border-border [scrollbar-width:thin]">
								{shown.length === 0 ? (
									<li className="px-5 py-10 text-center text-sm text-muted-foreground">
										{tab === "late"
											? "No tenés tareas con retraso."
											: tab === "done"
												? "Todavía no finalizaste tareas en estas dos semanas."
												: "No tenés tareas próximas."}
									</li>
								) : (
									shown.map((t) => (
										<TaskRow key={t.id} task={t} late={tab === "late"} onToggle={() => toggle(t)} />
									))
								)}
							</ul>
						</Panel>

						<Panel title="Proyectos">
							<div className="grid max-h-[27rem] grid-cols-1 content-start gap-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin] sm:grid-cols-2">
								{creatableTeams.length > 0 && (
									<button
										type="button"
										onClick={() => setNewProjectOpen(true)}
										className="flex items-center gap-3 rounded-xl p-2 text-left text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
									>
										<span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-dashed border-muted-foreground/40">
											<Plus className="size-5" />
										</span>
										Crear proyecto
									</button>
								)}
								{home.projects.map((p) => (
									<ProjectTile key={p.id} project={p} />
								))}
							</div>
						</Panel>
					</div>

					{home.people.length > 0 && (
						<Panel title="Personas">
							<ul className="pb-2">
								{home.people.map((p) => (
									<li
										key={p.id}
										className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-2.5 first:border-t-0"
									>
										<GroupAvatar size="sm" users={[{ name: p.name ?? undefined, image: p.image ?? undefined }]} />
										<span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
										<span className="flex gap-4 text-xs tabular-nums text-muted-foreground">
											<span className={cn(p.overdue > 0 && "font-medium text-red-600 dark:text-red-400")}>
												{p.overdue} con retraso
											</span>
											<span>{p.done} finalizadas</span>
											<span>{p.upcoming} próximas</span>
										</span>
									</li>
								))}
							</ul>
						</Panel>
					)}
				</>
			)}

			<NewProjectDialog
				teams={newProjectOpen ? creatableTeams : null}
				token={token}
				onOpenChange={(open) => !open && setNewProjectOpen(false)}
			/>
			<NewTaskDialog
				open={newTaskOpen}
				projects={home?.projects ?? []}
				token={token}
				myId={myId}
				onOpenChange={setNewTaskOpen}
				onCreated={load}
			/>
		</div>
	);
}
