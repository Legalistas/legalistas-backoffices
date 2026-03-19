"use client";

import {
	Pagination as ShadcnPagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}

export const Pagination = ({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
}: PaginationProps) => {
	if (totalItems === 0) return null;

	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);

	const getPageNumbers = () => {
		const maxPagesToShow = 5;
		const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

		if (totalPages <= maxPagesToShow) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			pages.push(1);

			let startPage = Math.max(2, currentPage - 1);
			let endPage = Math.min(totalPages - 1, currentPage + 1);

			if (currentPage <= 3) {
				startPage = 2;
				endPage = Math.min(totalPages - 1, maxPagesToShow - 1);
			}

			if (currentPage >= totalPages - 2) {
				startPage = Math.max(2, totalPages - maxPagesToShow + 2);
				endPage = totalPages - 1;
			}

			if (startPage > 2) {
				pages.push("ellipsis-start");
			}

			for (let i = startPage; i <= endPage; i++) {
				pages.push(i);
			}

			if (endPage < totalPages - 1) {
				pages.push("ellipsis-end");
			}

			if (totalPages > 1) {
				pages.push(totalPages);
			}
		}

		return pages;
	};

	const pageNumbers = getPageNumbers();

	return (
		<div className="flex items-center justify-between py-3">
			<p className="text-sm text-muted-foreground">
				Mostrando <span className="font-medium">{startItem}</span> a{" "}
				<span className="font-medium">{endItem}</span> de{" "}
				<span className="font-medium">{totalItems}</span> resultados
			</p>

			<ShadcnPagination className="w-auto mx-0 justify-end">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							href="#"
							onClick={(e) => {
								e.preventDefault();
								if (currentPage > 1) onPageChange(currentPage - 1);
							}}
							className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
						/>
					</PaginationItem>

					{pageNumbers.map((page, index) => {
						if (page === "ellipsis-start" || page === "ellipsis-end") {
							return (
								<PaginationItem key={`ellipsis-${index}`}>
									<PaginationEllipsis />
								</PaginationItem>
							);
						}

						return (
							<PaginationItem key={`page-${page}`}>
								<PaginationLink
									href="#"
									isActive={page === currentPage}
									onClick={(e) => {
										e.preventDefault();
										onPageChange(page as number);
									}}
									className="cursor-pointer"
								>
									{page}
								</PaginationLink>
							</PaginationItem>
						);
					})}

					<PaginationItem>
						<PaginationNext
							href="#"
							onClick={(e) => {
								e.preventDefault();
								if (currentPage < totalPages) onPageChange(currentPage + 1);
							}}
							className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
						/>
					</PaginationItem>
				</PaginationContent>
			</ShadcnPagination>
		</div>
	);
};
