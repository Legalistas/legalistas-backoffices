"use client";

import { Loader2, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import { CASES_NOTES_DELETE_ENDPOINT } from "@/constant/api-endpoints";
import type { CasesNotes } from "@/types/cases";
import { CreateNoteForm } from "./CreateNoteForm";
import { NoteEditor } from "./NoteEditor";

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
	const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
	const [noteContent, setNoteContent] = useState("");
	const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);
	const [isEditorOpen, setIsEditorOpen] = useState(false);

	// Build mention users list from lawyers
	const mentionUsers = [
		...(responsibleLawyer
			? [
					{
						id: responsibleLawyer.id,
						name: responsibleLawyer.name,
						image: responsibleLawyer.image,
					},
				]
			: []),
		...(internalLawyer && internalLawyer.id !== responsibleLawyer?.id
			? [
					{
						id: internalLawyer.id,
						name: internalLawyer.name,
						image: internalLawyer.image,
					},
				]
			: []),
	];

	const handleNoteCreated = () => {
		setNoteContent("");
		setMentionedUserIds([]);
		setIsEditorOpen(false);
		onNoteCreated();
	};

	const handleDeleteNote = async (noteId: number) => {
		if (!(await confirm({ description: "¿Estás seguro de que quieres eliminar esta nota?", confirmLabel: "Eliminar" }))) return;

		setDeletingNoteId(noteId);
		try {
			const response = await fetch(
				CASES_NOTES_DELETE_ENDPOINT(Number(caseId), noteId),
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al eliminar la nota");
			}

			toast.success("Nota eliminada correctamente");
			onNoteDeleted?.(noteId);
		} catch (error) {
			console.error("Error deleting note:", error);
			toast.error("No se pudo eliminar la nota");
		} finally {
			setDeletingNoteId(null);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<StickyNote className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-md font-semibold text-foreground">
						Notas
					</h3>
					{notes.length > 0 && (
						<span className="text-xs text-muted-foreground">
							({notes.length} {notes.length === 1 ? "nota" : "notas"})
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setIsEditorOpen(!isEditorOpen)}
						className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
						Nueva nota
					</button>
				</div>
			</div>

			{/* Editor de nueva nota (colapsable) */}
			{isEditorOpen && (
				<div className="px-5 pt-4 pb-3 border-b border-border">
					<NoteEditor
						content={noteContent}
						onChange={setNoteContent}
						onMentionsChange={setMentionedUserIds}
						mentionUsers={mentionUsers}
					/>

					{/* Mentioned users preview */}
					{mentionedUserIds.length > 0 && (
						<div className="mt-2 flex items-center gap-1.5 flex-wrap">
							<span className="text-xs text-muted-foreground">Se notificará a:</span>
							{mentionedUserIds.map((uid) => {
								const user = mentionUsers.find((u) => u.id === uid);
								return user ? (
									<span
										key={uid}
										className="inline-flex items-center gap-1 rounded-full bg-primary/5 dark:bg-primary/80/20 border border-primary/20 dark:border-primary/20 px-2 py-0.5 text-xs font-medium text-primary dark:text-primary"
									>
										{user.name}
									</span>
								) : null;
							})}
						</div>
					)}

					<div className="flex items-center justify-end gap-2 mt-3">
						<button
							onClick={() => {
								setIsEditorOpen(false);
								setNoteContent("");
								setMentionedUserIds([]);
							}}
							className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Cancelar
						</button>
						<CreateNoteForm
							caseId={caseId}
							onCancel={() => setIsEditorOpen(false)}
							onSuccess={handleNoteCreated}
							customContent={noteContent}
							onContentChange={setNoteContent}
							mentionedUserIds={mentionedUserIds}
						/>
					</div>
				</div>
			)}

			{/* Content */}
			{notes.length === 0 ? (
				<div className="flex flex-col items-center justify-center px-5 py-14">
					<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
						<StickyNote className="h-6 w-6 text-muted-foreground" />
					</div>
					<p className="text-sm font-medium text-foreground mb-1">
						No hay notas registradas
					</p>
					<p className="text-xs text-muted-foreground mb-3">
						Creá una nota para documentar información importante.
					</p>
					{!isEditorOpen && (
						<button
							onClick={() => setIsEditorOpen(true)}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Nueva nota
						</button>
					)}
				</div>
			) : (
				<div className="p-4 space-y-3">
					{notes.map((note) => (
						<div
							key={note.id}
							className="rounded-lg border p-5 bg-card border-border"
						>
							<div className="flex items-start justify-between gap-4">
								{/* Info de la nota */}
								<div className="flex items-start gap-3 min-w-0 flex-1">
									{/* Avatar */}
									<div className="h-9 w-9 rounded-full overflow-hidden shrink-0 border border-border">
										<Image
											src={
												note.user?.image
													? note.user.image.startsWith("http")
														? note.user.image
														: `${process.env.NEXT_PUBLIC_BACKEND_URL}${note.user.image}`
													: "/images/placeholder.svg"
											}
											alt={note.user?.name || "User"}
											width={36}
											height={36}
											quality={100}
											className="rounded-full aspect-square object-cover"
										/>
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="text-sm font-semibold text-foreground">
												{note.user?.name || "Anónimo"}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatDate(note.updatedAt || note.createdAt)}
											</span>
										</div>

										{/* Contenido de la nota */}
										<div
											className="mt-2 text-sm text-foreground prose prose-sm max-w-none dark:prose-invert [&_.mention]:bg-primary/5 [&_.mention]:dark:bg-primary/80/20 [&_.mention]:text-primary [&_.mention]:dark:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:font-medium"
											dangerouslySetInnerHTML={{ __html: note.note }}
										/>
									</div>
								</div>

								{/* Acciones */}
								<div className="flex items-center gap-1.5 shrink-0">
									<button
										title="Editar nota"
										className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
									>
										<Pencil className="h-4 w-4" />
									</button>
									<button
										onClick={() => handleDeleteNote(Number(note.id))}
										disabled={deletingNoteId === Number(note.id)}
										title="Eliminar nota"
										className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
									>
										{deletingNoteId === Number(note.id) ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Trash2 className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
			{ConfirmationDialog}
		</div>
	);
};
