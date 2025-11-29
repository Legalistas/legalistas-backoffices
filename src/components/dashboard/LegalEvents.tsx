"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card/Card";
import {
    Calendar,
    Clock,
    MapPin,
    FileText,
    ArrowRight,
} from "lucide-react";
import { STATISTICS_MOVEMENTS_ENDPOINT, STATISTICS_EVENTS_ENDPOINT } from "@/constant/api-endpoints";
import Button from "../ui/button/Button";

interface Movement {
    id: number;
    date: string;
    type: string;
    description: string;
    fileId: number;
    caseTitle?: string;
}

interface Event {
    id: number;
    title: string;
    start: string;
    end?: string;
    allDay: boolean;
    backgroundColor?: string;
}

export default function LegalEvents() {
    const { data: session } = useSession();

    // Estados para datos
    const [movements, setMovements] = useState<Movement[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingMovements, setLoadingMovements] = useState<boolean>(false);
    const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
    const [hasFetchedMovements, setHasFetchedMovements] = useState<boolean>(false);
    const [hasFetchedEvents, setHasFetchedEvents] = useState<boolean>(false);

    // Fetch de movimientos
    useEffect(() => {
        async function fetchMovements() {
            if (!session?.user?.id || !session?.user?.accessToken || loadingMovements || hasFetchedMovements) return;

            setLoadingMovements(true);

            try {
                const url = `${STATISTICS_MOVEMENTS_ENDPOINT}/${session.user.id}?limit=3`;
                console.log('Movements API URL:', url);
                
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                });

                if (!res.ok) {
                    console.error("Error fetching movements", res.status, res.statusText);
                    return;
                }

                const response = await res.json();
                console.log('Movements API Response:', response);
                setMovements(response.movements || response.data || []);
                setHasFetchedMovements(true);
            } catch (error) {
                console.error("Error fetching movements:", error);
            } finally {
                setLoadingMovements(false);
            }
        }

        fetchMovements();
    }, [session?.user?.id, session?.user?.accessToken, loadingMovements, hasFetchedMovements]);

    // Fetch de eventos
    useEffect(() => {
        async function fetchEvents() {
            if (!session?.user?.id || !session?.user?.accessToken || loadingEvents || hasFetchedEvents) return;

            setLoadingEvents(true);

            try {
                const url = `${STATISTICS_EVENTS_ENDPOINT}/${session.user.id}?limit=3`;
                console.log('Events API URL:', url);
                
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                });

                if (!res.ok) {
                    console.error("Error fetching events", res.status, res.statusText);
                    return;
                }

                const response = await res.json();
                console.log('Events API Response:', response);
                setEvents(response.events || response.data || []);
                setHasFetchedEvents(true);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoadingEvents(false);
            }
        }

        fetchEvents();
    }, [session?.user?.id, session?.user?.accessToken, loadingEvents, hasFetchedEvents]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateTime = (dateString: string) => {
        return `${formatDate(dateString)} ${formatTime(dateString)}`;
    };

    const isLoading = loadingMovements || loadingEvents;
    const hasNoData = movements.length === 0 && events.length === 0;

    return (
        <Card className="col-span-1">
            <CardHeader className="pb-4">
                <CardTitle>Actividad Legal</CardTitle>
                <CardDescription>Próximos eventos y movimientos recientes</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                ) : hasNoData ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No se encontraron eventos o movimientos recientes.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Sección de Eventos */}
                        {events.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Próximos Eventos
                                </h4>
                                <div className="space-y-3">
                                    {events.map((event) => (
                                        <div 
                                            key={`event-${event.id}`} 
                                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="mt-1">
                                                <Calendar className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-sm truncate">
                                                    {event.title}
                                                </h5>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>
                                                            {event.allDay 
                                                                ? formatDate(event.start)
                                                                : formatDateTime(event.start)
                                                            }
                                                        </span>
                                                    </div>
                                                    {event.end && !event.allDay && (
                                                        <div className="flex items-center gap-1">
                                                            <span>-</span>
                                                            <span>{formatTime(event.end)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sección de Movimientos */}
                        {movements.length > 0 && (
                            <div>
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-orange-600" />
                                    Movimientos Recientes
                                </h4>
                                <div className="space-y-3">
                                    {movements.map((movement) => (
                                        <div 
                                            key={`movement-${movement.id}`} 
                                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="mt-1">
                                                <MapPin className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-sm truncate">
                                                    {movement.description || `Movimiento ${movement.type}`}
                                                </h5>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{formatDateTime(movement.date)}</span>
                                                    </div>
                                                    {movement.caseTitle && (
                                                        <div className="flex items-center gap-1">
                                                            <FileText className="h-3 w-3" />
                                                            <span className="truncate">{movement.caseTitle}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Botón para ver más */}
                        <div className="flex justify-end mt-4">
                            <Button variant="ghost">
                                Ver calendario completo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
