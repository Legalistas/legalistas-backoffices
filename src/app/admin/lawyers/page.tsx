"use client";

import {
	CheckCircle2,
	Loader2,
	Pencil,
	Plus,
	Search,
	Trash2,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	SRT_LAWYER_BY_ID_ENDPOINT,
	SRT_LAWYERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import type { SrtLawyer } from "@/types/srt";
import { LawyerFormDialog } from "./LawyerFormDialog";

export default function LawyersPage() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();

	const [lawyers, setLawyers] = useState<SrtLawyer[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingUserId, setEditingUserId] = useState<number | null>(null);

	const fetchLawyers = useCallback(async () => {
		if (!token) return;
		try {
			const res = await fetch(
				`${SRT_LAWYERS_ENDPOINT}?includeIncomplete=true`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (!res.ok) throw new Error("Error al cargar abogados");
			const data = await res.json();
			setLawyers(data.lawyers || []);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchLawyers();
	}, [fetchLawyers]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return lawyers;
		return lawyers.filter(
			(l) =>
				l.name.toLowerCase().includes(q) ||
				l.email?.toLowerCase().includes(q) ||
				l.srtMatricula?.toLowerCase().includes(q) ||
				l.cuit?.toLowerCase().includes(q),
		);
	}, [lawyers, search]);

	const handleNew = () => {
		setEditingUserId(null);
		setDialogOpen(true);
	};

	const handleEdit = (userId: number) => {
		setEditingUserId(userId);
		setDialogOpen(true);
	};

	const handleDelete = async (l: SrtLawyer) => {
		const ok = await confirm({
			title: `Remover rol de abogado a ${l.name}?`,
			description:
				"El usuario deja de aparecer en el desplegable de formularios SRT. Sus datos SRT y el historial de formularios generados se conservan.",
			confirmLabel: "Remover",
			variant: "destructive",
		});
		if (!ok) return;
		try {
			const res = await fetch(SRT_LAWYER_BY_ID_ENDPOINT(l.userId), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.error || "Error al remover");
			}
			toast.success("Rol removido");
			fetchLawyers();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	return (
		<div className="p-6 space-y-4 max-w-6xl mx-auto">
			<div className="flex justify-between items-start">
				<div>
					<h1 className="text-xl font-semibold">Abogados SRT</h1>
					<p className="text-sm text-muted-foreground">
						Maestro de letrados patrocinantes usado por el generador de
						formularios SRT. Solo los usuarios con matrícula cargada aparecen
						en el desplegable.
					</p>
				</div>
				<Button onClick={handleNew}>
					<Plus className="h-4 w-4 mr-1" />
					Nuevo abogado
				</Button>
			</div>

			<div className="relative max-w-sm">
				<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Buscar por nombre, email, matrícula o CUIT…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-8"
				/>
			</div>

			{loading ? (
				<div className="flex justify-center py-10">
					<Loader2 className="animate-spin h-6 w-6" />
				</div>
			) : (
				<div className="border rounded-md">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nombre</TableHead>
								<TableHead>CUIT</TableHead>
								<TableHead>Matrícula</TableHead>
								<TableHead>Jurisdicción</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="text-right">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="text-center text-sm text-muted-foreground py-8"
									>
										{search
											? "Sin resultados."
											: "No hay abogados cargados todavía."}
									</TableCell>
								</TableRow>
							) : (
								filtered.map((l) => (
									<TableRow key={l.userId}>
										<TableCell>
											<div className="font-medium">{l.name}</div>
											<div className="text-xs text-muted-foreground">
												{l.email ?? "—"}
											</div>
										</TableCell>
										<TableCell className="text-sm">{l.cuit ?? "—"}</TableCell>
										<TableCell className="text-sm">
											{l.srtMatricula ?? "—"}
										</TableCell>
										<TableCell className="text-sm">
											{l.srtBarJurisdiction ?? "—"}
										</TableCell>
										<TableCell>
											{l.isCompleteLawyer ? (
												<Badge className="bg-green-600">
													<CheckCircle2 className="h-3 w-3 mr-1" />
													Completo
												</Badge>
											) : (
												<Badge variant="secondary">
													<XCircle className="h-3 w-3 mr-1" />
													Incompleto
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEdit(l.userId)}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDelete(l)}
											>
												<Trash2 className="h-4 w-4 text-destructive" />
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}

			<LawyerFormDialog
				open={dialogOpen}
				userId={editingUserId}
				onClose={() => setDialogOpen(false)}
				onSaved={() => {
					setDialogOpen(false);
					fetchLawyers();
				}}
			/>

			{ConfirmationDialog}
		</div>
	);
}
