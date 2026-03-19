"use client";

import { AlertTriangle, Info, Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
	onConfirm: () => void;
}

const VARIANT_CONFIG = {
	destructive: {
		icon: Trash2,
		mediaBg: "bg-red-100 dark:bg-red-900/30",
		iconColor: "text-red-600 dark:text-red-400",
		defaultTitle: "Confirmar eliminación",
		defaultLabel: "Eliminar",
	},
	default: {
		icon: Info,
		mediaBg: "bg-primary/10",
		iconColor: "text-primary",
		defaultTitle: "¿Estás seguro?",
		defaultLabel: "Confirmar",
	},
};

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancelar",
	variant = "destructive",
	onConfirm,
}: ConfirmDialogProps) {
	const config = VARIANT_CONFIG[variant];
	const Icon = config.icon;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogMedia className={config.mediaBg}>
						<Icon className={`h-6 w-6 ${config.iconColor}`} />
					</AlertDialogMedia>
					<AlertDialogTitle>
						{title || config.defaultTitle}
					</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
					<AlertDialogAction
						variant={variant}
						onClick={onConfirm}
					>
						{confirmLabel || config.defaultLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
