"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
	Avatar,
	AvatarFallback,
	AvatarGroup as ShadcnAvatarGroup,
	AvatarGroupCount,
} from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface GroupAvatarUser {
	name?: string;
	image?: string;
}

interface GroupAvatarProps {
	users: GroupAvatarUser[];
	max?: number;
	size?: "xs" | "sm" | "md";
	className?: string;
}

const sizeMap = {
	xs: "sm" as const,
	sm: "sm" as const,
	md: "default" as const,
};

const imageSize = {
	xs: 20,
	sm: 24,
	md: 32,
};

function resolveImageSrc(image: string): string {
	if (image.startsWith("http")) return image;
	return `${process.env.NEXT_PUBLIC_BACKEND_URL}${image}`;
}

export function GroupAvatar({
	users,
	max = 3,
	size = "xs",
	className,
}: GroupAvatarProps) {
	const visible = users.slice(0, max);
	const remaining = users.length - max;

	return (
		<TooltipProvider delayDuration={200}>
			<ShadcnAvatarGroup className={cn("items-center", className)}>
				{visible.map((user, i) => (
					<Tooltip key={i}>
						<TooltipTrigger asChild>
							<Avatar size={sizeMap[size]}>
								{user.image ? (
									<Image
										src={resolveImageSrc(user.image)}
										alt={user.name || ""}
										width={imageSize[size]}
										height={imageSize[size]}
										className="aspect-square size-full object-cover"
									/>
								) : (
									<AvatarFallback>
										{user.name?.charAt(0).toUpperCase() || "?"}
									</AvatarFallback>
								)}
							</Avatar>
						</TooltipTrigger>
						<TooltipContent>
							<p>{user.name || "Sin nombre"}</p>
						</TooltipContent>
					</Tooltip>
				))}
				{remaining > 0 && (
					<Tooltip>
						<TooltipTrigger asChild>
							<AvatarGroupCount>+{remaining}</AvatarGroupCount>
						</TooltipTrigger>
						<TooltipContent>
							<p>{users.slice(max).map(u => u.name).join(", ")}</p>
						</TooltipContent>
					</Tooltip>
				)}
			</ShadcnAvatarGroup>
		</TooltipProvider>
	);
}
