"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { errorMessage, workspaceFetch } from "@/lib/workspace-api";

interface Props {
	team: { id: number; name: string } | null;
	token: string | undefined;
	onOpenChange: (open: boolean) => void;
}

/** Creates a project in a team and opens its board. */
export function NewProjectDialog({ team, token, onOpenChange }: Props) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [privacy, setPrivacy] = useState<"TEAM" | "PRIVATE">("TEAM");
	const [busy, setBusy] = useState(false);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!team || !name.trim()) return;
		setBusy(true);
		try {
			const project = await workspaceFetch<{ id: number }>(`/teams/${team.id}/projects`, token, {
				method: "POST",
				json: { name: name.trim(), privacy },
			});
			toast.success("Proyecto creado");
			router.push(`/admin/workspace/projects/${project.id}`);
		} catch (err) {
			toast.error(errorMessage(err, "No se pudo crear el proyecto"));
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={team !== null}
			onOpenChange={(open) => {
				if (!open) {
					setName("");
					setPrivacy("TEAM");
				}
				onOpenChange(open);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={submit} className="space-y-5">
					<DialogHeader>
						<DialogTitle>Nuevo proyecto</DialogTitle>
						<DialogDescription>
							En el equipo {team?.name}. Arranca con las columnas Por hacer, En curso, En revisión y Hecho.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-1.5">
						<Label htmlFor="project-name">Nombre</Label>
						<Input
							id="project-name"
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ej.: Escritos de octubre"
							maxLength={160}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="project-privacy">Quién lo ve</Label>
						<Select value={privacy} onValueChange={(v) => setPrivacy(v as "TEAM" | "PRIVATE")}>
							<SelectTrigger id="project-privacy" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="TEAM">Todo el equipo</SelectItem>
								<SelectItem value="PRIVATE">Privado: solo quienes sumes</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={busy || !name.trim()}>
							Crear proyecto
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
