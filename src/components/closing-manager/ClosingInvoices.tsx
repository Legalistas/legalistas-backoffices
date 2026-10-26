"use client";

import { ExternalLink, FileText, Loader2, Paperclip } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/constant/api-endpoints";

interface StoredFile {
	key: string;
	name: string;
	size: number;
}

interface ClosingInvoicesProps {
	caseId: number;
	/** Folder relative to the case root in MinIO, with trailing slash. */
	subpath: string;
	title: string;
	/** Upload only in the status that asks for the invoice; already attached files stay visible. */
	canUpload: boolean;
}

/**
 * Invoices of a closing. They live in the case folder (Documentos → Facturas …),
 * so they also show up in the case's Archivos tab.
 */
export default function ClosingInvoices({ caseId, subpath, title, canUpload }: ClosingInvoicesProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const inputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<StoredFile[]>([]);
	const [rootKey, setRootKey] = useState("");
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`${API_BASE_URL}/cases/${caseId}/minio/list?subpath=${encodeURIComponent(subpath)}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			setRootKey(body.rootKey ?? "");
			setFiles(body.files ?? []);
		} catch (e) {
			setError((e as Error).message);
			setFiles([]);
		} finally {
			setLoading(false);
		}
	}, [caseId, subpath, token]);

	useEffect(() => {
		load();
	}, [load]);

	const upload = async (list: FileList | null) => {
		if (!token || !list?.length) return;
		setUploading(true);
		try {
			const fd = new FormData();
			fd.append("subpath", subpath);
			for (const f of Array.from(list)) fd.append("files", f, f.name);
			const res = await fetch(`${API_BASE_URL}/cases/${caseId}/minio/upload`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: fd,
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			toast.success(list.length > 1 ? "Facturas adjuntadas" : "Factura adjuntada");
			await load();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	const open = async (file: StoredFile) => {
		if (!token) return;
		try {
			const rel = file.key.slice(rootKey.length);
			const res = await fetch(
				`${API_BASE_URL}/cases/${caseId}/minio/object?subpath=${encodeURIComponent(rel)}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			window.open(body.url, "_blank", "noopener,noreferrer");
		} catch (e) {
			toast.error((e as Error).message);
		}
	};

	if (!canUpload && !loading && files.length === 0) return null;

	return (
		<div className="rounded-xl border border-border p-4 space-y-3">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{title}
				</p>
				{canUpload && (
					<>
						<input
							ref={inputRef}
							type="file"
							multiple
							className="hidden"
							onChange={(e) => upload(e.target.files)}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-1.5"
							disabled={uploading || !!error}
							onClick={() => inputRef.current?.click()}
						>
							{uploading ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Paperclip className="h-3.5 w-3.5" />
							)}
							Adjuntar factura
						</Button>
					</>
				)}
			</div>

			{loading ? (
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			) : error ? (
				<p className="text-sm text-muted-foreground">{error}</p>
			) : files.length === 0 ? (
				<p className="text-sm text-muted-foreground">Todavía no hay facturas adjuntas.</p>
			) : (
				<ul className="divide-y divide-border rounded-md border">
					{files.map((f) => (
						<li key={f.key} className="flex items-center gap-3 px-3 py-2">
							<FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => open(f)}
							>
								<ExternalLink className="h-3.5 w-3.5" />
								Ver
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
