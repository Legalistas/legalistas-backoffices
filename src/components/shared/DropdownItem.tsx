import Link from "next/link";
import type React from "react";
import { cn } from "@/lib/utils";

interface DropdownItemProps {
	tag?: "a" | "button";
	href?: string;
	onClick?: () => void;
	onItemClick?: () => void;
	baseClassName?: string;
	className?: string;
	children: React.ReactNode;
}

const defaultBaseClassName =
	"relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground";

export const DropdownItem: React.FC<DropdownItemProps> = ({
	tag = "button",
	href,
	onClick,
	onItemClick,
	baseClassName = defaultBaseClassName,
	className = "",
	children,
}) => {
	const combinedClasses = cn(baseClassName, className);

	const handleClick = (event: React.MouseEvent) => {
		if (tag === "button") {
			event.preventDefault();
		}
		if (onClick) onClick();
		if (onItemClick) onItemClick();
	};

	if (tag === "a" && href) {
		return (
			<Link href={href} className={combinedClasses} onClick={handleClick}>
				{children}
			</Link>
		);
	}

	return (
		<button type="button" onClick={handleClick} className={combinedClasses}>
			{children}
		</button>
	);
};
