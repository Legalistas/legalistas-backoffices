"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	CANDIDATE_BY_ID_ENDPOINT,
	CANDIDATES_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	RECRUITMENT_COLUMNS,
	RECRUITMENT_SOURCES,
	type RecruitmentSource,
	type RecruitmentStage,
} from "@/constant/recruitment";
import type { Candidate, CandidateFormData } from "@/types/recruitment";

interface CandidateFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	candidate: Candidate | null;
	onSaved: () => void;
}

const EMPTY_FORM: CandidateFormData = {
	name: "",
	email: "",
	phone: "",
	position: "",
	area: "",
	source: "LINKEDIN",
	stage: "SOURCING",
	notes: "",
	responsibleId: null,
	cvUrl: null,
};

export default function CandidateFormDialog({
	open,
	onOpenChange,
	candidate,
	onSaved,
}: CandidateFormDialogProps) {
	const { data: session } = useSession();
	const [form, setForm] = useState<CandidateFormData>(EMPTY_FORM);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) return;
		if (candidate) {
			setForm({
				name: candidate.name,
				email: candidate.email ?? "",
				phone: candidate.phone ?? "",
				position: candidate.position,
				area: candidate.area ?? "",
				source: candidate.source,
				stage: candidate.stage,
				notes: candidate.notes ?? "",
				responsibleId: candidate.responsibleId,
				cvUrl: candidate.cvUrl,
			});
		} else {
			setForm(EMPTY_FORM);
		}
	}, [open, candidate]);

	const isEdit = !!candidate?.id;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name.trim()) {
			toast.error("El nombre es obligatorio");
			return;
		}
		if (!form.position.trim()) {
			toast.error("El puesto es obligatorio");
			return;
		}

		setSubmitting(true);
		try {
			const payload = {
				name: form.name.trim(),
				email: form.email.trim() || null,
				phone: form.phone.trim() || null,
				position: form.position.trim(),
				area: form.area.trim() || null,
				source: form.source,
				stage: form.stage,
				notes: form.notes.trim() || null,
				responsibleId: form.responsibleId,
				cvUrl: form.cvUrl,
			};

			const url = isEdit
				? CANDIDATE_BY_ID_ENDPOINT(candidate!.id)
				: CANDIDATES_ENDPOINT;
			const method = isEdit ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) throw new Error(`Error ${res.status}`);

			toast.success(
				isEdit ? "Candidato actualizado" : "Candidato creado correctamente",
			);
			onOpenChange(false);
			onSaved();
		} catch (err) {
			console.error(err);
			toast.error("No se pudo guardar el candidato");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEdit ? "Editar candidato" : "Nuevo candidato"}
						</DialogTitle>
						<DialogDescription>
							Cargá los datos del candidato para seguir su proceso de selección.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 py-4">
						<div className="grid gap-1.5">
							<Label htmlFor="name">Nombre completo *</Label>
							<Input
								id="name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="grid gap-1.5">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={form.email}
									onChange={(e) => setForm({ ...form, email: e.target.value })}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="phone">Teléfono</Label>
								<Input
									id="phone"
									value={form.phone}
									onChange={(e) => setForm({ ...form, phone: e.target.value })}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="grid gap-1.5">
								<Label htmlFor="position">Puesto *</Label>
								<Input
									id="position"
									value={form.position}
									onChange={(e) =>
										setForm({ ...form, position: e.target.value })
									}
									required
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="area">Área</Label>
								<Input
									id="area"
									value={form.area}
									onChange={(e) => setForm({ ...form, area: e.target.value })}
									placeholder="Ej. Legal, Ventas"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="grid gap-1.5">
								<Label htmlFor="source">Fuente</Label>
								<Select
									value={form.source}
									onValueChange={(v) =>
										setForm({ ...form, source: v as RecruitmentSource })
									}
								>
									<SelectTrigger id="source">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{RECRUITMENT_SOURCES.map((s) => (
											<SelectItem key={s.value} value={s.value}>
												{s.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="stage">Etapa</Label>
								<Select
									value={form.stage}
									onValueChange={(v) =>
										setForm({ ...form, stage: v as RecruitmentStage })
									}
								>
									<SelectTrigger id="stage">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{RECRUITMENT_COLUMNS.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												{c.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="cvUrl">URL del CV</Label>
							<Input
								id="cvUrl"
								value={form.cvUrl ?? ""}
								onChange={(e) =>
									setForm({ ...form, cvUrl: e.target.value || null })
								}
								placeholder="https://..."
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="notes">Notas</Label>
							<Textarea
								id="notes"
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								rows={3}
								placeholder="Observaciones del proceso, expectativas, pretensión salarial, etc."
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={submitting}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={submitting}>
							{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
							{isEdit ? "Guardar cambios" : "Crear candidato"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
