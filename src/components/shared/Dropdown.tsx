"use client";
import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DropdownProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
	isOpen,
	onClose,
	children,
	className = "",
}) => {
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				!(event.target as HTMLElement).closest(".dropdown-toggle")
			) {
				onClose();
			}
		};

		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscapeKey);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [onClose]);

	if (!isOpen) return null;

	return (
		<div
			ref={dropdownRef}
			className={cn(
				"absolute z-50 right-0 mt-2 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
				className,
			)}
		>
			{children}
		</div>
	);
};
