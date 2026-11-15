"use client";

import { EditorContenido } from "@/components/app-contenido/EditorContenido";
import { Can } from "@/components/auth/Can";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTENIDO_APP } from "@/constant/menu";

// Recursos, Urgencias y Preguntas frecuentes de la app de clientes (sprint 5.m).
export default function ContenidoAppPage() {
	return (
		<Can
			role={CONTENIDO_APP}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						El contenido de la app lo editan dirección, Legales y Ventas.
					</p>
				</div>
			}
		>
			<div className="space-y-4 p-4 sm:p-6">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Contenido de la app</h1>
					<p className="text-sm text-muted-foreground">
						Lo que se guarda acá aparece en la app de clientes la próxima vez que la abren, sin
						publicar una versión nueva.
					</p>
				</div>
				<Tabs defaultValue="app_recursos">
					<TabsList>
						<TabsTrigger value="app_recursos">Recursos</TabsTrigger>
						<TabsTrigger value="app_urgencias">Urgencias</TabsTrigger>
						<TabsTrigger value="app_faq">Preguntas frecuentes</TabsTrigger>
					</TabsList>
					<TabsContent value="app_recursos" className="mt-4">
						<EditorContenido clave="app_recursos" />
					</TabsContent>
					<TabsContent value="app_urgencias" className="mt-4">
						<EditorContenido clave="app_urgencias" />
					</TabsContent>
					<TabsContent value="app_faq" className="mt-4">
						<EditorContenido clave="app_faq" />
					</TabsContent>
				</Tabs>
			</div>
		</Can>
	);
}
