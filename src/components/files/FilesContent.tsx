"use client";

import {
	Calculator,
	CalendarDays,
	DollarSign,
	FileCheck,
	FileText,
	StickyNote,
	Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useState } from "react";
import FilesCedulas from "@/components/files/FilesCedulas";
import FilesDetails from "@/components/files/FilesDetails";
import FilesExpenses from "@/components/files/FilesExpenses";
import FilesHeader from "@/components/files/FilesHeader";
import FilesLiquidations from "@/components/files/FilesLiquidations";
import FilesMovements from "@/components/files/FilesMovements";
import FilesNotes from "@/components/files/FilesNotes";
import FilesParts from "@/components/files/FilesParts";

import { CASES_FILES_BY_CASE_ID_ENDPOINT } from "@/constant/api-endpoints";
import FilesNewMovements from "./FilesNewMovements";
import FilesSidebar from "./FilesSidebar";

export default function FilesContent() {
	const { caseId, id: fileId } = useParams();
	const { data: session } = useSession();
	const [file, setFile] = useState<any>(null);
	const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("details");

	const caseIdNum = Number(caseId);
	const fileIdNum = Number(fileId);

	const fetchFileData = useCallback(async () => {
		if (!caseIdNum || !fileIdNum || !session?.user?.accessToken) return;

		try {
			const response = await fetch(
				CASES_FILES_BY_CASE_ID_ENDPOINT(caseIdNum, fileIdNum),
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			const data = await response.json();
			setFile(data);
		} catch (error) {
			console.error("Error fetching file data:", error);
		}
	}, [caseIdNum, fileIdNum, session]);

	useEffect(() => {
		fetchFileData();
	}, [fetchFileData]);

	const handleFileUpdate = ({ updatedFile }: any) => {
		setFile(updatedFile);
		fetchFileData();
	};

	const tabs = [
		{ id: "details", label: "Detalles", icon: FileText },
		{ id: "movements", label: "Movimientos", icon: CalendarDays },
		{ id: "liquidations", label: "Liquidaciones LRT", icon: Calculator },
		{ id: "parts", label: "Partes", icon: Users },
		{ id: "cedulas", label: "Cédulas Automáticas", icon: FileCheck },
		{ id: "expenses", label: "Gastos", icon: DollarSign },
		{ id: "notes", label: "Notas Internas", icon: StickyNote },
	];

	return (
		<div className="space-y-4">
			{file && <FilesHeader file={file} />}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					{/* Tabs Navigation */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
						<div className="flex border-b border-gray-200 dark:border-gray-700">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
											activeTab === tab.id
												? "text-blue-600 dark:text-blue-400"
												: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
										}`}
									>
										<Icon size={18} />
										{tab.label}
										{activeTab === tab.id && (
											<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Tab Content */}
					<div className="space-y-4">
						{activeTab === "details" && file && <FilesDetails file={file} />}
						{activeTab === "movements" && file && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
								<FilesMovements
									movements={file.fileMovements || []}
									onNewMovement={() => setIsNewMovementOpen(true)}
								/>
							</div>
						)}
						{activeTab === "liquidations" && file && (
							<FilesLiquidations caseId={caseIdNum} fileId={fileIdNum} />
						)}
						{activeTab === "parts" && file && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
								<FilesParts
									parts={file.filesParts}
									caseId={caseIdNum}
									fileId={fileIdNum}
									onPartsChange={(updatedParts) => fetchFileData()}
								/>
							</div>
						)}
						{activeTab === "cedulas" && file && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
								<FilesCedulas
									caseId={caseIdNum}
									fileId={fileIdNum}
									cedulas={file.filesCedulas || []}
									parts={file.filesParts || []}
									fileData={file}
									onCedulasChange={(updatedCedulas) => fetchFileData()}
									onRefresh={fetchFileData}
								/>
							</div>
						)}
						{activeTab === "expenses" && file && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
								<FilesExpenses
									expenses={file.filesExpenses}
									caseId={caseIdNum}
									fileId={fileIdNum}
									onExpensesChange={(updatedExpenses) => fetchFileData()}
									onRefresh={fetchFileData}
								/>
							</div>
						)}
						{activeTab === "notes" && file && (
							<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
								<FilesNotes
									fileId={fileIdNum}
									caseId={caseIdNum}
									notes={file.filesNotes || []}
									onNotesChange={(updatedNotes) => fetchFileData()}
									onRefresh={fetchFileData}
								/>
							</div>
						)}
					</div>
				</div>

				<div className="space-y-6">
					{file && (
						<FilesSidebar
							file={file}
							onOpenNewMovement={() => setIsNewMovementOpen(true)}
						/>
					)}
				</div>
			</div>

			{file && (
				<FilesNewMovements
					isOpen={isNewMovementOpen}
					onClose={() => setIsNewMovementOpen(false)}
					file={file}
					onFileUpdate={handleFileUpdate}
				/>
			)}
		</div>
	);
}
