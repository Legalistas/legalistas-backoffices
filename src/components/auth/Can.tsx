"use client"

import React from "react"
import { useSession } from "next-auth/react"

interface CanProps {
    children: React.ReactNode
    role?: string | string[]
    permission?: string | string[]
    fallback?: React.ReactNode
    inverse?: boolean
}

export function Can({ 
    children, 
    role, 
    permission, 
    fallback = null, 
    inverse = false 
}: CanProps) {
    const { data: session, status } = useSession()

    if (status === "loading") {
        return null
    }

    if (!session?.user) {
        return <>{fallback}</>
    }

    const userRole = session.user.role?.toLowerCase?.() ?? session.user.role
    const userPermissions = (session.user as any).permissions || []

    if (role) {
        const rolesToCheck = (Array.isArray(role) ? role : [role]).map(r => r.toLowerCase?.() ?? r)
        const hasRole = rolesToCheck.includes(userRole)

        if (inverse) {
            if (hasRole) {
                return <>{fallback}</>
            }
        } else {
            if (!hasRole) {
                return <>{fallback}</>
            }
        }
    }

    if (permission) {
        const permissionsToCheck = Array.isArray(permission) ? permission : [permission]
        const hasPermission = permissionsToCheck.some(perm => 
            userPermissions.includes(perm)
        )

        if (!hasPermission) {
            return <>{fallback}</>
        }
    }

    return <>{children}</>
}

export default Can