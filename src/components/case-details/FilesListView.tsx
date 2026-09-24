"use client";

import {
	ChevronDown,
	FolderOpen,
	Link2,
	Pencil,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT } from "@/constant/api-endpoints";
import { FILES_TYPE } from "@/constant/causes";
import { apiErrorMessage } from "@/lib/api-error";
import {
	getFileTypeLabel,
	getProceduralStageLabel,
	getProcessTypeLabel,
} from "@/lib/functions";
import type { CasesFiles } from "@/types/cases";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { NewFileModal } from "./NewFileModal";

interface FilesListViewProps {
	files: CasesFiles[];
	caseId: string;
	customer?: {
		name: string;
	};
	onAddNewFile?: () => void;
}

export const FilesListView = ({
	files,
	caseId,
	customer,
	onAddNewFile,
}: FilesListViewProps) => {
	const router = useRouter();
	const { data: session } = useSession();
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [fileToEdit, setFileToEdit] = useState<CasesFiles | null>(null);
	const [fileTypeFilter, setFileTypeFilter] = useState<number>(0);

	const handleDelete = async (fileId: string) => {
		try {
			const response = await fetch(
				`${CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT(Number(caseId), Number(fileId))}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);
			if (!response.ok) {
				throw new Error(
					await apiErrorMessage(response, "Error al eliminar el archivo"),
				);
			}

			console.log(`Deleting file with ID: ${fileId}`);
			toast.success("Archivo eliminado correctamente");
			router.push(`/admin/legal-cases/${caseId}`);
		} catch (error) {
			console.error("Error al eliminar el archivo:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al eliminar el archivo",
			);
		}
	};

	// Filtrar expedientes
	const filteredFiles = useMemo(() => {
		return files.filter((file) => {
			return fileTypeFilter === 0 || file.filetype === fileTypeFilter;
		});
	}, [files, fileTypeFilter]);

	const hasActiveFilters = fileTypeFilter !== 0;

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<Link2 className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-md font-semibold text-foreground">Expedientes</h3>
				</div>
				<div className="flex items-center gap-2">
					{/* Filtros - solo cuando hay expedientes */}
					{files.length > 0 && (
						<>
							<div className="relative">
								<select
									value={fileTypeFilter}
									onChange={(e) => setFileTypeFilter(Number(e.target.value))}
									className="appearance-none text-xs font-medium text-muted-foreground bg-card border border-border rounded-md pl-3 pr-7 py-2 hover:border-input focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
								>
									<option value={0}>Todos los tipos</option>
									{FILES_TYPE.map((type) => (
										<option key={type.id} value={type.value}>
											{type.label}
										</option>
									))}
								</select>
								<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
							</div>
							{hasActiveFilters && (
								<button
									onClick={() => {
										setFileTypeFilter(0);
									}}
									className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</>
					)}
					{onAddNewFile && (
						<button
							onClick={onAddNewFile}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
						>
							<Plus className="h-3.5 w-3.5" />
							Nuevo expediente
						</button>
					)}
				</div>
			</div>

			{/* Content */}
			{files.length === 0 ? (
				<div className="flex flex-col items-center justify-center px-5 py-14">
					<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
						<FolderOpen className="h-6 w-6 text-muted-foreground" />
					</div>
					<p className="text-sm font-medium text-foreground mb-1">
						No hay expedientes creado
					</p>
					<p className="text-xs text-muted-foreground mb-4">
						Cree un expediente para iniciar la gestión del caso.
					</p>
					{onAddNewFile && (
						<button
							onClick={onAddNewFile}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Nuevo expediente
						</button>
					)}
				</div>
			) : (
				<div className="overflow-x-auto">
					<Table className="w-full">
						<TableHeader className="bg-muted">
							<TableRow>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left whitespace-nowrap"
								>
									#
								</TableCell>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left"
								>
									Carátula
								</TableCell>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left whitespace-nowrap"
								>
									CUIJ
								</TableCell>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left whitespace-nowrap"
								>
									Tipo
								</TableCell>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left"
								>
									Juzgado
								</TableCell>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-left whitespace-nowrap"
								>
									Lesión
								</TableCell>
								<TableCell
									className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap"
								>
									Acción
								</TableCell>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredFiles.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="px-4 py-10">
										<div className="flex flex-col items-center justify-center">
											<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
												<Search className="h-5 w-5 text-muted-foreground" />
											</div>
											<p className="text-sm font-medium text-foreground mb-0.5">
												Sin resultados
											</p>
											<p className="text-xs text-muted-foreground mb-3">
												No se encontraron expedientes con los filtros aplicados
											</p>
											<button
												onClick={() => {
													setFileTypeFilter(0);
												}}
												className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
											>
												Limpiar filtros
											</button>
										</div>
									</TableCell>
								</TableRow>
							) : (
								filteredFiles.map((file) => (
									<TableRow key={file.id} className="hover:bg-muted">
										<TableCell className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
											{file.id}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-foreground">
											{/* Se arma sola con partes + tipo de proceso (backend). */}
											{file.title ||
												`${customer?.name ?? ""} S/ ${getProcessTypeLabel(file.typeProcessId)}`}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
											{file.cuij || "—"}
										</TableCell>
										<TableCell className="px-4 py-3 whitespace-nowrap">
											<Badge
												variant="secondary"
												color="primary"
												className="text-xs font-normal"
											>
												{getFileTypeLabel(file.filetype)}
											</Badge>
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{file.court?.charter || (
												<span className="text-muted-foreground italic">
													Sin asignar
												</span>
											)}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-foreground">
											{file.injury?.trim() || (
												<span className="text-muted-foreground italic">
													Sin cargar
												</span>
											)}
										</TableCell>
										<TableCell className="px-4 py-3">
											<div className="flex items-center justify-end gap-1">
												<button
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setFileToEdit(file);
														setIsEditModalOpen(true);
													}}
													className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-amber-600 transition-colors"
												>
													<Pencil className="h-3.5 w-3.5" />
												</button>
												<button
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														handleDelete(file.id);
													}}
													className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Modal de edición */}
			{isEditModalOpen && fileToEdit && (
				<NewFileModal
					isOpen={isEditModalOpen}
					onClose={() => {
						setIsEditModalOpen(false);
						setFileToEdit(null);
					}}
					onSave={() => {
						setIsEditModalOpen(false);
						setFileToEdit(null);
					}}
					initialFileType={fileToEdit.filetype || 1}
					caseId={Number(caseId)}
					fileToEdit={fileToEdit}
					isEditMode={true}
				/>
			)}
		</div>
	);
};
