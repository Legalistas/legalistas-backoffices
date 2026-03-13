"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface GroupAvatarUser {
    name?: string
    image?: string
}

interface GroupAvatarProps {
    users: GroupAvatarUser[]
    max?: number
    size?: "xs" | "sm" | "md"
    className?: string
}

const sizeClasses = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-6 w-6 text-[9px]",
    md: "h-8 w-8 text-xs",
}

const imageSize = {
    xs: 20,
    sm: 24,
    md: 32,
}

function resolveImageSrc(image: string): string {
    if (image.startsWith("http")) return image
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}${image}`
}

export function GroupAvatar({ users, max = 3, size = "xs", className }: GroupAvatarProps) {
    const visible = users.slice(0, max)
    const remaining = users.length - max

    return (
        <div className={cn("flex items-center -space-x-1.5", className)}>
            {visible.map((user, i) => (
                <div
                    key={i}
                    className={cn(
                        "relative rounded-full ring-2 ring-white dark:ring-gray-800 flex items-center justify-center shrink-0",
                        sizeClasses[size]
                    )}
                    title={user.name}
                >
                    {user.image ? (
                        <Image
                            src={resolveImageSrc(user.image)}
                            alt={user.name || ""}
                            width={imageSize[size]}
                            height={imageSize[size]}
                            className="rounded-full object-cover h-full w-full"
                        />
                    ) : (
                        <span className="flex items-center justify-center h-full w-full rounded-full bg-gray-200 dark:bg-gray-600 font-medium text-gray-600 dark:text-gray-300">
                            {user.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                    )}
                </div>
            ))}
            {remaining > 0 && (
                <div
                    className={cn(
                        "relative rounded-full ring-2 ring-white dark:ring-gray-800 flex items-center justify-center shrink-0 bg-gray-200 dark:bg-gray-600 font-medium text-gray-600 dark:text-gray-300",
                        sizeClasses[size]
                    )}
                >
                    +{remaining}
                </div>
            )}
        </div>
    )
}
