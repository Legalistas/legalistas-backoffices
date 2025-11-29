"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import Button from "@/components/ui/button/Button"

export default function TimezoneDebug() {
    const [currentTime, setCurrentTime] = useState<string>("")
    const [timezoneOffset, setTimezoneOffset] = useState<string>("")
    const [timezoneInfo, setTimezoneInfo] = useState<string>("")
    const [apiTime, setApiTime] = useState<string>("")
    const [localApiTime, setLocalApiTime] = useState<string>("")
    const [diffMinutes, setDiffMinutes] = useState<number>(0)

    useEffect(() => {
        updateTimes()
        const interval = setInterval(updateTimes, 1000)
        return () => clearInterval(interval)
    }, [])

    const updateTimes = () => {
        const now = new Date()
        setCurrentTime(now.toString())

        // Obtener información de zona horaria
        const offset = now.getTimezoneOffset()
        const offsetHours = Math.abs(Math.floor(offset / 60))
        const offsetMinutes = Math.abs(offset % 60)
        const offsetSign = offset <= 0 ? "+" : "-"

        setTimezoneOffset(
            `UTC${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`,
        )
        setTimezoneInfo(`Offset en minutos: ${offset}, Nombre: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)

        // Procesar la fecha de la API
        const apiDate = new Date("2025-05-20T19:01:23.000Z")
        setApiTime(apiDate.toISOString())
        setLocalApiTime(apiDate.toString())

        // Calcular diferencia en minutos
        const diffMs = now.getTime() - apiDate.getTime()
        setDiffMinutes(Math.floor(diffMs / (1000 * 60)))
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Depurador de Zona Horaria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="font-medium mb-1">Hora actual:</h3>
                    <p className="text-sm">{currentTime}</p>
                </div>

                <div>
                    <h3 className="font-medium mb-1">Zona horaria:</h3>
                    <p className="text-sm">{timezoneOffset}</p>
                    <p className="text-xs text-muted-foreground">{timezoneInfo}</p>
                </div>

                <div>
                    <h3 className="font-medium mb-1">Fecha de la API (UTC):</h3>
                    <p className="text-sm">{apiTime}</p>
                </div>

                <div>
                    <h3 className="font-medium mb-1">Fecha de la API (Local):</h3>
                    <p className="text-sm">{localApiTime}</p>
                </div>

                <div>
                    <h3 className="font-medium mb-1">Diferencia en minutos:</h3>
                    <p className="text-sm">
                        {diffMinutes} minutos ({Math.floor(diffMinutes / 60)} horas y {diffMinutes % 60} minutos)
                    </p>
                </div>

                <Button onClick={updateTimes} className="mt-4">
                    Actualizar
                </Button>
            </CardContent>
        </Card>
    )
}
