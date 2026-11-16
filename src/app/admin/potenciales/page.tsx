"use client";

import { Can } from "@/components/auth/Can";
import { BandejaPotenciales } from "@/components/potenciales/BandejaPotenciales";
import { ConfiguracionBot } from "@/components/potenciales/ConfiguracionBot";
import { KpisPotenciales } from "@/components/potenciales/KpisPotenciales";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VENTAS } from "@/constant/menu";

// Módulo Potenciales (sprint, sección 4): consultas nuevas del bot de WhatsApp y de la app.
export default function PotencialesPage() {
	return (
		<Can
			role={VENTAS}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">Potenciales es para dirección y Ventas.</p>
				</div>
			}
		>
			<div className="space-y-4 p-4 sm:p-6">
				<div>
					<h1 className="text-xl font-semibold text-foreground">Potenciales</h1>
					<p className="text-sm text-muted-foreground">
						Consultas nuevas por WhatsApp (las atiende el bot) y por la app. Las factibles pasan solas al
						embudo; las dudosas esperan a una vendedora.
					</p>
				</div>
				<Tabs defaultValue="bandeja">
					<TabsList>
						<TabsTrigger value="bandeja">Bandeja</TabsTrigger>
						<TabsTrigger value="kpis">KPIs</TabsTrigger>
						<TabsTrigger value="configuracion">Configuración del bot</TabsTrigger>
					</TabsList>
					<TabsContent value="bandeja" className="mt-4">
						<BandejaPotenciales />
					</TabsContent>
					<TabsContent value="kpis" className="mt-4">
						<KpisPotenciales />
					</TabsContent>
					<TabsContent value="configuracion" className="mt-4">
						<ConfiguracionBot />
					</TabsContent>
				</Tabs>
			</div>
		</Can>
	);
}
