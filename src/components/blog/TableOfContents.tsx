"use client";

import { List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/blog/toc";

interface TableOfContentsProps {
	items: TocItem[];
	className?: string;
}

export function TableOfContents({ items, className }: TableOfContentsProps) {
	if (items.length === 0) return null;
	return (
		<nav
			className={cn(
				"rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4",
				className,
			)}
			aria-label="Tabla de contenidos"
		>
			<h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
				<List className="h-3.5 w-3.5" />
				En este artículo
			</h2>
			<ol className="space-y-1.5 text-sm">
				{items.map((item) => (
					<li key={item.id}>
						<a
							href={`#${item.id}`}
							className="text-gray-700 dark:text-gray-300 hover:text-primary hover:underline transition-colors line-clamp-2"
						>
							{item.text}
						</a>
						{item.children.length > 0 && (
							<ol className="mt-1.5 ml-3 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2.5">
								{item.children.map((child) => (
									<li key={child.id}>
										<a
											href={`#${child.id}`}
											className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary hover:underline transition-colors line-clamp-2"
										>
											{child.text}
										</a>
									</li>
								))}
							</ol>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
