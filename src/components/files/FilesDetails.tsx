import { AlertTriangle, Calendar, CalendarClock, Clock3, FileText, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card/Card";
import { Separator } from "../ui/Separator";
import { Progress } from "../ui/Progress";
import { formatDateCustom, getFileTypeLabel, getStatusProcessLabel } from "@/lib/functions";
import { CasesFiles } from "@/types/cases";

export interface FilesHeaderProps {
    file?: CasesFiles;
}

export default function FilesDetails({ file }: FilesHeaderProps) {
    return (
        <Card className="p-4">
            <CardHeader className="pb-3">
                <CardTitle>Información General</CardTitle>
                <CardDescription>Detalles principales del expediente</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start">
                            <FileText className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500">Descripción</p>
                                <p className="text-sm">{file?.observation}</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Scale className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500">Radicación | Juzgado</p>
                                <p className="text-sm font-medium">
                                    {file?.court?.jurisdiction?.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{file?.court?.courtName}</p>
                            </div>
                        </div>
                    </div>
                    <Separator />
                    {/* <div>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                                <Clock3 className="h-5 w-5 text-gray-400 mr-2" />
                                <span className="text-sm font-medium">Progreso del caso</span>
                            </div>
                            <span className="text-sm font-medium">{ }%</span>
                        </div>
                        <Progress value={0} className="h-2" />
                        <p className="text-xs text-gray-500 mt-2">Etapa actual: </p>
                    </div>
                    <Separator /> */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                                <p className="text-xs text-gray-500">Fecha de inicio</p>
                                <p className="text-sm font-medium">{formatDateCustom(file?.createdAt)}</p>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <Clock3 className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                                <p className="text-xs text-gray-500">Última actualización</p>
                                <p className="text-sm font-medium">{formatDateCustom(file?.updatedAt)}</p>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <CalendarClock className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                                <p className="text-xs text-gray-500">Fecha del accidente</p>
                                <p className="text-sm font-medium">
                                    {formatDateCustom(file?.accidentDate)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div>
                        {file?.instanceExpiration && Number(file.instanceExpiration) > 0 && (file?.lastMovementDate || file?.startDate) && (
                            (() => {
                                // Usar lastMovementDate si existe (reinicia caducidad), sino startDate
                                const baseDate = file.lastMovementDate 
                                    ? new Date(file.lastMovementDate) 
                                    : new Date(file.startDate!);
                                
                                // Caducidad en meses (6 meses por defecto)
                                const expirationMonths = Number(file.instanceExpiration);
                                const expirationDate = new Date(baseDate);
                                expirationDate.setMonth(expirationDate.getMonth() + expirationMonths);
                                
                                const now = new Date();
                                const diffMs = expirationDate.getTime() - now.getTime();
                                const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
                                const diffMonths = Math.floor(diffDays / 30); // Usar floor para no redondear hacia arriba
                                
                                let colorClass = "bg-green-100 text-green-800";
                                let statusMsg = "";
                                let mainMsg = "";
                                
                                if (diffDays < 0) {
                                    // Vencida
                                    colorClass = "bg-red-100 text-red-700";
                                    mainMsg = `hace ${Math.abs(diffDays)} días`;
                                    statusMsg = "(¡Vencida!)";
                                } else if (diffDays <= 5) {
                                    // Últimos 5 días - CRÍTICO
                                    colorClass = "bg-red-100 text-red-700";
                                    mainMsg = diffDays === 0 ? "vence hoy" : diffDays === 1 ? "mañana" : `en ${diffDays} días`;
                                    statusMsg = "(¡CRÍTICO!)";
                                } else if (diffDays <= 30) {
                                    // Último mes
                                    colorClass = "bg-orange-100 text-orange-800";
                                    mainMsg = `en ${diffDays} días`;
                                    statusMsg = "(Último mes)";
                                } else if (diffMonths <= Math.ceil(expirationMonths / 2)) {
                                    // A mitad del plazo (3 meses para 6 meses)
                                    colorClass = "bg-yellow-100 text-yellow-800";
                                    mainMsg = `en ${diffMonths} meses`;
                                    statusMsg = "(Mitad del plazo)";
                                } else {
                                    // Normal
                                    mainMsg = `en ${diffMonths} meses`;
                                }
                                
                                return (
                                    <div className="flex flex-col gap-1">
                                        <span className={`px-2 py-1 rounded flex items-center gap-1 font-semibold ${colorClass}`}>
                                            <AlertTriangle className="w-4 h-4 mr-1 inline" />
                                            Caducidad de instancia: {mainMsg} {statusMsg}
                                        </span>
                                        {file.lastMovementDate && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                Último movimiento: {new Date(file.lastMovementDate).toLocaleDateString('es-AR')}
                                            </span>
                                        )}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}