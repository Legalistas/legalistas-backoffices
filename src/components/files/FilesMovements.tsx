"use client";

import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	FileText,
	RefreshCw,
	User,
	Users,
	Video,
	XCircle,
} from "lucide-react";
import React from "react";
import {
	FILES_MOVEMENTS_MODE,
	FILES_MOVEMENTS_STATUS_OPTIONS,
	FILES_MOVEMENTS_TYPE,
} from "@/constant/causes";
import { formatDateCustom } from "@/lib/functions";

interface Movement {
	id: number;
	mode: number;
	type: number;
	subType?: number | null;
	date: string;
	schedule: number;
	status: string;
	observation: string;
	createdAt: string;
	responsiblePerson: {
		id: number;
		name: string;
		email: string;
		image?: string;
	};
}

interface FilesMovementsProps {
	movements: Movement[];
	onNewMovement?: () => void;
}

const getMovementTypeLabel = (type: number): string => {
	const movementType = FILES_MOVEMENTS_TYPE.find((t) => t.value === type);
	return movementType?.label || "Desconocido";
};

const getMovementSubTypeLabel = (
	type: number,
	subType?: number | null,
): string => {
	if (!subType) return "";
	const movementType = FILES_MOVEMENTS_TYPE.find((t) => t.value === type);
	if (!movementType?.subType) return "";
	const subTypeObj = movementType.subType.find((s) => s.value === subType);
	return subTypeObj?.label || "";
};

const getModeLabel = (mode: number): string => {
	const modeObj = FILES_MOVEMENTS_MODE.find((m) => m.value === mode);
	return modeObj?.label || "Desconocido";
};

const getStatusLabel = (status: string): string => {
	const statusObj = FILES_MOVEMENTS_STATUS_OPTIONS.find(
		(s) => s.value === status,
	);
	return statusObj?.label || status;
};

const getStatusIcon = (status: string) => {
	switch (status) {
		case "completado":
			return <CheckCircle className="w-4 h-4 text-green-500" />;
		case "cancelado":
			return <XCircle className="w-4 h-4 text-red-500" />;
		case "reprogramado":
			return <RefreshCw className="w-4 h-4 text-yellow-500" />;
		default:
			return <Clock className="w-4 h-4 text-blue-500" />;
	}
};

const getStatusColor = (status: string): string => {
	switch (status) {
		case "completado":
			return "bg-green-100 text-green-800";
		case "cancelado":
			return "bg-red-100 text-red-800";
		case "reprogramado":
			return "bg-yellow-100 text-yellow-800";
		default:
			return "bg-blue-100 text-blue-800";
	}
};

const getTypeIcon = (type: number) => {
	switch (type) {
		case 1: // Audiencia
			return <Users className="w-5 h-5 text-purple-500" />;
		case 2: // Pericia
			return <FileText className="w-5 h-5 text-orange-500" />;
		case 3: // Vencimiento
			return <AlertTriangle className="w-5 h-5 text-red-500" />;
		case 4: // Reunión
			return <Users className="w-5 h-5 text-blue-500" />;
		case 5: // Videollamada
			return <Video className="w-5 h-5 text-green-500" />;
		default:
			return <Calendar className="w-5 h-5 text-gray-500" />;
	}
};

export default function FilesMovements({
	movements,
	onNewMovement,
}: FilesMovementsProps) {
	if (!movements || movements.length === 0) {
		return (
			<div className="text-center py-12">
				<Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
					No hay movimientos registrados
				</h3>
				<p className="text-gray-500 dark:text-gray-400 mb-4">
					Agrega un nuevo movimiento para comenzar a rastrear la actividad del
					expediente.
				</p>
				{onNewMovement && (
					<button
						onClick={onNewMovement}
						className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
					>
						<Calendar className="w-4 h-4 mr-2" />
						Nuevo Movimiento
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header con botón de nuevo movimiento */}
			<div className="flex justify-between items-center mb-4">
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Historial de Movimientos
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{movements.length} movimiento{movements.length !== 1 ? "s" : ""}{" "}
						registrado{movements.length !== 1 ? "s" : ""}
					</p>
				</div>
				{onNewMovement && (
					<button
						onClick={onNewMovement}
						className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
					>
						<Calendar className="w-4 h-4 mr-2" />
						Nuevo Movimiento
					</button>
				)}
			</div>

			{/* Tabla de movimientos */}
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead className="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								scope="col"
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
							>
								Fecha
							</th>
							<th
								scope="col"
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
							>
								Hora
							</th>
							<th
								scope="col"
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
							>
								Tipo/Subtipo
							</th>
							<th
								scope="col"
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
							>
								Descripción
							</th>
							<th
								scope="col"
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
							>
								Estado
							</th>
							<th
								scope="col"
								className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
							>
								Tamaño
							</th>
						</tr>
					</thead>
					<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
						{movements.map((movement, index) => {
							const movementDate = new Date(movement.date);
							const isUrgent = movement.type === 3; // Vencimiento
							const subTypeLabel = getMovementSubTypeLabel(
								movement.type,
								movement.subType,
							);

							return (
								<tr
									key={movement.id}
									className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isUrgent ? "bg-red-50 dark:bg-red-900/20" : ""}`}
								>
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
										{formatDateCustom(movement.date)}
									</td>
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
										{movementDate.toLocaleTimeString("es-AR", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
									<td className="px-4 py-3 whitespace-nowrap">
										<div className="flex items-center gap-2">
											{getTypeIcon(movement.type)}
											<div>
												<span
													className={`text-sm font-medium ${isUrgent ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}
												>
													{getMovementTypeLabel(movement.type)}
												</span>
												{subTypeLabel && (
													<span className="block text-xs text-gray-500 dark:text-gray-400">
														{subTypeLabel}
													</span>
												)}
											</div>
										</div>
									</td>
									<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
										{movement.observation ? (
											<span title={movement.observation}>
												{movement.observation.length > 50
													? `${movement.observation.substring(0, 50)}...`
													: movement.observation}
											</span>
										) : (
											<span className="text-gray-400 italic">
												Sin descripción
											</span>
										)}
									</td>
									<td className="px-4 py-3 whitespace-nowrap">
										<span
											className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(movement.status)}`}
										>
											{getStatusIcon(movement.status)}
											{getStatusLabel(movement.status)}
										</span>
									</td>
									<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
										{/* Tamaño - placeholder para documentos adjuntos */}-
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Leyenda de tipos */}
			<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
				<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
					Tipos de movimiento:
				</p>
				<div className="flex flex-wrap gap-4 text-xs">
					{FILES_MOVEMENTS_TYPE.map((type) => (
						<div key={type.id} className="flex items-center gap-1">
							{getTypeIcon(type.value)}
							<span className="text-gray-600 dark:text-gray-400">
								{type.label}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
