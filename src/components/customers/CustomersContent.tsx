"use client";
import { Plus, Search, Sheet, Loader2, Users2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	CUSTOMERS_ENDPOINT,
	CUSTOMERS_EXPORT_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type { User } from "@/types/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/shared/Pagination";
import CustomerRegistrationModal from "./CustomerRegistrationModal";
import CustomersTable from "./CustomersTable";

interface ApiResponse {
	data: any[];
	meta: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export default function CustomersContent() {
	const { data: session } = useSession();
	const [allCustomers, setAllCustomers] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [hasSearched, setHasSearched] = useState(false);
	const [customerModalOpen, setCustomerModalOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [isExporting, setIsExporting] = useState(false);

	const isInitialRender = useRef(true);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Search filter (sobre el total — sin pestañas activos/archivados)
	const filteredCustomers = useMemo(() => {
		if (!searchTerm.trim()) return allCustomers;

		const searchLower = searchTerm.toLowerCase().trim();
		return allCustomers.filter((customer) => {
			return (
				customer.name?.toLowerCase().includes(searchLower) ||
				customer.email?.toLowerCase().includes(searchLower) ||
				customer.roleUser?.[0]?.role?.displayName
					?.toLowerCase()
					.includes(searchLower)
			);
		});
	}, [allCustomers, searchTerm]);

	// Local pagination
	const paginatedCustomers = useMemo(() => {
		const itemsPerPage = 10;
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredCustomers, currentPage]);

	const localPagination = useMemo(() => {
		const itemsPerPage = 10;
		const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
		return {
			page: currentPage,
			limit: itemsPerPage,
			total: filteredCustomers.length,
			totalPages: totalPages || 1,
		};
	}, [filteredCustomers.length, currentPage]);

	const fetchCustomers = useCallback(async () => {
		try {
			setLoading(true);
			const url = new URL(`${CUSTOMERS_ENDPOINT}`, window.location.origin);
			url.searchParams.append("page", "1");
			url.searchParams.append("limit", "1000000");

			const response = await fetch(url.toString(), {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to fetch members");
			}

			const result: ApiResponse = await response.json();

			const clientesOnly = result.data.filter((user) => {
				return user.roleUser.some(
					(roleUser: any) => roleUser.role.name === "cliente",
				);
			});

			setAllCustomers(clientesOnly);
		} catch (error) {
			toast.error("Error al cargar los clientes");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		if (isInitialRender.current && session?.user?.accessToken) {
			fetchCustomers();
			isInitialRender.current = false;
		}
	}, [fetchCustomers, session?.user?.accessToken]);

	// Reset page when search changes
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	const handleDelete = useCallback(
		async (id: number) => {
			try {
				const response = await fetch(`${USERS_ENDPOINT}/${id}`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});

				if (!response.ok) throw new Error("Failed to delete user");

				toast.success("Cliente eliminado correctamente");
				fetchCustomers();
			} catch (error) {
				console.error("Error al eliminar el cliente:", error);
				toast.error("Error al eliminar el cliente");
			}
		},
		[session?.user?.accessToken, fetchCustomers],
	);

	const handleClearSearch = useCallback(() => {
		setSearchTerm("");
		setHasSearched(false);
		setCurrentPage(1);
	}, []);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchTerm(e.target.value);
			setHasSearched(e.target.value.trim().length > 0);
		},
		[],
	);

	const handleSearch = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		const inputValue = searchInputRef.current?.value || "";
		setSearchTerm(inputValue);
		setHasSearched(inputValue.trim().length > 0);
	}, []);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
	}, []);

	const handleCustomerCreated = () => {
		toast.success("Cliente creado correctamente");
		setCustomerModalOpen(false);
		setEditingCustomer(null);
		setModalMode("create");
		fetchCustomers();
	};

	const handleEdit = useCallback((customer: User) => {
		setEditingCustomer(customer);
		setModalMode("edit");
		setCustomerModalOpen(true);
	}, []);

	const handleCustomerUpdated = () => {
		toast.success("Cliente actualizado correctamente");
		setEditingCustomer(null);
		setModalMode("create");
		fetchCustomers();
	};

	const handleExport = async () => {
		try {
			setIsExporting(true);
			const response = await fetch(CUSTOMERS_EXPORT_ENDPOINT, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!response.ok) throw new Error("Error al exportar");
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const fecha = new Date().toISOString().split("T")[0];
			link.download = `clientes_${fecha}.xlsx`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
			toast.success("Clientes exportados correctamente");
		} catch {
			toast.error("Error al exportar clientes");
		} finally {
			setIsExporting(false);
		}
	};

	const hasActiveFilters = Boolean(searchTerm.trim());

	// Loading skeleton
	if (loading && allCustomers.length === 0 && !hasSearched) {
		return (
			<div>
				<div className="flex flex-col gap-6 mb-2">
					<div className="flex items-center justify-between">
						<Skeleton className="h-8 w-32" />
						<div className="flex gap-2">
							<Skeleton className="h-10 w-28 rounded-lg" />
							<Skeleton className="h-10 w-36 rounded-lg" />
						</div>
					</div>
					<Skeleton className="h-11 w-full max-w-md rounded-lg" />
					<div className="overflow-hidden rounded-xl border border-border">
						<div className="bg-muted/50 px-4 py-3 flex gap-4">
							{[5, 15, 18, 10, 15, 12, 10, 10].map((w, i) => (
								<Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
							))}
						</div>
						{Array.from({ length: 10 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center gap-4 px-4 py-3 border-t border-border"
							>
								<Skeleton className="h-4 w-[5%]" />
								<Skeleton className="h-4 w-[15%]" />
								<Skeleton className="h-4 w-[18%]" />
								<Skeleton className="h-4 w-[10%]" />
								<Skeleton className="h-4 w-[15%]" />
								<Skeleton className="h-4 w-[12%]" />
								<Skeleton className="h-4 w-[10%]" />
								<div className="flex gap-1 ml-auto">
									<Skeleton className="h-7 w-7 rounded-md" />
									<Skeleton className="h-7 w-7 rounded-md" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex flex-col gap-6 mb-2">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
						<Users2 className="h-6 w-6" />
						Clientes
					</h1>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="flex items-center gap-2 p-2"
							onClick={handleExport}
							disabled={isExporting}
							title="Exportar clientes a Excel"
						>
							{isExporting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Sheet className="h-4 w-4" />
							)}
							{isExporting ? "Exportando..." : "Exportar"}
						</Button>
						<Button
							variant="default"
							className="flex items-center gap-2 p-2"
							onClick={() => setCustomerModalOpen(true)}
						>
							<Plus className="h-4 w-4" />
							Nuevo cliente
						</Button>
					</div>
				</div>

				{/* Contador */}
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Users2 className="h-4 w-4" />
					<span>
						<strong className="text-foreground">{allCustomers.length}</strong>{" "}
						cliente{allCustomers.length === 1 ? "" : "s"}
					</span>
				</div>

				{/* Search */}
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative flex-1 min-w-[200px]">
						<form onSubmit={handleSearch} className="w-full">
							<div className="relative">
								<div className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
									<Search className="w-5 h-5 text-muted-foreground" />
								</div>
								<Input
									type="search"
									placeholder="Buscar cliente..."
									className="h-11 w-full rounded-lg border border-input bg-transparent py-2.5 pl-12 pr-14 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary/30 focus:ring-3 focus:ring-primary/10 xl:w-[430px]"
									defaultValue={searchTerm}
									onChange={handleSearchChange}
									ref={searchInputRef}
								/>
								{searchTerm && (
									<button
										type="button"
										onClick={() => {
											setSearchTerm("");
											setHasSearched(false);
										}}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										<span className="sr-only">Clear search</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<line x1="18" y1="6" x2="6" y2="18" />
											<line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								)}
							</div>
						</form>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-hidden rounded-xl border border-border">
					<div className="w-full overflow-x-auto">
						<CustomersTable
							customers={paginatedCustomers}
							hasActiveFilters={hasActiveFilters}
							handleClearSearch={handleClearSearch}
							handleEdit={handleEdit}
							handleDelete={handleDelete}
							isLoading={loading}
						/>
					</div>
				</div>

				{/* Pagination */}
				<Pagination
					currentPage={localPagination.page}
					totalPages={localPagination.totalPages}
					totalItems={localPagination.total}
					itemsPerPage={localPagination.limit}
					onPageChange={handlePageChange}
				/>
			</div>

			{/* Customer Modal */}
			<CustomerRegistrationModal
				isOpen={customerModalOpen}
				onClose={() => {
					setCustomerModalOpen(false);
					setEditingCustomer(null);
					setModalMode("create");
				}}
				onCustomerCreated={handleCustomerCreated}
				onCustomerUpdated={handleCustomerUpdated}
				onRefreshCustomers={fetchCustomers}
				editingCustomer={editingCustomer}
				mode={modalMode}
			/>
		</div>
	);
}
