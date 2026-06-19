"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveState =
	| { kind: "idle" }
	| { kind: "saving" }
	| { kind: "saved"; at: Date }
	| { kind: "error"; message: string };

interface UseAutosaveOptions<T> {
	/** Snapshot serializable del estado a guardar. */
	value: T;
	/**
	 * Función que persiste el snapshot. Debe ser idempotente y devolver
	 * cualquier dato relevante (por ej. id del post recién creado).
	 */
	save: (value: T) => Promise<void>;
	/** Intervalo en milisegundos. Default 20s. */
	intervalMs?: number;
	/** Si false, el hook no hace nada. Útil para apagarlo en mid-form invalido. */
	enabled?: boolean;
	/**
	 * Hash del value para detectar cambios. Si dos llamadas dan el mismo
	 * string, se considera que el value no cambió y no se persiste.
	 * Por default usa JSON.stringify.
	 */
	hash?: (value: T) => string;
}

/**
 * Hook de autosave: ejecuta `save` cada `intervalMs` solo cuando el value cambió
 * desde el último guardado exitoso. Expone el estado para mostrarlo en UI.
 *
 * Garantías:
 *   - Una sola operación de save en vuelo a la vez.
 *   - Si `enabled` pasa a false, cancela el timer.
 *   - El primer save no ocurre antes de los `intervalMs` (no hay save inicial
 *     automático — el componente puede llamar a `saveNow()` si lo necesita).
 */
export function useAutosave<T>(opts: UseAutosaveOptions<T>): {
	state: AutosaveState;
	saveNow: () => Promise<void>;
} {
	const { value, save, intervalMs = 20000, enabled = true } = opts;
	const hashFn = opts.hash ?? ((v: T) => JSON.stringify(v));

	const [state, setState] = useState<AutosaveState>({ kind: "idle" });

	const valueRef = useRef(value);
	const lastSavedHashRef = useRef<string | null>(null);
	const savingRef = useRef(false);
	const saveRef = useRef(save);

	// Mantener refs actualizadas sin re-disparar el timer.
	useEffect(() => {
		valueRef.current = value;
	}, [value]);
	useEffect(() => {
		saveRef.current = save;
	}, [save]);

	const runSave = async () => {
		if (savingRef.current) return;
		const currentHash = hashFn(valueRef.current);
		if (lastSavedHashRef.current === currentHash) return;
		savingRef.current = true;
		setState({ kind: "saving" });
		try {
			await saveRef.current(valueRef.current);
			lastSavedHashRef.current = currentHash;
			setState({ kind: "saved", at: new Date() });
		} catch (err) {
			console.error("[useAutosave]", err);
			setState({
				kind: "error",
				message: err instanceof Error ? err.message : "Error al guardar",
			});
		} finally {
			savingRef.current = false;
		}
	};

	useEffect(() => {
		if (!enabled) return;
		const id = setInterval(() => {
			runSave();
		}, intervalMs);
		return () => clearInterval(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, intervalMs]);

	return {
		state,
		saveNow: runSave,
	};
}
