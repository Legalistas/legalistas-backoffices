import { Calendar, Clock3, Scale, Stethoscope } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateCustom } from "@/lib/functions";
import type { CasesFiles } from "@/types/cases";

export interface FilesHeaderProps {
	file?: CasesFiles;
}

// Relevamiento 6.1: la descripción pasó a Notas, la fecha del accidente está
// en el caso y la caducidad manual la reemplaza el sistema de Plazos.
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
							<Stethoscope className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
							<div>
								<p className="text-xs text-gray-500">Tipo de lesión</p>
								<p className="text-sm font-medium">
									{file?.injury?.trim() || "Sin cargar"}
								</p>
							</div>
						</div>
						<div className="flex items-start">
							<Scale className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
							<div>
								<p className="text-xs text-gray-500">Radicación | Juzgado</p>
								<p className="text-sm font-medium">
									{file?.court?.jurisdiction?.name}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									{file?.court?.courtName}
								</p>
							</div>
						</div>
					</div>
					<Separator />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex items-center">
							<Calendar className="h-5 w-5 text-gray-400 mr-2" />
							<div>
								<p className="text-xs text-gray-500">Fecha de inicio</p>
								<p className="text-sm font-medium">
									{formatDateCustom(file?.createdAt)}
								</p>
							</div>
						</div>
						<div className="flex items-center">
							<Clock3 className="h-5 w-5 text-gray-400 mr-2" />
							<div>
								<p className="text-xs text-gray-500">Última actualización</p>
								<p className="text-sm font-medium">
									{formatDateCustom(file?.updatedAt)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
