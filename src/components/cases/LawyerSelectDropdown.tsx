"use client";

import { ChevronDown, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LAWYERS_ENDPOINT } from "@/constant/api-endpoints";
import { Role } from "@/constant/user";

interface Lawyer {
	id: number;
	name: string;
	image?: string;
	roleUser?: Array<{
		role?: {
			name: string;
		};
	}>;
}

interface LawyerSelectDropdownProps {
	currentLawyerId: number | undefined;
	currentLawyerName: string | undefined;
	currentLawyerImage: string | undefined;
	type: "responsible" | "internal";
	onLawyerChange: (lawyerId: number) => void;
}

const responsibleRoles = [
	Role.DIRECTOR_GENERAL_CEO,
	Role.GERENTE_GENERAL_COO,
	Role.ABOGADO_REPRESENTANTE,
];

const internalRoles = [Role.ASISTENTE_LEGAL, Role.GERENTE_GENERAL_COO];

export function LawyerSelectDropdown({
	currentLawyerId,
	currentLawyerName,
	currentLawyerImage,
	type,
	onLawyerChange,
}: LawyerSelectDropdownProps) {
	const { data: session } = useSession();
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [lawyers, setLawyers] = useState<Lawyer[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasFetched, setHasFetched] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const buttonRef = useRef<HTMLButtonElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [dropdownPosition, setDropdownPosition] = useState({
		top: 0,
		left: 0,
		width: 0,
	});

	useEffect(() => {
		setMounted(true);
	}, []);

	const fetchLawyers = useCallback(async () => {
		if (hasFetched || !session?.user?.accessToken) return;
		setIsLoading(true);
		try {
			const response = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			if (!response.ok) return;
			const data = await response.json();
			if (data?.data) {
				const roles = type === "responsible" ? responsibleRoles : internalRoles;
				const filtered = data.data.filter((lawyer: Lawyer) =>
					lawyer.roleUser?.some((ru) => roles.includes(ru.role?.name as Role)),
				);
				setLawyers(filtered);
			}
		} catch (error) {
			console.error("Error fetching lawyers:", error);
		} finally {
			setIsLoading(false);
			setHasFetched(true);
		}
	}, [session?.user?.accessToken, type, hasFetched]);

	useEffect(() => {
		if (isOpen && !hasFetched) {
			fetchLawyers();
		}
	}, [isOpen, hasFetched, fetchLawyers]);

	useEffect(() => {
		if (isOpen && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			setDropdownPosition({
				top: rect.bottom + window.scrollY + 4,
				left: rect.left + window.scrollX,
				width: Math.max(rect.width, 220),
			});
			setTimeout(() => searchInputRef.current?.focus(), 50);
		} else {
			setSearchTerm("");
		}
	}, [isOpen]);

	const filteredLawyers = lawyers.filter((l) =>
		l.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	useEffect(() => {
		if (!isOpen) return;
		const handleScroll = (e: Event) => {
			if (dropdownRef.current?.contains(e.target as Node)) return;
			setIsOpen(false);
		};
		window.addEventListener("scroll", handleScroll, true);
		return () => window.removeEventListener("scroll", handleScroll, true);
	}, [isOpen]);

	const getLawyerImgSrc = (image?: string) => {
		if (!image) return null;
		return image.startsWith("http")
			? image
			: `${process.env.NEXT_PUBLIC_BACKEND_URL}${image}`;
	};

	const dropdown =
		isOpen && mounted
			? createPortal(
					<>
						<div
							className="fixed inset-0 z-[9998]"
							onClick={() => setIsOpen(false)}
						/>
						<div
							ref={dropdownRef}
							className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 flex flex-col"
							style={{
								top: dropdownPosition.top,
								left: dropdownPosition.left,
								minWidth: dropdownPosition.width,
							}}
						>
							{/* Search input */}
							<div className="px-2 py-2 border-b border-gray-100">
								<div className="relative">
									<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
									<input
										ref={searchInputRef}
										type="text"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										placeholder="Buscar abogado..."
										className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-400"
										onClick={(e) => e.stopPropagation()}
									/>
								</div>
							</div>
							{/* Lawyer list */}
							<div className="overflow-auto py-1 max-h-52">
								{isLoading ? (
									<div className="flex items-center justify-center py-4">
										<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
									</div>
								) : filteredLawyers.length === 0 ? (
									<div className="px-3 py-2 text-xs text-gray-500">
										{lawyers.length === 0
											? "No hay abogados disponibles"
											: "Sin resultados"}
									</div>
								) : (
									filteredLawyers.map((lawyer) => (
										<button
											key={lawyer.id}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												if (lawyer.id !== currentLawyerId) {
													onLawyerChange(lawyer.id);
												}
												setIsOpen(false);
											}}
											className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
												lawyer.id === currentLawyerId
													? "bg-gray-50 font-medium"
													: ""
											}`}
										>
											{getLawyerImgSrc(lawyer.image) ? (
												<Image
													className="w-5 h-5 rounded-full shrink-0"
													src={getLawyerImgSrc(lawyer.image)!}
													alt={lawyer.name}
													width={20}
													height={20}
												/>
											) : (
												<div
													className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-medium ${
														type === "responsible"
															? "bg-blue-100 text-blue-600"
															: "bg-green-100 text-green-600"
													}`}
												>
													{lawyer.name?.charAt(0).toUpperCase() ?? "?"}
												</div>
											)}
											<span className="truncate">{lawyer.name}</span>
										</button>
									))
								)}
							</div>
						</div>
					</>,
					document.body,
				)
			: null;

	const displayImgSrc = getLawyerImgSrc(currentLawyerImage);
	const accentColor = type === "responsible" ? "blue" : "green";

	return (
		<div className="relative">
			<button
				ref={buttonRef}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsOpen(!isOpen);
				}}
				className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
			>
				{displayImgSrc ? (
					<Image
						className="w-5 h-5 rounded-full shrink-0"
						src={displayImgSrc}
						alt={currentLawyerName || ""}
						width={20}
						height={20}
					/>
				) : (
					<div
						className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-medium bg-${accentColor}-100 text-${accentColor}-600`}
					>
						{currentLawyerName?.charAt(0).toUpperCase() ?? "?"}
					</div>
				)}
				<span className="text-sm text-gray-700">
					{currentLawyerName || "Sin asignar"}
				</span>
				<ChevronDown
					className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>
			{dropdown}
		</div>
	);
}
