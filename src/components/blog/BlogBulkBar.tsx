"use client";

import { CheckCircle2, FileText, Loader2, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { POST_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";

interface BlogBulkBarProps {
	selectedIds: number[];
	onClear: () => void;
	onChanged: () => void;
}

type Action = "publish" | "draft" | "delete";

export function BlogBulkBar({
	selectedIds,
	onClear,
	onChanged,
}: BlogBulkBarProps) {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [running, setRunning] = useState<Action | null>(null);

	if (selectedIds.length === 0) return null;

	const runBulk = async (action: Action) => {
		if (action === "delete") {
			const ok = await confirm({
				description: `¿Eliminar ${selectedIds.length} post${selectedIds.length > 1 ? "s" : ""}? La acción no se puede deshacer.`,
				confirmLabel: "Eliminar",
			});
			if (!ok) return;
		}
		setRunning(action);
		const headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${session?.user?.accessToken}`,
		};
		const results = await Promise.allSettled(
			selectedIds.map((id) =>
				action === "delete"
					? fetch(POST_BY_ID_ENDPOINT(id), { method: "DELETE", headers })
					: fetch(POST_BY_ID_ENDPOINT(id), {
							method: "PUT",
							headers,
							body: JSON.stringify({ status: action }),
						}),
			),
		);
		const failed = results.filter(
			(r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok),
		).length;
		const ok = results.length - failed;
		if (ok > 0) {
			toast.success(
				`${ok} post${ok > 1 ? "s" : ""} ${
					action === "delete"
						? "eliminado" + (ok > 1 ? "s" : "")
						: action === "publish"
							? "publicado" + (ok > 1 ? "s" : "")
							: "pasado" + (ok > 1 ? "s" : "") + " a borrador"
				}`,
			);
		}
		if (failed > 0) {
			toast.error(`${failed} fallaron`);
		}
		setRunning(null);
		onClear();
		onChanged();
	};

	return (
		<>
			<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg">
				<span className="text-sm font-medium px-2">
					{selectedIds.length} seleccionado{selectedIds.length > 1 ? "s" : ""}
				</span>

				<div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => runBulk("publish")}
					disabled={running !== null}
					className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
				>
					{running === "publish" ? (
						<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
					) : (
						<CheckCircle2 className="h-4 w-4 mr-1.5" />
					)}
					Publicar
				</Button>

				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => runBulk("draft")}
					disabled={running !== null}
					className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
				>
					{running === "draft" ? (
						<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
					) : (
						<FileText className="h-4 w-4 mr-1.5" />
					)}
					Pasar a borrador
				</Button>

				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => runBulk("delete")}
					disabled={running !== null}
					className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
				>
					{running === "delete" ? (
						<Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
					) : (
						<Trash2 className="h-4 w-4 mr-1.5" />
					)}
					Eliminar
				</Button>

				<div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

				<button
					type="button"
					onClick={onClear}
					disabled={running !== null}
					className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/5"
					title="Limpiar selección"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
			{ConfirmationDialog}
		</>
	);
}
