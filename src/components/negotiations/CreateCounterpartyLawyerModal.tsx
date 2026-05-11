"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
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
import { CASE_PARTS_ENDPOINT } from "@/constant/api-endpoints";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	caseId: number;
	onCreated: (lawyer: { id: number; name: string }) => void;
}

const EMPTY = { name: "", matricula: "", phone: "", email: "" };

export default function CreateCounterpartyLawyerModal({
	open,
	onOpenChange,
	caseId,
	onCreated,
}: Props) {
	const { data: session } = useSession();
	const [form, setForm] = useState(EMPTY);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const close = () => {
		setForm(EMPTY);
		onOpenChange(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const name = form.name.trim();
		if (!name) {
			toast.error("El nombre es obligatorio");
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await fetch(CASE_PARTS_ENDPOINT(caseId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					partyType: "abogado",
					name,
					personType: "fisica",
					documentType: "matricula",
					documentNumber: form.matricula || null,
					phone: form.phone || null,
					email: form.email || null,
				}),
			});

			if (!res.ok) {
				throw new Error(await res.text());
			}

			const json = await res.json();
			const created = json.data || json;

			toast.success("Abogado creado");
			onCreated({ id: created.id, name });
			setForm(EMPTY);
			onOpenChange(false);
		} catch (err) {
			console.error("Error creating counterparty lawyer:", err);
			toast.error("No se pudo crear el abogado");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Nuevo abogado contraparte</DialogTitle>
					<DialogDescription>
						Se va a cargar como parte del caso con tipo "Abogado".
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="cp-name">
							Nombre <span className="text-red-500">*</span>
						</Label>
						<Input
							id="cp-name"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							placeholder="Nombre completo"
							autoFocus
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="cp-matricula">Matrícula</Label>
							<Input
								id="cp-matricula"
								value={form.matricula}
								onChange={(e) => setForm({ ...form, matricula: e.target.value })}
								placeholder="Opcional"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cp-phone">Teléfono</Label>
							<Input
								id="cp-phone"
								value={form.phone}
								onChange={(e) => setForm({ ...form, phone: e.target.value })}
								placeholder="Opcional"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cp-email">Email</Label>
						<Input
							id="cp-email"
							type="email"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
							placeholder="Opcional"
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={close}
							disabled={isSubmitting}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isSubmitting || !form.name.trim()}>
							{isSubmitting && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Crear
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
