"use client";

import {
	ChevronLeft,
	ChevronRight,
	Download,
	Target,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { WonLeadPerson } from "./types";

interface WonLeadsTableProps {
	data: WonLeadPerson[];
}

const ITEMS_PER_PAGE = 10;

export function WonLeadsTable({ data }: WonLeadsTableProps) {
	const [page, setPage] = useState(1);

	const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
	const currentData = useMemo(
		() => data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
		[data, page],
	);

	// Reset to page 1 when data changes
	useMemo(() => setPage(1), [data]);

	const handleExportCSV = useCallback(() => {
		if (data.length === 0) return;

		const headers = ["Nombre Completo", "Email", "Vendedor", "Servicio", "Fecha"];
		const rows = data.map((d) => [
			d.nombreCompleto,
			d.email,
			d.vendedor,
			d.servicio,
			d.fecha,
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((r) =>
				r.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");

		const blob = new Blob(["\uFEFF" + csvContent], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `oportunidades-ganadas-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}, [data]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-foreground">
						Oportunidades Ganadas por Persona
					</h2>
					<p className="text-sm text-muted-foreground">
						{data.length} {data.length === 1 ? "resultado" : "resultados"}
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleExportCSV}
					disabled={data.length === 0}
					className="gap-1.5"
				>
					<Download className="h-4 w-4" />
					Exportar CSV
				</Button>
			</div>

			{currentData.length > 0 ? (
				<>
					<div className="overflow-hidden rounded-xl border">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow>
									<TableHead className="px-4 py-3 text-sm font-semibold">
										Nombre Completo
									</TableHead>
									<TableHead className="px-4 py-3 text-sm font-semibold">
										Email
									</TableHead>
									<TableHead className="px-4 py-3 text-sm font-semibold">
										Vendedor
									</TableHead>
									<TableHead className="px-4 py-3 text-sm font-semibold">
										Servicio
									</TableHead>
									<TableHead className="px-4 py-3 text-sm font-semibold">
										Fecha
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{currentData.map((item, i) => (
									<TableRow
										key={`${item.email}-${i}`}
										className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
									>
										<TableCell className="px-4 py-3 text-sm font-medium">
											{item.nombreCompleto}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{item.email}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											{item.vendedor}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm">
											{item.servicio}
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground">
											{item.fecha}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}-
								{Math.min(page * ITEMS_PER_PAGE, data.length)} de {data.length}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(p - 1, 1))}
									disabled={page === 1}
								>
									<ChevronLeft className="h-4 w-4 mr-1" />
									Anterior
								</Button>
								<span className="text-sm text-muted-foreground">
									{page} / {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
									disabled={page === totalPages}
								>
									Siguiente
									<ChevronRight className="h-4 w-4 ml-1" />
								</Button>
							</div>
						</div>
					)}
				</>
			) : (
				<div className="flex items-center justify-center rounded-xl border border-dashed py-12">
					<div className="text-center">
						<Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
						<p className="font-medium text-foreground">
							No hay oportunidades ganadas
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							para los filtros seleccionados
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
