"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/Card";
import dynamic from "next/dynamic";
import type ApexCharts from "react-apexcharts";
import { STATISTICS_CRM_DASHBOARD_ENDPOINT } from '@/constant/api-endpoints';
import { useSession } from "next-auth/react";

// Importar ApexCharts dinámicamente
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface StatsCard {
    oportunidadesCreadas: number;
    oportunidadesGanadas: number;
    oportunidadesPerdidas: number;
    tasaConversion: number;
    tendenciaCreadas: number;
    tendenciaGanadas: number;
    tendenciaPerdidas: number;
    tendenciaConversion: number;
}

export function SalesConversion() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<StatsCard | null>(null);

    useEffect(() => {
        async function fetchStats() {
            if (!session?.user?.id || !session?.user?.accessToken) return;

            try {
                const res = await fetch(`${STATISTICS_CRM_DASHBOARD_ENDPOINT}/${session.user.id}?timeframe=month`, {
                    headers: {
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                });

                if (!res.ok) {
                    throw new Error("Error al cargar estadísticas");
                }

                const data = await res.json();
                setStats(data.statsCard);
            } catch (error) {
                console.error(error);
            }
        }

        fetchStats();
    }, [session?.user?.accessToken, session?.user?.id]);

    if (!stats) {
        return null; // O un loader si querés
    }

    const enProceso = Math.max(0, stats.oportunidadesCreadas - stats.oportunidadesGanadas - stats.oportunidadesPerdidas);

    const conversionData = [
        { name: "Ganadas", value: stats.oportunidadesGanadas, color: "#10b981" },
        { name: "Perdidas", value: stats.oportunidadesPerdidas, color: "#ef4444" },
        { name: "En Proceso", value: enProceso, color: "#3b82f6" },
    ];

    const chartOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "pie",
            fontFamily: "inherit",
            toolbar: {
                show: true,
            },
        },
        labels: conversionData.map((item) => item.name),
        colors: conversionData.map((item) => item.color),
        legend: {
            position: "bottom",
            fontFamily: "inherit",
        },
        plotOptions: {
            pie: {
                donut: {
                    size: "0%",
                },
                dataLabels: {
                    offset: -25,
                },
            },
        },
        dataLabels: {
            formatter: (val: number, opts: any) =>
                opts.w.config.series[opts.seriesIndex] + " (" + val.toFixed(1) + "%)",
            style: {
                fontFamily: "inherit",
            },
        },
        tooltip: {
            y: {
                formatter: (val: number) => val + " oportunidades",
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        height: 300,
                    },
                    legend: {
                        position: "bottom",
                    },
                },
            },
        ],
    };

    const chartSeries = conversionData.map((item) => item.value);

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Tasa de Conversión</CardTitle>
                <CardDescription>Distribución de oportunidades por estado</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {typeof window !== "undefined" && (
                        <ReactApexChart
                            options={chartOptions as ApexCharts.ApexOptions}
                            series={chartSeries}
                            type="pie"
                            height={300}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
