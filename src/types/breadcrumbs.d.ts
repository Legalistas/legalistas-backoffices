import type { ReactNode } from "react";

export interface BreadcrumbItem {
	title: string;
	href: string;
	icon?: ReactNode;
}
