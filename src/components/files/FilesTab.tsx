"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilesExpenses from "./FilesExpenses";
import FilesNotes, { type Note } from "./FilesNotes";
import FilesParts from "./FilesParts";

interface FilePart {
	id?: number;
	name: string;
	email?: string;
	phone?: string;
	address?: string;
	documentNumber?: string;
	documentType?: string;
	partyType: "DEMANDADO" | "DEMANDANTE" | "TERCERO" | "TESTIGO";
	role?: string;
	notes?: string;
	countryId?: number;
	stateId?: number;
	city?: string;
}

interface FileNote {
	id?: number; // Cambiado de 'id: number' a 'id?: number'
	note: string;
	userId: number;
	fileId: number;
	createdAt: string;
	updatedAt: string;
	user?: {
		id: number;
		name: string;
		email: string;
	};
}

interface FilesHeaderProps {
	file?: {
		id: number;
		title: string;
		cuij: string;
		filetype: number;
		proceduralStageId: number;
		statusProcessId: number;
		startDate: string;
		endDate: string;
		createdAt: string;
		updatedAt: string;
		filesParts?: FilePart[];
		filesNotes?: FileNote[];
		filesExpenses?: any;
		caseId?: number;
	};
	onRefresh?: () => void; // Para refrescar los datos del archivo completo
}

export default function FilesTab({ file, onRefresh }: FilesHeaderProps) {
	const [activeTab, setActiveTab] = useState("parts");

	const handlePartsChange = (updatedParts: FilePart[]) => {
		// Aquí puedes actualizar el estado del archivo si es necesario
		console.log("Partes actualizadas:", updatedParts);
	};

	const handleNotesChange = (updatedNotes: FileNote[]) => {
		// Aquí puedes actualizar el estado del archivo si es necesario
		if (onRefresh) {
			onRefresh(); // Llama a la función de refresco si está definida
		}
		console.log("Notas actualizadas:", updatedNotes);
	};

	const handleExpensesChange = (updatedExpenses: any) => {
		if (onRefresh) {
			onRefresh(); // Llama a la función de refresco si está definida
		}
		// Aquí puedes actualizar el estado del archivo si es necesario
		console.log("Gastos actualizados:", updatedExpenses);
	};

	return (
		<Tabs
			defaultValue={activeTab}
			onValueChange={setActiveTab}
			className="w-full"
		>
			<TabsList className="w-full bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100 p-2">
				{/* <TabsTrigger value="documents">Cédulas</TabsTrigger> */}
				<TabsTrigger value="parts">Partes</TabsTrigger>
				<TabsTrigger value="expenses">Gastos</TabsTrigger>
				<TabsTrigger value="notes">Notas Internas</TabsTrigger>
				{/* <TabsTrigger value="record">Historial</TabsTrigger> */}
			</TabsList>
			{/* <TabsContent value="documents" className="space-y-4 bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
                <h2 className="text-lg font-semibold">Cédulas</h2>
                <p>Contenido de Cédulas...</p>
            </TabsContent> */}
			<TabsContent
				value="parts"
				className="space-y-4 bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100"
			>
				{file?.caseId && file?.id ? (
					<FilesParts
						parts={file?.filesParts}
						caseId={file.caseId}
						fileId={file.id}
						onPartsChange={handlePartsChange}
					/>
				) : (
					<div className="text-center py-8 text-gray-500">
						<p>
							No se puede cargar las partes. Faltan datos del caso o archivo.
						</p>
					</div>
				)}
			</TabsContent>
			<TabsContent
				value="expenses"
				className="space-y-4 bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100"
			>
				{file?.caseId && file?.id ? (
					// <FilesParts
					//     parts={file?.filesParts}
					//     caseId={file.caseId}
					//     fileId={file.id}
					//     onPartsChange={handlePartsChange}
					// />
					<FilesExpenses
						expenses={file?.filesExpenses}
						caseId={file.caseId}
						fileId={file.id}
						onExpensesChange={handleExpensesChange}
						onRefresh={onRefresh}
					/>
				) : (
					<div className="text-center py-8 text-gray-500">
						<p>
							No se puede cargar los gastos. Faltan datos del caso o archivo.
						</p>
					</div>
				)}
			</TabsContent>
			<TabsContent
				value="notes"
				className="space-y-4 bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100"
			>
				{file?.caseId && file?.id ? (
					<FilesNotes
						fileId={file.id}
						caseId={file.caseId}
						notes={file.filesNotes || []}
						onNotesChange={handleNotesChange}
						onRefresh={onRefresh}
					/>
				) : (
					<div className="text-center py-8 text-gray-500">
						<p>
							No se puede cargar las notas. Faltan datos del caso o archivo.
						</p>
					</div>
				)}
			</TabsContent>
			{/* <TabsContent value="record" className="space-y-4 bg-white dark:bg-gray-800 text-gray-dark dark:text-gray-100">
                <h2 className="text-lg font-semibold">Historial</h2>
                <p>Contenido de Historial...</p>
            </TabsContent> */}
		</Tabs>
	);
}
