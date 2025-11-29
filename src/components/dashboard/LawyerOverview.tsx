"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card/Card";
import {
    ArrowDown,
    ArrowUp,
    CheckCircle,
    FileCheck,
    Scale,
} from "lucide-react";
import { STATISTICS_LAW_DASHBOARD_ENDPOINT } from "@/constant/api-endpoints";

const currentYear = new Date().getFullYear();
const firstYear = 2020; // Cambiar al primer año que tengas datos

export function LawyerOverview() {
    const { data: session } = useSession();

    // Estados para año y mes
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");

    // Estado para datos
    const [data, setData] = useState<{
        casesCreated: number;
        casesClosed: number;
        tasaConversion: number;
        upcomingHearings: number;
        tendenciaCreadas: number;
        tendenciaCerradas: number;
        tendenciaConversion: number;
    }>({
        casesCreated: 0,
        casesClosed: 0,
        tasaConversion: 0,
        upcomingHearings: 0,
        tendenciaCreadas: 0,
        tendenciaCerradas: 0,
        tendenciaConversion: 0,
    });

    // Generar array años para select
    const years = [];
    for (let y = firstYear; y <= currentYear; y++) {
        years.push(y);
    }

    // Array meses
    const months = [
        { value: "all", label: "Todos" },
        { value: "1", label: "Enero" },
        { value: "2", label: "Febrero" },
        { value: "3", label: "Marzo" },
        { value: "4", label: "Abril" },
        { value: "5", label: "Mayo" },
        { value: "6", label: "Junio" },
        { value: "7", label: "Julio" },
        { value: "8", label: "Agosto" },
        { value: "9", label: "Septiembre" },
        { value: "10", label: "Octubre" },
        { value: "11", label: "Noviembre" },
        { value: "12", label: "Diciembre" },
    ];

    useEffect(() => {
        async function fetchStatistics() {
            if (!session?.user?.id || !session?.user?.accessToken) return;

            // Armar query params
            let queryParams = "";

            if (selectedYear !== "all") {
                queryParams += `year=${selectedYear}`;
            }
            if (selectedMonth !== "all") {
                queryParams += `${queryParams ? "&" : ""}month=${selectedMonth}`;
            }
            if (!queryParams) {
                queryParams = "timeframe=all";
            }

            console.log('Fetching stats with params:', queryParams); // Debug

            try {
                const url = `${STATISTICS_LAW_DASHBOARD_ENDPOINT}/${session.user.id}?${queryParams}`;
                console.log('API URL:', url); // Debug
                
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                });

                if (!res.ok) {
                    console.error("Error fetching legal statistics", res.status, res.statusText);
                    return;
                }

                const stats = await res.json();
                console.log('API Response:', stats); // Debug
                setData(stats.statsCard);
            } catch (error) {
                console.error("Error fetching legal statistics:", error);
            }
        }

        fetchStatistics();
    }, [session, selectedYear, selectedMonth]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-b-muted">
                <CardTitle className="text-lg font-semibold">Resumen Legal</CardTitle>
                <div className="flex gap-4">
                    <div>
                        <label htmlFor="year-select" className="block text-sm font-medium mb-1">
                            Año
                        </label>
                        <select
                            id="year-select"
                            className="border rounded p-1 text-sm"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="all">Todos</option>
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="month-select" className="block text-sm font-medium mb-1">
                            Mes
                        </label>
                        <select
                            id="month-select"
                            className="border rounded p-1 text-sm"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {months.map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Causas a mi nombre"
                        value={data.casesCreated}
                        trend={data.tendenciaCreadas}
                        icon={<Scale className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Cierres Exitosos"
                        value={data.casesClosed}  // aquí estaba mal, ponés casesClosed
                        trend={data.tendenciaCerradas} // actualmente 0, luego si quieres calcular la tendencia la agregas
                        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Audiencias Próximas"
                        value={data.upcomingHearings}
                        trend={0} // no tienes tendencia para audiencias aún
                        icon={<FileCheck className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Tasa de Conversión"
                        value={`${data.tasaConversion}%`}
                        trend={data.tendenciaConversion}
                        icon={<ArrowUp className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function StatCard({
    title,
    value,
    trend,
    icon,
}: {
    title: string;
    value: number | string;
    trend: number;
    icon: React.ReactNode;
}) {
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
    );
}
