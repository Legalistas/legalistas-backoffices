"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { CASES_NOTES_CREATE_ENDPOINT } from "@/constant/api-endpoints";

interface CreateNoteFormProps {
	caseId: string;
	onCancel: () => void;
	onSuccess: () => void;
	customContent?: string;
	onContentChange?: (content: string) => void;
	mentionedUserIds?: number[];
}

export const CreateNoteForm = ({
	caseId,
	onCancel,
	onSuccess,
	customContent = "",
	onContentChange,
	mentionedUserIds = [],
}: CreateNoteFormProps) => {
	const { data: session } = useSession();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	const handleSubmit = async () => {
		// Strip HTML tags to check if there's actual content
		const textOnly = customContent.replace(/<[^>]*>/g, "").trim();
		if (!textOnly) {
			toast.error("Por favor, escribe una nota antes de guardar");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch(
				CASES_NOTES_CREATE_ENDPOINT(Number(caseId)),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({
						note: customContent,
						userId: session?.user?.id,
						mentionedUserIds,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al crear la nota");
			}

			toast.success("Nota creada exitosamente");
			onSuccess();
			router.push(`/admin/legal-cases/${caseId}`);
		} catch (error) {
			console.error("Error creating note:", error);
			toast.error("No se pudo crear la nota. Por favor, intenta de nuevo.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const textOnly = customContent.replace(/<[^>]*>/g, "").trim();

	return (
		<button
			onClick={handleSubmit}
			disabled={isSubmitting || !textOnly}
			className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isSubmitting ? (
				<>
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Guardando...</span>
				</>
			) : (
				<>
					<Send className="h-4 w-4" />
					<span>Publicar</span>
				</>
			)}
		</button>
	);
};
