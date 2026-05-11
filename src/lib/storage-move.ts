import {
	CASE_STAGE_TO_STORAGE_SLUG,
	CRM_COLUMN_TO_STAGE_SLUG,
	SECTION_CASES,
	SECTION_CRM,
} from "@/constant/storage-structure";

/**
 * Mueve la carpeta de un lead en MinIO al cambiar de columna del CRM.
 *
 * Reglas (spec 2.3):
 *  - Cambio entre etapas CRM: `crm/<from>/X/` → `crm/<to>/X/`
 *  - Lead pasa a Ganados (col 9): se "marca como ganado" y la carpeta pasa
 *    directamente a `casos/documentacion/X/` (no a `crm/ganados/`).
 *
 * Es "fire-and-forget": no bloquea el flujo si falla, solo loguea el error.
 */
export async function moveLeadFolderOnColumnChange({
	folderName,
	fromColumnId,
	toColumnId,
}: {
	folderName: string | null | undefined;
	fromColumnId: number | null | undefined;
	toColumnId: number;
}): Promise<{ moved: number } | null> {
	if (!folderName) return null;
	if (!fromColumnId || fromColumnId === toColumnId) return null;

	const fromSlug = CRM_COLUMN_TO_STAGE_SLUG[fromColumnId];
	if (!fromSlug) return null;

	let toPrefix: string;
	if (toColumnId === 9) {
		// Ganados → traspaso directo a casos/documentacion/
		toPrefix = `${SECTION_CASES}/documentacion/${folderName}/`;
	} else {
		const toSlug = CRM_COLUMN_TO_STAGE_SLUG[toColumnId];
		if (!toSlug) return null;
		toPrefix = `${SECTION_CRM}/${toSlug}/${folderName}/`;
	}

	const fromPrefix = `${SECTION_CRM}/${fromSlug}/${folderName}/`;
	if (fromPrefix === toPrefix) return null;

	try {
		const res = await fetch("/api/storage/move-folder", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fromPrefix, toPrefix }),
		});
		if (!res.ok) {
			console.error(
				"[storage-move] move-folder failed:",
				res.status,
				await res.text(),
			);
			return null;
		}
		return await res.json();
	} catch (err) {
		console.error("[storage-move] error:", err);
		return null;
	}
}

/**
 * Mueve la carpeta de un caso en MinIO al cambiar de etapa.
 *
 * Regla (spec 2.3): cualquier cambio de etapa en casos → `casos/<from>/X/`
 * a `casos/<to>/X/`. El caso archivado va a `casos/archivado/`.
 *
 * Fire-and-forget igual que la versión de leads.
 */
export async function moveCaseFolderOnStageChange({
	folderName,
	fromStageId,
	toStageId,
}: {
	folderName: string | null | undefined;
	fromStageId: number | null | undefined;
	toStageId: number;
}): Promise<{ moved: number } | null> {
	if (!folderName) return null;
	if (!fromStageId || fromStageId === toStageId) return null;

	const fromSlug = CASE_STAGE_TO_STORAGE_SLUG[fromStageId];
	const toSlug = CASE_STAGE_TO_STORAGE_SLUG[toStageId];
	if (!fromSlug || !toSlug) return null;

	const fromPrefix = `${SECTION_CASES}/${fromSlug}/${folderName}/`;
	const toPrefix = `${SECTION_CASES}/${toSlug}/${folderName}/`;
	if (fromPrefix === toPrefix) return null;

	try {
		const res = await fetch("/api/storage/move-folder", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fromPrefix, toPrefix }),
		});
		if (!res.ok) {
			console.error(
				"[storage-move] move-folder (case) failed:",
				res.status,
				await res.text(),
			);
			return null;
		}
		return await res.json();
	} catch (err) {
		console.error("[storage-move] case error:", err);
		return null;
	}
}
