"use client";

import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { SETTINGS_ROLES_ENDPOINT } from "@/constant/api-endpoints";

// Roles internos del equipo - SOLO ESTOS deben mostrarse
const INTERNAL_TEAM_ROLES = [
	"admin",
	"director_general_ceo",
	"gerente_general_coo",
	"directora_area_legal",
	"coordinador_legal",
	"abogado_representante",
	"abogado_interno",
	"asistente_legal",
	"director_area_it",
	"coordinador_it",
	"administrador_sistemas",
	"desarrollador_software",
	"soporte_tecnico",
	"directora_area_ventas",
	"coordinador_ventas",
	"gerente_ventas",
	"ejecutivo_ventas",
	"representante_ventas",
	"analista_ventas",
	"directora_area_marketing",
	"coordinador_marketing",
	"director_marketing",
	"especialista_marketing_digital",
	"disenador_grafico",
	"investigador_mercado",
	"gestor_contenidos",
	"directora_area_contable",
	"coordinador_financiero",
	"director_financiero",
	"contador_senior",
	"analista_financiero",
	"tesorero",
	"auditor_interno",
];

interface Role {
	id: number;
	name: string;
	slug?: string;
	displayName: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

interface RoleOption {
	value: string;
	text: string;
	selected: boolean;
}

interface RoleMultiSelectProps {
	label: string;
	defaultSelected?: string[];
	onChange?: (selected: string[]) => void;
	disabled?: boolean;
}

const RoleMultiSelect: React.FC<RoleMultiSelectProps> = ({
	label,
	defaultSelected = [],
	onChange,
	disabled = false,
}) => {
	const { data: session } = useSession();
	const [roles, setRoles] = useState<Role[]>([]);
	const [options, setOptions] = useState<RoleOption[]>([]);
	const [selectedOptions, setSelectedOptions] =
		useState<string[]>(defaultSelected);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Sincronizar selectedOptions con defaultSelected cuando cambie desde el padre
	useEffect(() => {
		setSelectedOptions(defaultSelected);
	}, [defaultSelected]);

	// Fetch roles from API
	useEffect(() => {
		const fetchRoles = async () => {
			if (!session?.user?.accessToken) return;

			try {
				setIsLoading(true);
				const response = await fetch(`${SETTINGS_ROLES_ENDPOINT}?limit=10000`, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Error fetching roles: ${response.status}`);
				}

				const data = await response.json();

				// Filtrar solo roles internos del equipo
				const filteredRoles = (data.data || []).filter((role: Role) => {
					const roleIdentifier = (role.slug || role.name).toLowerCase();
					return INTERNAL_TEAM_ROLES.includes(roleIdentifier);
				});
				setRoles(filteredRoles);
				// Convert filtered roles to options format
				const roleOptions: RoleOption[] = filteredRoles.map((role: Role) => ({
					value: role.id.toString(),
					text: role.displayName,
					selected: defaultSelected.includes(role.id.toString()),
				}));

				setOptions(roleOptions);
			} catch (error) {
				console.error("Error fetching roles:", error);
				setOptions([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchRoles();
	}, [session?.user?.accessToken, defaultSelected]);

	const toggleDropdown = () => {
		if (disabled || isLoading) return;
		setIsOpen((prev) => !prev);
	};

	const handleSelect = (optionValue: string) => {
		const newSelectedOptions = selectedOptions.includes(optionValue)
			? selectedOptions.filter((value) => value !== optionValue)
			: [...selectedOptions, optionValue];

		setSelectedOptions(newSelectedOptions);
		if (onChange) onChange(newSelectedOptions);
	};

	const removeOption = (valueToRemove: string, event?: React.MouseEvent) => {
		if (event) {
			event.stopPropagation();
		}
		const newSelectedOptions = selectedOptions.filter(
			(value) => value !== valueToRemove,
		);
		setSelectedOptions(newSelectedOptions);
		if (onChange) onChange(newSelectedOptions);
	};

	const clearAll = (event?: React.MouseEvent) => {
		if (event) {
			event.stopPropagation();
		}
		setSelectedOptions([]);
		if (onChange) onChange([]);
	};

	// Crear un mapa de valores a textos para mejor rendimiento
	const valueToTextMap = options.reduce(
		(acc, option) => {
			acc[option.value] = option.text;
			return acc;
		},
		{} as Record<string, string>,
	);

	// Cerrar dropdown cuando se hace click fuera
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest(".role-multiselect-container")) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<div className="w-full role-multiselect-container">
			<label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
				{label}
			</label>

			<div className="relative z-20 inline-block w-full">
				<div className="relative flex flex-col items-center">
					<div onClick={toggleDropdown} className="w-full cursor-pointer">
						<div className="mb-2 flex min-h-[44px] rounded-lg border border-gray-300 py-1.5 pl-3 pr-3 shadow-theme-xs outline-hidden transition focus:border-primary/30 focus:shadow-focus-ring dark:border-gray-700 dark:bg-gray-900 dark:focus:border-primary/30">
							<div className="flex flex-wrap flex-auto gap-2 items-center">
								{selectedOptions.length > 0 ? (
									selectedOptions.map((value) => {
										const text = valueToTextMap[value] || value;
										return (
											<div
												key={`selected-${value}`}
												className="group flex items-center justify-center rounded-full border-[0.7px] border-transparent bg-gray-100 py-1 pl-2.5 pr-2 text-sm text-gray-800 hover:border-gray-200 dark:bg-gray-800 dark:text-white/90 dark:hover:border-gray-800"
											>
												<span className="flex-initial max-w-full">{text}</span>
												<div className="flex flex-row-reverse flex-auto">
													<div
														onClick={(e) => removeOption(value, e)}
														className="pl-2 text-gray-500 cursor-pointer group-hover:text-gray-400 dark:text-gray-400 hover:text-red-500"
														title={`Eliminar ${text}`}
													>
														<svg
															className="fill-current"
															role="button"
															width="14"
															height="14"
															viewBox="0 0 14 14"
															xmlns="http://www.w3.org/2000/svg"
														>
															<path
																fillRule="evenodd"
																clipRule="evenodd"
																d="M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z"
															/>
														</svg>
													</div>
												</div>
											</div>
										);
									})
								) : (
									<div className="w-full py-2">
										<span className="text-sm text-gray-500 dark:text-gray-400">
											{isLoading ? "Cargando roles..." : "Seleccionar roles"}
										</span>
									</div>
								)}
							</div>
							<div className="flex items-center py-1 pl-1 pr-1 w-7">
								{selectedOptions.length > 0 && (
									<button
										type="button"
										onClick={clearAll}
										className="w-4 h-4 mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
										title="Limpiar selección"
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<line x1="18" y1="6" x2="6" y2="18"></line>
											<line x1="6" y1="6" x2="18" y2="18"></line>
										</svg>
									</button>
								)}
								<button
									type="button"
									onClick={toggleDropdown}
									className="w-5 h-5 text-gray-700 outline-hidden cursor-pointer focus:outline-hidden dark:text-gray-400"
									disabled={isLoading}
								>
									<svg
										className={`stroke-current transition-transform ${isOpen ? "rotate-180" : ""}`}
										width="20"
										height="20"
										viewBox="0 0 20 20"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
							</div>
						</div>
					</div>

					{isOpen && !isLoading && (
						<div
							className="absolute left-0 z-40 w-full overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 top-full max-h-60 dark:bg-gray-900 dark:border-gray-700"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex flex-col">
								{options.length > 0 ? (
									options.map((option) => (
										<div key={`option-${option.value}`}>
											<div
												className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 w-full cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors`}
												onClick={() => handleSelect(option.value)}
											>
												<div
													className={`relative flex w-full items-center p-3 ${
														selectedOptions.includes(option.value)
															? "bg-blue-50 dark:bg-blue-900/20"
															: ""
													}`}
												>
													<div className="flex items-center">
														<input
															type="checkbox"
															checked={selectedOptions.includes(option.value)}
															onChange={() => {}} // Controlled by onClick
															className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
															readOnly
														/>
														<div className="leading-6 text-gray-800 dark:text-white/90">
															{option.text}
														</div>
													</div>
												</div>
											</div>
										</div>
									))
								) : (
									<div className="p-3 text-gray-500 dark:text-gray-400">
										No hay roles disponibles
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default RoleMultiSelect;
