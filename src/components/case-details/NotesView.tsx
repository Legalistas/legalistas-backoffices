"use client";

import { Loader2, StickyNote, Trash2 } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CASES_NOTES_DELETE_ENDPOINT } from "@/constant/api-endpoints";
import { useCaseCrm } from "@/hooks/useCaseCrm";
import { useConfirm } from "@/hooks/useConfirm";
import { apiErrorMessage } from "@/lib/api-error";
import type { CasesNotes } from "@/types/cases";
import { CreateNoteForm } from "./CreateNoteForm";
import { NoteEditor } from "./NoteEditor";

// Relevamiento 7:
//  - Cargar una nota es un solo paso: el editor está siempre a la vista, se
//    escribe y se publica (antes: "Nueva nota" → escribir → "Publicar").
//  - Se integran las notas del CRM (Ventas). Las que se copiaron al caso al
//    convertir el lead se marcan "CRM"; las que se cargaron en el CRM después
//    aparecen igual, de solo lectura.

interface LawyerInfo {
	id: number;
	name: string;
	image?: string | null;
}

interface NotesViewProps {
	notes: CasesNotes[];
	caseId: string;
	onNoteCreated: () => void;
	onNoteDeleted?: (noteId: number) => void;
	responsibleLawyer?: LawyerInfo | null;
	internalLawyer?: LawyerInfo | null;
}

interface NotaListada {
	key: string;
	id: number | null; // id de la nota del caso (null = solo en el CRM)
	// Las del caso son HTML del editor; las del CRM, texto plano (no se
	// interpretan como HTML).
	html: string | null;
	texto: string | null;
	date: string;
	user: { name?: string | null; image?: string | null } | null;
	crm: boolean;
}

const avatarSrc = (image?: string | null) =>
	image
		? image.startsWith("http")
			? image
			: `${process.env.NEXT_PUBLIC_BACKEND_URL}${image}`
		: "/images/placeholder.svg";

const formatDate = (dateString: string) =>
	new Date(dateString).toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

export const NotesView = ({
	notes,
	caseId,
	onNoteCreated,
	onNoteDeleted,
	responsibleLawyer,
	internalLawyer,
}: NotesViewProps) => {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const { crm } = useCaseCrm(caseId);
	const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
	const [noteContent, setNoteContent] = useState("");
	const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);

	const mentionUsers = [
		...(responsibleLawyer
			? [{ id: responsibleLawyer.id, name: responsibleLawyer.name, image: responsibleLawyer.image }]
			: []),
		...(internalLawyer && internalLawyer.id !== responsibleLawyer?.id
			? [{ id: internalLawyer.id, name: internalLawyer.name, image: internalLawyer.image }]
			: []),
	];

	// Notas del caso + las del CRM que no se copiaron, de la más nueva a la más vieja.
	const listado = useMemo<NotaListada[]>(() => {
		const copiadas = new Set(
			(crm?.notes ?? []).map((n) => n.caseNoteId).filter((id) => id != null),
		);
		const delCaso: NotaListada[] = notes.map((n) => ({
			key: `caso-${n.id}`,
			id: Number(n.id),
			html: n.note,
			texto: null,
			date: n.createdAt,
			user: n.user,
			crm: copiadas.has(Number(n.id)),
		}));
		const soloCrm: NotaListada[] = (crm?.notes ?? [])
			.filter((n) => n.caseNoteId == null && n.note?.trim())
			.map((n) => ({
				key: `crm-${n.id}`,
				id: null,
				html: null,
				texto: n.note ?? "",
				date: n.createdAt,
				user: n.user,
				crm: true,
			}));
		return [...delCaso, ...soloCrm].sort((a, b) => b.date.localeCompare(a.date));
	}, [notes, crm]);

	const handleNoteCreated = () => {
		setNoteContent("");
		setMentionedUserIds([]);
		onNoteCreated();
	};

	const handleDeleteNote = async (noteId: number) => {
		if (
			!(await confirm({
				description: "¿Estás seguro de que quieres eliminar esta nota?",
				confirmLabel: "Eliminar",
			}))
		)
			return;

		setDeletingNoteId(noteId);
		try {
			const response = await fetch(CASES_NOTES_DELETE_ENDPOINT(Number(caseId), noteId), {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!response.ok) {
				throw new Error(await apiErrorMessage(response, "No se pudo eliminar la nota"));
			}
			toast.success("Nota eliminada correctamente");
			onNoteDeleted?.(noteId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "No se pudo eliminar la nota");
		} finally {
			setDeletingNoteId(null);
		}
	};

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			<div className="flex items-center gap-2 px-5 py-4 border-b border-border">
				<StickyNote className="h-5 w-5 text-muted-foreground" />
				<h3 className="text-md font-semibold text-foreground">Notas</h3>
				{listado.length > 0 && (
					<span className="text-xs text-muted-foreground">
						({listado.length} {listado.length === 1 ? "nota" : "notas"})
					</span>
				)}
			</div>

			{/* Nueva nota: siempre a la vista, un solo paso. */}
			<div className="px-5 pt-4 pb-3 border-b border-border">
				<NoteEditor
					content={noteContent}
					onChange={setNoteContent}
					onMentionsChange={setMentionedUserIds}
					mentionUsers={mentionUsers}
				/>
				<div className="flex flex-wrap items-center justify-between gap-2 mt-3">
					<div className="flex items-center gap-1.5 flex-wrap">
						{mentionedUserIds.length > 0 && (
							<>
								<span className="text-xs text-muted-foreground">Se notificará a:</span>
								{mentionedUserIds.map((uid) => {
									const user = mentionUsers.find((u) => u.id === uid);
									return user ? (
										<span
											key={uid}
											className="inline-flex items-center rounded-full bg-primary/5 border border-primary/20 px-2 py-0.5 text-xs font-medium text-primary"
										>
											{user.name}
										</span>
									) : null;
								})}
							</>
						)}
					</div>
					<CreateNoteForm
						caseId={caseId}
						onCancel={() => setNoteContent("")}
						onSuccess={handleNoteCreated}
						customContent={noteContent}
						onContentChange={setNoteContent}
						mentionedUserIds={mentionedUserIds}
					/>
				</div>
			</div>

			{listado.length === 0 ? (
				<div className="flex flex-col items-center justify-center px-5 py-10">
					<p className="text-sm font-medium text-foreground mb-1">No hay notas registradas</p>
					<p className="text-xs text-muted-foreground">
						Escribí arriba para documentar información importante.
					</p>
				</div>
			) : (
				<div className="p-4 space-y-3">
					{listado.map((nota) => (
						<div key={nota.key} className="rounded-lg border p-5 bg-card border-border">
							<div className="flex items-start justify-between gap-4">
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div className="h-9 w-9 rounded-full overflow-hidden shrink-0 border border-border">
										<Image
											src={avatarSrc(nota.user?.image)}
											alt={nota.user?.name || "Usuario"}
											width={36}
											height={36}
											quality={100}
											className="rounded-full aspect-square object-cover"
										/>
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-sm font-semibold text-foreground">
												{nota.user?.name || "Anónimo"}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatDate(nota.date)}
											</span>
											{nota.crm && (
												<Badge variant="secondary" className="text-[10px]">
													CRM
												</Badge>
											)}
										</div>
										{nota.html != null ? (
											<div
												className="mt-2 text-sm text-foreground prose prose-sm max-w-none dark:prose-invert [&_.mention]:bg-primary/5 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:font-medium"
												dangerouslySetInnerHTML={{ __html: nota.html }}
											/>
										) : (
											<p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
												{nota.texto}
											</p>
										)}
									</div>
								</div>

								{/* Las notas que viven solo en el CRM se gestionan desde el CRM. */}
								{nota.id != null && (
									<button
										type="button"
										onClick={() => handleDeleteNote(nota.id as number)}
										disabled={deletingNoteId === nota.id}
										title="Eliminar nota"
										className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50 shrink-0"
									>
										{deletingNoteId === nota.id ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Trash2 className="h-4 w-4" />
										)}
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
			{ConfirmationDialog}
		</div>
	);
};
