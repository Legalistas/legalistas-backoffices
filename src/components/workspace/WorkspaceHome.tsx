"use client";

import { addDays, format } from "date-fns";
import { CalendarDays, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { dayOf, errorMessage, formatDay, PRIORITY_LABEL, todayKey, workspaceFetch } from "@/lib/workspace-api";
import { cn } from "@/lib/utils";
import type { WorkHome, WorkHomeProject, WorkMyTask } from "@/types/workspace";

type Bucket = { key: string; label: string; tasks: WorkMyTask[] };

/** Vencidas, hoy, próximos 7 días, más adelante y sin fecha. */
function bucketize(tasks: WorkMyTask[]): Bucket[] {
	const today = todayKey();
	const week = format(addDays(new Date(), 7), "yyyy-MM-dd");
	const buckets: Bucket[] = [
		{ key: "late", label: "Vencidas", tasks: [] },
		{ key: "today", label: "Hoy", tasks: [] },
		{ key: "week", label: "Próximos 7 días", tasks: [] },
		{ key: "later", label: "Más adelante", tasks: [] },
		{ key: "none", label: "Sin fecha", tasks: [] },
	];
	for (const t of tasks) {
		const d = dayOf(t.dueDate);
		const i = !d ? 4 : d < today ? 0 : d === today ? 1 : d <= week ? 2 : 3;
		buckets[i].tasks.push(t);
	}
	return buckets.filter((b) => b.tasks.length > 0);
}

function MyTaskRow({ task, late }: { task: WorkMyTask; late: boolean }) {
	return (
		<li>
			<Link
				href={`/admin/workspace/projects/${task.project.id}?task=${task.id}`}
				className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary"
			>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium">{task.title}</p>
					<p className="truncate text-xs text-muted-foreground">
						{task.project.name}
						{task.column ? ` · ${task.column.name}` : task.parentTaskId ? " · subtarea" : ""}
					</p>
				</div>
				{(task.priority === "HIGH" || task.priority === "URGENT") && (
					<span
						className={cn(
							"shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
							task.priority === "URGENT"
								? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
								: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
						)}
					>
						{PRIORITY_LABEL[task.priority]}
					</span>
				)}
				{task.dueDate && (
					<span
						className={cn(
							"inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground",
							late && "font-medium text-red-600 dark:text-red-400",
						)}
					>
						<CalendarDays className="size-3.5" />
						{formatDay(task.dueDate)}
					</span>
				)}
			</Link>
		</li>
	);
}

function ProjectRow({ project }: { project: WorkHomeProject }) {
	return (
		<li>
			<Link
				href={`/admin/workspace/projects/${project.id}`}
				className="group flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary"
			>
				<span
					className="size-2.5 shrink-0 rounded-full bg-primary/70"
					style={project.color ? { backgroundColor: project.color } : undefined}
					aria-hidden
				/>
				<span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
				{project.privacy === "PRIVATE" && <Lock className="size-3.5 text-muted-foreground" aria-label="Privado" />}
				<span className="text-xs text-muted-foreground tabular-nums">
					{project.openTasks} {project.openTasks === 1 ? "abierta" : "abiertas"}
				</span>
				<ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
			</Link>
		</li>
	);
}

export default function WorkspaceHome() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [home, setHome] = useState<WorkHome | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!token) return;
		workspaceFetch<WorkHome>("/home", token)
			.then(setHome)
			.catch((e) => setError(errorMessage(e, "No se pudo cargar el espacio de trabajo")));
	}, [token]);

	const buckets = useMemo(() => bucketize(home?.myTasks ?? []), [home]);
	const teams = useMemo(() => {
		const groups = new Map<string, WorkHomeProject[]>();
		for (const p of home?.projects ?? []) {
			const key = p.team?.name ?? "Sin equipo";
			groups.set(key, [...(groups.get(key) ?? []), p]);
		}
		return [...groups.entries()];
	}, [home]);

	if (error) return <p className="py-16 text-center text-sm text-muted-foreground">{error}</p>;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Mi trabajo</h1>
				<p className="text-sm text-muted-foreground">
					Tus tareas abiertas y los tableros de tus equipos.
				</p>
			</header>

			{!home ? (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
					<Skeleton className="h-80" />
					<Skeleton className="h-80" />
				</div>
			) : home.orgs.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
					<p className="font-medium">Todavía no estás en ningún equipo</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Pedile a Sistemas o a la dirección que te sumen a un equipo del espacio de trabajo.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
					<section className="rounded-xl border border-border bg-card p-4" aria-labelledby="mis-tareas">
						<h2 id="mis-tareas" className="px-2 pb-2 text-base font-semibold">
							Mis tareas
							<span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
								{home.myTasks.length}
							</span>
						</h2>
						{buckets.length === 0 ? (
							<p className="px-2 py-10 text-center text-sm text-muted-foreground">
								No tenés tareas abiertas asignadas. Entrá a un tablero para crear o tomar una.
							</p>
						) : (
							<div className="space-y-4">
								{buckets.map((b) => (
									<div key={b.key}>
										<h3
											className={cn(
												"px-2 pb-1 text-xs font-semibold text-muted-foreground",
												b.key === "late" && "text-red-600 dark:text-red-400",
											)}
										>
											{b.label} · {b.tasks.length}
										</h3>
										<ul>
											{b.tasks.map((t) => (
												<MyTaskRow key={t.id} task={t} late={b.key === "late"} />
											))}
										</ul>
									</div>
								))}
							</div>
						)}
					</section>

					<section className="rounded-xl border border-border bg-card p-4" aria-labelledby="tableros">
						<h2 id="tableros" className="px-2 pb-2 text-base font-semibold">
							Tableros
						</h2>
						<div className="space-y-4">
							{teams.map(([team, projects]) => (
								<div key={team}>
									<h3 className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{team}</h3>
									<ul>
										{projects.map((p) => (
											<ProjectRow key={p.id} project={p} />
										))}
									</ul>
								</div>
							))}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}
