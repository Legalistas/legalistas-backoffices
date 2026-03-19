import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { CASES_CONSULTATIONS_CREATE_ENDPOINT } from "@/constant/api-endpoints";

interface CreateConsultationFormProps {
	caseId: number;
	onSuccess: () => void;
	onCancel: () => void;
}

export default function CreateConsultationForm({
	caseId,
	onSuccess,
	onCancel,
}: CreateConsultationFormProps) {
	const { data: session } = useSession();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);
	const sender = "responsible";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!caseId || !title.trim() || !sender) {
			toast.error("caseId, title y sender son obligatorios.");
			return;
		}
		setLoading(true);
		try {
			const response = await fetch(
				CASES_CONSULTATIONS_CREATE_ENDPOINT(caseId),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ caseId, title, sender, description }),
				},
			);
			if (!response.ok) throw new Error("No se pudo crear la consulta");
			toast.success("Consulta creada correctamente");
			onSuccess();
		} catch (err) {
			toast.error("Error al crear la consulta");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label className="block text-sm font-medium">
					Título <span className="text-red-500">*</span>
				</label>
				<input
					className="w-full border rounded px-2 py-1"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
				/>
			</div>
			<div>
				<label className="block text-sm font-medium">Descripción</label>
				<textarea
					className="w-full border rounded px-2 py-1"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</div>
			{/* El remitente es el usuario logueado, no se muestra input */}
			<div className="flex gap-2 justify-end">
				<button
					type="button"
					onClick={onCancel}
					className="px-3 py-1 border rounded"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-3 py-1 bg-primary text-white rounded"
				>
					{loading ? "Creando..." : "Crear Consulta"}
				</button>
			</div>
		</form>
	);
}
