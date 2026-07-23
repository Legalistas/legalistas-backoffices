"use client";

import { Download, FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	CASE_SRT_FORM_DOWNLOAD_ENDPOINT,
	CASE_SRT_FORMS_ENDPOINT,
} from "@/constant/api-endpoints";
import type { SrtFormListItem } from "@/types/srt";

interface SrtFormsHistoryProps {
	caseId: string | number;
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SrtFormsHistory({ caseId }: SrtFormsHistoryProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const caseIdNum = Number(caseId);

	const [forms, setForms] = useState<SrtFormListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [downloadingId, setDownloadingId] = useState<number | null>(null);

	const fetchForms = useCallback(async () => {
		if (!token) return;
		try {
			const res = await fetch(CASE_SRT_FORMS_ENDPOINT(caseIdNum), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Error al cargar historial");
			const data = await res.json();
			setForms(data.forms || []);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [caseIdNum, token]);

	useEffect(() => {
		fetchForms();
	}, [fetchForms]);

	const handleDownload = async (formId: number) => {
		if (!token) return;
		setDownloadingId(formId);
		try {
			// Pedimos JSON con el URL firmado en vez de un redirect para
			// abrir en nueva pestaña sin pasar por el fetch con auth.
			const res = await fetch(
				`${CASE_SRT_FORM_DOWNLOAD_ENDPOINT(caseIdNum, formId)}?url=1`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (res.ok) {
				const data = await res.json().catch(() => null);
				if (data?.url) {
					window.open(data.url, "_blank");
					return;
				}
			}
			// Fallback: descargar como blob (para formularios sin MinIO).
			const blobRes = await fetch(
				CASE_SRT_FORM_DOWNLOAD_ENDPOINT(caseIdNum, formId),
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (!blobRes.ok) throw new Error("Error al descargar");
			const blob = await blobRes.blob();
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setDownloadingId(null);
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle className="text-base flex items-center gap-2">
					<FileText className="h-4 w-4" />
					Formularios SRT generados
				</CardTitle>
				<Link href={`/admin/legal-cases/${caseIdNum}/srt-forms/new`}>
					<Button size="sm">
						<Plus className="h-4 w-4 mr-1" />
						Generar formulario
					</Button>
				</Link>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex justify-center py-6">
						<Loader2 className="animate-spin h-5 w-5" />
					</div>
				) : forms.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No se generaron formularios todavía.
					</p>
				) : (
					<div className="divide-y">
						{forms.map((f) => (
							<div
								key={f.id}
								className="flex items-center justify-between py-2"
							>
								<div className="flex-1 min-w-0">
									<div className="font-medium truncate">
										{f.procedureLabel}
									</div>
									<div className="text-xs text-muted-foreground">
										{formatDate(f.createdAt)}
										{f.lawyerName ? ` · Letrado: ${f.lawyerName}` : ""}
										{f.generatedByName ? ` · Por: ${f.generatedByName}` : ""}
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDownload(f.id)}
									disabled={downloadingId === f.id}
								>
									{downloadingId === f.id ? (
										<Loader2 className="animate-spin h-4 w-4" />
									) : (
										<Download className="h-4 w-4" />
									)}
								</Button>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
