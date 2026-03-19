"use client";

import { Clock, Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import {
	CASES_FILES_NOTES_CREATE_ENDPOINT,
	CASES_FILES_NOTES_DELETE_ENDPOINT,
} from "@/constant/api-endpoints";

interface Note {
	id?: number;
	note: string;
	userId: number;
	fileId: number;
	createdAt: string; // Cambiado de opcional a requerido
	updatedAt: string; // Cambiado de opcional a requerido
	user?: {
		id: number;
		name: string;
		email: string;
	};
}

interface FilesNotesProps {
	fileId: number;
	caseId: number;
	notes?: Note[];
	onNotesChange?: (notes: Note[]) => void;
	onRefresh?: () => void; // Para refrescar los datos del archivo completo
}

export default function FilesNotes({
	fileId,
	caseId,
	notes = [],
	onNotesChange,
	onRefresh,
}: FilesNotesProps) {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [isDeleting, setIsDeleting] = useState<number | null>(null);
	const [newNote, setNewNote] = useState("");
	const [notesData, setNotesData] = useState<Note[]>(notes);

	// Cargar notas al montar el componente
	useEffect(() => {
		setNotesData(notes);
	}, [fileId, caseId, notes]);

	const handleAddNote = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!newNote.trim() || !session?.user?.accessToken) {
			return;
		}

		setIsSending(true);
		try {
			const response = await fetch(
				CASES_FILES_NOTES_CREATE_ENDPOINT(caseId, fileId),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
					body: JSON.stringify({
						notes: [
							{
								note: newNote,
								userId: session.user.id,
								fileId: fileId,
							},
						],
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al agregar la nota");
			}

			const data = await response.json();

			// Agregar la nueva nota a la lista
			const newNoteData: Note = {
				...data.data,
				createdAt: data.data.createdAt || new Date().toISOString(),
				updatedAt: data.data.updatedAt || new Date().toISOString(),
			};

			const updatedNotes = [...notesData, newNoteData];
			setNotesData(updatedNotes);
			onNotesChange?.(updatedNotes);

			// Limpiar el campo de texto
			setNewNote("");
			toast.success("Nota agregada exitosamente");

			// Refrescar los datos del archivo completo si es necesario
			onRefresh?.();
		} catch (error) {
			console.error("Error adding note:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al agregar la nota",
			);
		} finally {
			setIsSending(false);
		}
	};

	const handleDeleteNote = async (noteId: number) => {
		if (!session?.user?.accessToken || !noteId) {
			return;
		}

		if (!(await confirm({ description: "¿Está seguro que desea eliminar esta nota?", confirmLabel: "Eliminar" }))) {
			return;
		}

		setIsDeleting(noteId);
		try {
			const response = await fetch(
				`${CASES_FILES_NOTES_DELETE_ENDPOINT(caseId, fileId, noteId)}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al eliminar la nota");
			}

			// Eliminar la nota de la lista
			const updatedNotes = notesData.filter((note) => note.id !== noteId);
			setNotesData(updatedNotes);
			onNotesChange?.(updatedNotes);

			toast.success("Nota eliminada exitosamente");

			// Refrescar los datos del archivo completo si es necesario
			onRefresh?.();
		} catch (error) {
			console.error("Error deleting note:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al eliminar la nota",
			);
		} finally {
			setIsDeleting(null);
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffTime = now.getTime() - date.getTime();
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

			if (diffDays === 0) {
				const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
				if (diffHours === 0) {
					const diffMinutes = Math.floor(diffTime / (1000 * 60));
					if (diffMinutes === 0) {
						return "hace unos segundos";
					}
					return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? "s" : ""}`;
				}
				return `hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
			} else if (diffDays === 1) {
				return "ayer";
			} else if (diffDays < 7) {
				return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`;
			} else {
				return date.toLocaleDateString("es", {
					year: "numeric",
					month: "short",
					day: "numeric",
				});
			}
		} catch (error) {
			return "fecha desconocida";
		}
	};

	const getUserInitials = (name?: string) => {
		if (!name) return "U";
		return name
			.split(" ")
			.map((word) => word.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<MessageSquare className="h-5 w-5 text-gray-500" />
				<h2 className="text-lg font-semibold">Notas Internas</h2>
				<span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
					{notesData.length} nota{notesData.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Lista de notas */}
			<div className="space-y-4 max-h-96 overflow-y-auto">
				{isLoading ? (
					<div className="flex justify-center items-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : notesData.length > 0 ? (
					notesData
						.sort(
							(a, b) =>
								new Date(b.createdAt).getTime() -
								new Date(a.createdAt).getTime(),
						)
						.map((note, index) => (
							<div
								key={note.id || index}
								className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow"
							>
								<div className="flex justify-between items-start mb-3">
									<div className="flex items-center gap-3">
										{/* Avatar del usuario */}
										<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
											{getUserInitials(note.user?.name)}
										</div>
										<div>
											<div className="font-medium text-gray-900 dark:text-gray-100">
												{note.user?.name || "Usuario"}
											</div>
											<div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
												<Clock className="h-3 w-3" />
												<span>{formatDate(note.createdAt)}</span>
											</div>
										</div>
									</div>
									{Number(session?.user?.id) === note.userId && (
										<button
											onClick={() => handleDeleteNote(note.id!)}
											disabled={isDeleting === note.id}
											className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
											title="Eliminar nota"
										>
											{isDeleting === note.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Trash2 className="h-4 w-4" />
											)}
										</button>
									)}
								</div>
								<div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
									{note.note}
								</div>
								{note.updatedAt && note.updatedAt !== note.createdAt && (
									<div className="mt-2 text-xs text-gray-400 italic">
										Editado {formatDate(note.updatedAt)}
									</div>
								)}
							</div>
						))
				) : (
					<div className="text-center py-12 text-gray-500 dark:text-gray-400">
						<MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
						<p className="text-lg font-medium">No hay notas disponibles</p>
						<p className="text-sm">
							Agrega la primera nota interna para este archivo
						</p>
					</div>
				)}
			</div>

			{/* Formulario para agregar notas */}
			<form onSubmit={handleAddNote} className="mt-6">
				<div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
					<textarea
						value={newNote}
						onChange={(e) => setNewNote(e.target.value)}
						placeholder="Escriba una nota interna..."
						rows={4}
						className="w-full p-3 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none resize-none"
						disabled={isSending}
					/>
					<div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3">
						<div className="text-xs text-gray-500 dark:text-gray-400">
							{newNote.length > 0 && `${newNote.length} caracteres`}
						</div>
						<button
							type="submit"
							disabled={isSending || !newNote.trim()}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isSending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Enviando...
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									Agregar Nota
								</>
							)}
						</button>
					</div>
				</div>
			</form>
		{ConfirmationDialog}
		</div>
	);
}

// Exportar el tipo Note para uso en otros componentes
export type { Note };
