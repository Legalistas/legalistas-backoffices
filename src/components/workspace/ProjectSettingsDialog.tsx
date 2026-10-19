"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/useConfirm";
import { errorMessage, projectColor, workspaceFetch } from "@/lib/workspace-api";
import type { WorkBoard } from "@/types/workspace";
import { ProjectLookPicker } from "./ProjectLook";

interface Props {
	open: boolean;
	project: WorkBoard["project"];
	token: string | undefined;
	onOpenChange: (open: boolean) => void;
	onSaved: () => void;
}

/** Name, description, color and icon of the project; archive it. */
export function ProjectSettingsDialog({ open, project, token, onOpenChange, onSaved }: Props) {
	const router = useRouter();
	const [name, setName] = useState(project.name);
	const [description, setDescription] = useState(project.description ?? "");
	const [color, setColor] = useState(projectColor(project));
	const [icon, setIcon] = useState<string | null>(project.icon ?? null);
	const [busy, setBusy] = useState(false);
	const { confirm, ConfirmationDialog } = useConfirm();

	useEffect(() => {
		if (!open) return;
		setName(project.name);
		setDescription(project.description ?? "");
		setColor(projectColor(project));
		setIcon(project.icon ?? null);
	}, [open, project]);

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setBusy(true);
		try {
			await workspaceFetch(`/projects/${project.id}`, token, {
				method: "PATCH",
				json: { name: name.trim(), description: description.trim() || null, color, icon },
			});
			toast.success("Proyecto actualizado");
			onSaved();
			onOpenChange(false);
		} catch (err) {
			toast.error(errorMessage(err, "No se pudo guardar"));
		} finally {
			setBusy(false);
		}
	};

	const archive = async () => {
		const ok = await confirm({
			title: "Archivar proyecto",
			description: `"${project.name}" deja de aparecer en el inicio y en los equipos. No se borra nada.`,
			confirmLabel: "Archivar",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			await workspaceFetch(`/projects/${project.id}/archive`, token, { method: "POST" });
			toast.success("Proyecto archivado");
			router.push("/admin/workspace");
		} catch (err) {
			toast.error(errorMessage(err, "No se pudo archivar"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={save} className="space-y-5">
					<DialogHeader>
						<DialogTitle>Editar proyecto</DialogTitle>
						<DialogDescription>Nombre, descripción, color e ícono del tablero.</DialogDescription>
					</DialogHeader>
					<div className="space-y-1.5">
						<Label htmlFor="settings-name">Nombre</Label>
						<Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="settings-description">Descripción</Label>
						<Textarea
							id="settings-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							placeholder="Para qué es este tablero"
						/>
					</div>
					<ProjectLookPicker color={color} icon={icon} onColor={setColor} onIcon={setIcon} />
					<DialogFooter className="items-center gap-2 sm:justify-between">
						<Button type="button" variant="ghost" onClick={archive} className="text-muted-foreground hover:text-destructive">
							<Archive className="size-4" />
							Archivar proyecto
						</Button>
						<Button type="submit" disabled={busy || !name.trim()}>
							Guardar
						</Button>
					</DialogFooter>
				</form>
				{ConfirmationDialog}
			</DialogContent>
		</Dialog>
	);
}
