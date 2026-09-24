"use client";

import {
	Edit,
	FileText,
	Loader2,
	Plus,
	Save,
	Trash2,
	User,
	X,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { formatDate } from "@/lib/functions";
import type { Lead } from "@/types/crm";
import { NoteEditor } from "../case-details/NoteEditor";
import { Button } from "@/components/ui/button";

interface MentionUser {
	id: number;
	name: string;
	image?: string | null;
}

interface LeadNotesProps {
	lead: Lead;
	handleSaveNote: () => void;
	noteContent: string;
	setNoteContent: (content: string) => void;
	handleDeleteNote?: (noteId: number) => Promise<void>;
	handleEditNote?: (noteId: number, content: string) => Promise<void>;
	mentionUsers?: MentionUser[];
	onMentionsChange?: (userIds: number[]) => void;
}

export default function LeadNotes({
	lead,
	handleSaveNote,
	noteContent,
	setNoteContent,
	handleDeleteNote,
	handleEditNote,
	mentionUsers = [],
	onMentionsChange,
}: LeadNotesProps) {
	const { data: session } = useSession();
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
	const [editContent, setEditContent] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
		null,
	);

	const saveEditedNote = async (noteId: number) => {
		if (!editContent.trim()) {
			return;
		}
		setIsSubmitting(true);
		try {
			await handleEditNote?.(noteId, editContent);
			setEditingNoteId(null);
			setEditContent("");
		} catch (error) {
			console.error("Error saving edited note:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const confirmDeleteNote = async (noteId: number) => {
		setIsSubmitting(true);
		try {
			await handleDeleteNote?.(noteId);
			setConfirmingDeleteId(null);
		} catch (error) {
			console.error("Error deleting note:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const startEditingNote = (noteId: number, content: string) => {
		setEditingNoteId(noteId);
		setEditContent(content);
	};

	const cancelEditing = () => {
		setEditingNoteId(null);
		setEditContent("");
	};

	const startDeleteConfirmation = (noteId: number) => {
		setConfirmingDeleteId(noteId);
	};

	const cancelDeleteConfirmation = () => {
		setConfirmingDeleteId(null);
	};

	const closeEditor = () => {
		setIsEditorOpen(false);
		setNoteContent("");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="flex items-center gap-2 text-lg font-semibold">
					<FileText className="h-5 w-5 text-primary" />
					Notas
				</h3>
				<Button
					variant="outline"
					size="sm"
					onClick={() => (isEditorOpen ? closeEditor() : setIsEditorOpen(true))}
				>
					{isEditorOpen ? (
						<>
							<X className="h-4 w-4 mr-1.5" />
							Cancelar
						</>
					) : (
						<>
							<Edit className="h-4 w-4 mr-1.5" />
							Escribir nota
						</>
					)}
				</Button>
			</div>

			{isEditorOpen && (
				<div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-100 dark:border-gray-700">
					<h3 className="text-sm font-medium mb-3 text-gray-500 dark:text-gray-400">
						Nueva nota
					</h3>
					<NoteEditor
						content={noteContent}
						onChange={setNoteContent}
						mentionUsers={mentionUsers}
						onMentionsChange={onMentionsChange}
						placeholder="Escribe tu nota... Usa @ para mencionar"
					/>
					<Button
						variant="default"
						className="bg-primary text-white hover:bg-primary/85 dark:text-gray-900 py-2 px-2 mt-2"
						onClick={() => {
							handleSaveNote();
							closeEditor();
						}}
						disabled={!noteContent.trim() || isSubmitting}
					>
						{isSubmitting ? (
							<div className="flex items-center space-x-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Guardando...</span>
							</div>
						) : (
							<div className="flex items-center space-x-2">
								<Plus className="h-4 w-4" />
								<span>Guardar nota</span>
							</div>
						)}
					</Button>
				</div>
			)}

					<div className="space-y-4">
						<h3 className="font-medium text-lg flex items-center gap-2">
							<FileText className="h-4 w-4" />
							Historial de notas
						</h3>

						{lead.crmNotes && lead.crmNotes.length > 0 ? (
							<div className="space-y-4">
								{lead.crmNotes.map((note, index) => (
									<div
										key={index}
										className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden"
									>
										<div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b">
											<div className="flex items-center gap-2">
												<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
													<User className="h-4 w-4 text-primary" />
													<Image
														src={
															note.user?.image
																? note.user.image.startsWith("http")
																	? note.user.image
																	: `${process.env.NEXT_PUBLIC_BACKEND_URL}${note.user.image}`
																: "/images/placeholder.svg"
														}
														alt={note.user.name || "User Avatar"}
														width={36}
														height={36}
														quality={100}
														priority
														className="rounded-full mr-2 aspect-square object-cover"
													/>
												</div>
												<div>
													<p className="font-medium text-sm">
														{note.user.name || "Anónimo"}
													</p>
													<p className="text-xs text-muted-foreground">
														{formatDate(note.updatedAt || note.createdAt)}
													</p>
												</div>
											</div>

											<div className="flex gap-1">
												{editingNoteId !== note.id && (
													<Button
														variant="outline"
														onClick={() =>
															startEditingNote(note.id, note.note || "")
														}
													>
														<Edit className="h-3 w-3 text-black" />
													</Button>
												)}

												{confirmingDeleteId !== note.id && (
													<Button
														variant="outline"
														onClick={() => startDeleteConfirmation(note.id)}
													>
														<Trash2 className="h-3 w-3 text-black" />
													</Button>
												)}
											</div>
										</div>

										<div className="p-4">
											{editingNoteId === note.id ? (
												<div className="space-y-3">
													<NoteEditor
														content={editContent}
														onChange={setEditContent}
														mentionUsers={mentionUsers}
													/>
													<div className="flex justify-end gap-2 mt-2">
														<Button
															variant="outline"
															onClick={cancelEditing}
														>
															<X className="h-4 w-4 mr-1" />
															Cancelar
														</Button>
														<Button
															onClick={() => saveEditedNote(note.id)}
															disabled={!editContent.trim() || isSubmitting}
														>
															<Save className="h-4 w-4 mr-1" />
															Guardar
														</Button>
													</div>
												</div>
											) : confirmingDeleteId === note.id ? (
												<div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-800">
													<p className="text-sm text-red-800 dark:text-red-200 mb-3">
														¿Estás seguro de que deseas eliminar esta nota? Esta
														acción no se puede deshacer.
													</p>
													<div className="flex justify-end gap-2">
														<Button
															variant="outline"
															onClick={cancelDeleteConfirmation}
														>
															Cancelar
														</Button>
														<Button
															className="bg-red-500 hover:bg-red-600 text-white"
															onClick={() => confirmDeleteNote(note.id)}
															disabled={isSubmitting}
														>
															{isSubmitting ? "Eliminando..." : "Eliminar"}
														</Button>
													</div>
												</div>
											) : (
												<div
													className="text-sm prose dark:prose-invert max-w-none [&_.mention]:bg-primary/5 [&_.mention]:dark:bg-primary/80/20 [&_.mention]:text-primary [&_.mention]:dark:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:font-medium"
													dangerouslySetInnerHTML={{ __html: note.note || "" }}
												/>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
								<FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
								<p className="mt-2 text-muted-foreground">
									No hay notas disponibles
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									Crea la primera nota para este lead
								</p>
							</div>
						)}
					</div>
				</div>
	);
}
