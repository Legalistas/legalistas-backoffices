"use client";

import { CheckCircle2, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { WebContactSubmission } from "@/types/web-contact";

interface Props {
	submissions: WebContactSubmission[];
	onConvert: (submission: WebContactSubmission) => void;
	onReject: (submission: WebContactSubmission) => void;
}

function fullName(s: WebContactSubmission): string {
	return [s.firstName, s.lastName].filter(Boolean).join(" ") || "Sin nombre";
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function WebContactTable({ submissions, onConvert, onReject }: Props) {
	if (submissions.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
				No hay contactos en esta bandeja.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Fecha</TableHead>
						<TableHead>Origen</TableHead>
						<TableHead>Nombre</TableHead>
						<TableHead>Contacto</TableHead>
						<TableHead>Servicios</TableHead>
						<TableHead className="max-w-xs">Mensaje</TableHead>
						<TableHead className="w-55 text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{submissions.map((s) => (
						<TableRow key={s.id}>
							<TableCell className="whitespace-nowrap text-sm text-slate-600">
								{formatDate(s.createdAt)}
							</TableCell>
							<TableCell className="text-sm text-slate-600">
								{s.origen || <span className="italic text-slate-400">—</span>}
							</TableCell>
							<TableCell className="font-medium">{fullName(s)}</TableCell>
							<TableCell className="text-sm text-slate-600">
								<div>{s.phone}</div>
								<div className="text-slate-400">{s.email}</div>
							</TableCell>
							<TableCell className="text-sm text-slate-600">
								{s.services || <span className="italic text-slate-400">—</span>}
							</TableCell>
							<TableCell className="max-w-xs">
								<div className="truncate text-sm text-slate-600" title={s.message ?? ""}>
									{s.message || <span className="italic text-slate-400">—</span>}
								</div>
							</TableCell>
							<TableCell className="text-right">
								{s.status === "PENDING" ? (
									<div className="flex justify-end gap-2">
										<Button size="sm" onClick={() => onConvert(s)}>
											<UserPlus className="mr-1.5 h-3.5 w-3.5" />
											Cliente potencial
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => onReject(s)}
										>
											<XCircle className="mr-1.5 h-3.5 w-3.5" />
											Rechazar
										</Button>
									</div>
								) : s.status === "CONVERTED" ? (
									<Link href={`/admin/crm/leads/${s.convertedLeadId}`}>
										<Badge variant="secondary" className="gap-1 hover:bg-slate-200">
											<CheckCircle2 className="h-3.5 w-3.5" />
											Lead #{s.convertedLeadId}
										</Badge>
									</Link>
								) : (
									<Badge variant="destructive" className="gap-1">
										<XCircle className="h-3.5 w-3.5" />
										Rechazado
									</Badge>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
