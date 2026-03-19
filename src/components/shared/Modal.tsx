"use client";
import type React from "react";
import {
	Dialog,
	DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	className?: string;
	children: React.ReactNode;
	showCloseButton?: boolean;
	isFullscreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
	isOpen,
	onClose,
	children,
	className,
	showCloseButton = true,
	isFullscreen = false,
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				showCloseButton={showCloseButton}
				aria-describedby={undefined}
				className={cn(
					isFullscreen && "w-full h-full max-w-full rounded-none",
					className,
				)}
			>
				{children}
			</DialogContent>
		</Dialog>
	);
};
