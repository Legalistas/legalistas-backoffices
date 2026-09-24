import { cn } from "@/lib/utils";
import type { PostStatus } from "@/types/blog";

const STATUS_CONFIG: Record<
	PostStatus,
	{ label: string; className: string }
> = {
	publish: {
		label: "Publicado",
		className:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	},
	draft: {
		label: "Borrador",
		className: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
	},
	future: {
		label: "Programado",
		className:
			"bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	},
};

interface PostStatusBadgeProps {
	status: PostStatus;
	className?: string;
}

export function PostStatusBadge({ status, className }: PostStatusBadgeProps) {
	const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
				cfg.className,
				className,
			)}
		>
			{cfg.label}
		</span>
	);
}
