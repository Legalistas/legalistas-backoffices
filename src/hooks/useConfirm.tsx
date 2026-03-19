"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface ConfirmOptions {
	title?: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
}

export function useConfirm() {
	const [state, setState] = useState<{
		open: boolean;
		options: ConfirmOptions;
		resolve: ((value: boolean) => void) | null;
	}>({
		open: false,
		options: { description: "" },
		resolve: null,
	});

	const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
		return new Promise((resolve) => {
			setState({ open: true, options, resolve });
		});
	}, []);

	const handleConfirm = useCallback(() => {
		state.resolve?.(true);
		setState((prev) => ({ ...prev, open: false, resolve: null }));
	}, [state.resolve]);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				state.resolve?.(false);
				setState((prev) => ({ ...prev, open: false, resolve: null }));
			}
		},
		[state.resolve],
	);

	const ConfirmationDialog = (
		<ConfirmDialog
			open={state.open}
			onOpenChange={handleOpenChange}
			title={state.options.title}
			description={state.options.description}
			confirmLabel={state.options.confirmLabel}
			cancelLabel={state.options.cancelLabel}
			variant={state.options.variant}
			onConfirm={handleConfirm}
		/>
	);

	return { confirm, ConfirmationDialog };
}
