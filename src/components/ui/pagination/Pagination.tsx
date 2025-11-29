"use client"

import Button from "@/components/ui/button/Button"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
}

export const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) => {
    // Solo ocultar si no hay items, pero permitir mostrar aunque sea 1 página
    if (totalItems === 0) return null

    // Calculate the range of items being displayed
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    // Function to generate page numbers with ellipsis for large page counts
    const getPageNumbers = () => {
        const maxPagesToShow = 5
        const pages = []

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            pages.push(1)

            let startPage = Math.max(2, currentPage - 1)
            let endPage = Math.min(totalPages - 1, currentPage + 1)

            if (currentPage <= 3) {
                startPage = 2
                endPage = Math.min(totalPages - 1, maxPagesToShow - 1)
            }

            if (currentPage >= totalPages - 2) {
                startPage = Math.max(2, totalPages - maxPagesToShow + 2)
                endPage = totalPages - 1
            }

            if (startPage > 2) {
                pages.push("ellipsis-start")
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i)
            }

            if (endPage < totalPages - 1) {
                pages.push("ellipsis-end")
            }

            if (totalPages > 1) {
                pages.push(totalPages)
            }
        }

        return pages
    }

    const pageNumbers = getPageNumbers()

    return (
        <div className="flex items-center justify-between mt-4 py-3">
            {/* Mobile view */}
            <div className="flex flex-1 justify-between sm:hidden">
                <Button
                    variant="outline"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                </Button>
                <span className="self-center text-sm text-gray-700 font-medium">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm"
                >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Desktop view */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{startItem}</span> a <span className="font-medium">{endItem}</span>{" "}
                        de <span className="font-medium">{totalItems}</span> resultados
                    </p>
                </div>
                <div>
                    <nav className="inline-flex -space-x-px" aria-label="Pagination">
                        {/* First page button */}
                        <Button
                            variant="outline"
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                            title="Primera página"
                        >
                            <ChevronFirst className="h-4 w-4" />
                        </Button>

                        {/* Previous page button */}
                        <Button
                            variant="outline"
                            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            title="Página anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Page numbers */}
                        {pageNumbers.map((page, index) => {
                            if (page === "ellipsis-start" || page === "ellipsis-end") {
                                return (
                                    <span
                                        key={`ellipsis-${index}`}
                                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                                    >
                                        ...
                                    </span>
                                )
                            }

                            const isActive = Number(page) === currentPage

                            return (
                                <button
                                    key={`page-${page}`}
                                    type="button"
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset focus:z-20 focus:outline-offset-0 transition-colors ${isActive
                                            ? "z-10 bg-[#09A4B5] text-white ring-[#09A4B5] hover:bg-[#09A4B5]/90"
                                            : "text-gray-900 ring-gray-300 hover:bg-gray-50 bg-white"
                                        }`}
                                    onClick={() => onPageChange(page as number)}
                                >
                                    {page}
                                </button>
                            )
                        })}

                        {/* Next page button */}
                        <Button
                            variant="outline"
                            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            title="Página siguiente"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>

                        {/* Last page button */}
                        <Button
                            variant="outline"
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            title="Última página"
                        >
                            <ChevronLast className="h-4 w-4" />
                        </Button>
                    </nav>
                </div>
            </div>
        </div>
    )
}
