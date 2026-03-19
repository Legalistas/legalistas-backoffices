"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CasesPaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}

export const CasesPagination = ({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
}: CasesPaginationProps) => {
	if (totalPages <= 1) return null;

	// Generate page numbers with ellipsis
	const getPageNumbers = () => {
		const pages: (number | "...")[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push("...");
			for (
				let i = Math.max(2, currentPage - 1);
				i <= Math.min(totalPages - 1, currentPage + 1);
				i++
			) {
				pages.push(i);
			}
			if (currentPage < totalPages - 2) pages.push("...");
			pages.push(totalPages);
		}
		return pages;
	};

	const from = (currentPage - 1) * itemsPerPage + 1;
	const to = Math.min(currentPage * itemsPerPage, totalItems);

	return (
		<div className="flex items-center justify-between mt-4">
			<p className="text-sm text-gray-500 dark:text-gray-400">
				Mostrando{" "}
				<span className="font-medium text-gray-700 dark:text-gray-200">
					{from}
				</span>{" "}
				a{" "}
				<span className="font-medium text-gray-700 dark:text-gray-200">
					{to}
				</span>{" "}
				de{" "}
				<span className="font-medium text-gray-700 dark:text-gray-200">
					{totalItems}
				</span>{" "}
				resultados
			</p>

			<nav className="flex items-center gap-1">
				<Button
					variant="outline"
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				{getPageNumbers().map((page, idx) =>
					page === "..." ? (
						<span
							key={`dots-${idx}`}
							className="flex h-8 w-8 items-center justify-center text-sm text-gray-400 dark:text-gray-500"
						>
							...
						</span>
					) : (
						<Button
							key={page}
							variant={page === currentPage ? "default" : "outline"}
							size="sm"
							className="h-8 w-8 p-0 text-sm"
							onClick={() => onPageChange(page)}
						>
							{page}
						</Button>
					),
				)}

				<Button
					variant="outline"
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</nav>
		</div>
	);
};
