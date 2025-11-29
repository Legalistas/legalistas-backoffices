"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { ArrowDown, ArrowUp } from "lucide-react"

interface StatCardProps {
    title: string
    value: number | string
    trend: number
    icon: React.ReactNode
}

export function StatCard({ title, value, trend, icon }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                    {trend >= 0 ? (
                        <>
                            <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500">{trend}%</span>
                        </>
                    ) : (
                        <>
                            <ArrowDown className="mr-1 h-3 w-3 text-rose-500" />
                            <span className="text-rose-500">{Math.abs(trend)}%</span>
                        </>
                    )}
                    <span className="ml-1">vs. período anterior</span>
                </div>
            </CardContent>
        </Card>
    )
}