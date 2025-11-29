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
    Calendar,
    FileText,
    User,
    Clock,
} from "lucide-react";
import { RECENT_CASES_ENDPOINT } from "@/constant/api-endpoints";

const currentYear = new Date().getFullYear();
const firstYear = 2020;

interface RecentCase {
    id: number;
    number: string;
    customerId: number;
    title: string;
    status: string;
    isActive: boolean;
    internalLawyerId: number;
    responsibleLawyerId: number;
    createdAt: string;
    updatedAt: string;
    isArchived: boolean;
    servicesId: number;
    stageId: number;
    statusDate: string | null;
}

export function RecentCases() {
    const { data: session } = useSession();

    // Estados para año y mes
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");

    // Estado para datos
    const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

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
        async function fetchRecentCases() {
            if (!session?.user?.id || !session?.user?.accessToken) return;

            setLoading(true);

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

            console.log('Fetching recent cases with params:', queryParams); // Debug

            try {
                const url = `${RECENT_CASES_ENDPOINT}/${session.user.id}?${queryParams}&limit=10`;
                console.log('API URL:', url); // Debug
                
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                });

                if (!res.ok) {
                    console.error("Error fetching recent cases", res.status, res.statusText);
                    return;
                }

                const response = await res.json();
                console.log('API Response:', response); // Debug
                setRecentCases(response.cases || []);
            } catch (error) {
                console.error("Error fetching recent cases:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecentCases();
    }, [session, selectedYear, selectedMonth]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStageColor = (stageId: number) => {
        switch (stageId) {
            case 1: return "bg-blue-100 text-blue-800";
            case 2: return "bg-yellow-100 text-yellow-800";
            case 3: return "bg-orange-100 text-orange-800";
            case 4: return "bg-purple-100 text-purple-800";
            case 5: return "bg-red-100 text-red-800";
            case 6: return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getStageName = (stageId: number) => {
        switch (stageId) {
            case 1: return "Inicio";
            case 2: return "En Progreso";
            case 3: return "Revisión";
            case 4: return "Pendiente";
            case 5: return "Suspendido";
            case 6: return "Finalizado";
            default: return "Sin etapa";
        }
    };

    const getStatusName = (status: string) => {
        switch (status) {
            case "IN_PROGRESS": return "En Progreso";
            case "COMPLETED": return "Completado";
            case "PENDING": return "Pendiente";
            case "CANCELLED": return "Cancelado";
            default: return status;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-b-muted">
                <CardTitle className="text-lg font-semibold">Casos Recientes</CardTitle>
                <div className="flex gap-4">
                    <div>
                        <label htmlFor="year-select-recent" className="block text-sm font-medium mb-1">
                            Año
                        </label>
                        <select
                            id="year-select-recent"
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
                        <label htmlFor="month-select-recent" className="block text-sm font-medium mb-1">
                            Mes
                        </label>
                        <select
                            id="month-select-recent"
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
            <CardContent className="p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : recentCases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No se encontraron casos recientes para el período seleccionado.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recentCases.map((case_) => (
                            <div 
                                key={case_.id} 
                                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="mt-1">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm truncate">
                                                {case_.title}
                                            </h4>
                                            <span 
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(case_.stageId)}`}
                                            >
                                                {getStageName(case_.stageId)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                <span>Cliente ID: {case_.customerId}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(case_.createdAt)}</span>
                                            </div>
                                            {case_.number && (
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    <span>#{case_.number}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Abogado ID: {case_.responsibleLawyerId}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
