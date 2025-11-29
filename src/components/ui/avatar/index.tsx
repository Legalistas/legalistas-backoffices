"use client"

import * as React from "react"
import Image from "next/image" // Import Next.js Image component
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", {
    variants: {
        size: {
            default: "h-10 w-10",
            sm: "h-8 w-8",
            lg: "h-12 w-12",
        },
    },
    defaultVariants: {
        size: "default",
    },
})

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> { }

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({ className, size, ...props }, ref) => (
    <div ref={ref} className={cn(avatarVariants({ size }), className)} {...props} />
))
Avatar.displayName = "Avatar"

// Use React.ComponentPropsWithoutRef<typeof Image> for props
const AvatarImage = React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<typeof Image>>(
    ({ className, alt = "", src, ...props }, ref) => (
        <Image
            ref={ref}
            className={cn("aspect-square h-full w-full", className)}
            src={src || "/placeholder.svg"} // Provide a default src if none is given
            alt={alt}
            width={40} // Hardcode width and height for fixed size avatars
            height={40}
            {...props}
        />
    ),
)
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
    ({ className, ...props }, ref) => (
        <span
            ref={ref}
            className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
            {...props}
        />
    ),
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }