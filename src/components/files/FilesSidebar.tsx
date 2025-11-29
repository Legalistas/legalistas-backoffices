"use client"
import { useState } from "react";
import { Calendar, FileText, MessageSquare, Paperclip } from "lucide-react";
import Button from "../ui/button/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card/Card";
import FilesLastMovements from "./FilesLastMovements";
import { CasesFiles } from "@/types/cases";

interface FilesSidebarProps {
  file: CasesFiles
  onOpenNewMovement: () => void
}

export default function FilesSidebar({ file, onOpenNewMovement }: FilesSidebarProps) {
    console.log(file)
    return (
        <>
            {/* <FilesLastMovements file={file} /> */}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Generar reporte
                    </Button> */}
                    <Button variant="outline" className="w-full justify-start" onClick={onOpenNewMovement}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Nuevo evento
                    </Button>
                    {/* <Button variant="outline" className="w-full justify-start">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar notificación
                    </Button> */}
                    {/* <Button variant="outline" className="w-full justify-start">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Adjuntar documento
                    </Button> */}
                </CardContent>
            </Card>
        </>
    )
}