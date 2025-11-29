"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card/Card";
import {
    Calendar,
    FileText,
    User,
    Clock,
    ArrowRight,
} from "lucide-react";
import { RECENT_CASES_ENDPOINT } from "@/constant/api-endpoints";
import { getStatusName } from "@/lib/functions";
import Button from "../ui/button/Button";

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

export default function LegalCases() {
    const { data: session } = useSession();

    // Estado para datos
    const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [hasFetched, setHasFetched] = useState<boolean>(false);

    useEffect(() => {
        async function fetchRecentCases() {
            // Evitar múltiples llamadas
            if (!session?.user?.id || !session?.user?.accessToken || loading || hasFetched) return;

            setLoading(true);

            try {
                const url = `${RECENT_CASES_ENDPOINT}/${session.user.id}?limit=5`;
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

                // Filtrar solo casos con stage >= 2
                const filteredCases = response.cases?.filter((case_: RecentCase) => case_.stageId >= 2) || [];
                setRecentCases(filteredCases);
                setHasFetched(true);
            } catch (error) {
                console.error("Error fetching recent cases:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecentCases();
    }, [session?.user?.id, session?.user?.accessToken, loading, hasFetched]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const refetchCases = async () => {
        if (!session?.user?.id || !session?.user?.accessToken) return;
        
        setHasFetched(false);
        setLoading(true);
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

    return (
        <Card className="col-span-1">
            <CardHeader className="pb-4">
                <CardTitle>Casos Recientes</CardTitle>
                <CardDescription>Últimos casos creados (etapa 2 o superior)</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                ) : recentCases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No se encontraron casos recientes para el período seleccionado.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentCases.map((case_) => (
                            <div
                                key={case_.id}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
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
                                            {getStatusName(case_.stageId)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="truncate">Cliente ID: {case_.customerId}</span>
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
                        ))}

                        <div className="flex justify-end mt-4">
                            <Button variant="ghost">
                                Ver todas las solicitudes <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
