import { BookOpen, Calendar, CalendarClock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card/Card";
import Button from "../ui/button/Button";

export default function FilesLastMovements({ file }: { file: any }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Próximo Movimiento</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <CalendarClock className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                                <p className="text-sm font-medium">

                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                            <p className="text-sm">

                            </p>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                            <p className="text-sm">Presentación de pruebas</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <Button variant="primary" className="w-full">
                        <Calendar className="h-4 w-4 mr-2" />
                        Ver otros
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}