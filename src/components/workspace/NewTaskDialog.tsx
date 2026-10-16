"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage, projectColor, workspaceFetch } from "@/lib/workspace-api";

interface Props {
	open: boolean;
	projects: { id: number; name: string; color: string | null }[];
	token: string | undefined;
	myId: number | null;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
}

/** "Crear tarea" from the home: goes to the first column of the chosen project, assigned to me. */
export function NewTaskDialog({ open, projects, token, myId, onOpenChange, onCreated }: Props) {
	const [title, setTitle] = useState("");
	const [projectId, setProjectId] = useState<number | null>(null);
	const [dueDate, setDueDate] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (open) setProjectId((p) => p ?? projects[0]?.id ?? null);
	}, [open, projects]);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!projectId || !title.trim()) return;
		setBusy(true);
		try {
			await workspaceFetch(`/projects/${projectId}/tasks`, token, {
				method: "POST",
				json: {
					title: title.trim(),
					assigneeIds: myId ? [myId] : [],
					...(dueDate ? { dueDate } : {}),
				},
			});
			toast.success("Tarea creada");
			setTitle("");
			setDueDate("");
			onCreated();
			onOpenChange(false);
		} catch (err) {
			toast.error(errorMessage(err, "No se pudo crear la tarea"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={submit} className="space-y-5">
					<DialogHeader>
						<DialogTitle>Crear tarea</DialogTitle>
						<DialogDescription>Queda asignada a vos, en la primera columna del proyecto.</DialogDescription>
					</DialogHeader>
					<div className="space-y-1.5">
						<Label htmlFor="task-title">Tarea</Label>
						<Input
							id="task-title"
							autoFocus
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ej.: Llamar al perito"
							maxLength={500}
						/>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
						<div className="space-y-1.5">
							<Label htmlFor="task-project">Proyecto</Label>
							<Select
								value={projectId ? String(projectId) : undefined}
								onValueChange={(v) => setProjectId(Number(v))}
							>
								<SelectTrigger id="task-project" className="w-full">
									<SelectValue placeholder="Elegí un proyecto" />
								</SelectTrigger>
								<SelectContent>
									{projects.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											<span
												className="size-2.5 rounded-sm"
												style={{ backgroundColor: projectColor(p) }}
												aria-hidden
											/>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="task-due">Vence</Label>
							<Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={busy || !title.trim() || !projectId}>
							Crear tarea
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
