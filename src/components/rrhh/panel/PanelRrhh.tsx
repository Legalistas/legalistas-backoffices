"use client";

import { FileText, Palmtree, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContratosTab from "./ContratosTab";
import LicenciasTab, { type LicenciaPanel } from "./LicenciasTab";
import SueldosTab from "./SueldosTab";
import { panelFetch } from "./shared";

type TabKey = "sueldos" | "contratos" | "licencias";
const TABS: TabKey[] = ["sueldos", "contratos", "licencias"];

/**
 * Panel RR.HH. for management: salaries of the month, contracts and leave
 * requests of everyone, without opening each person's file.
 */
export default function PanelRrhh() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const tabParam = searchParams.get("tab") as TabKey | null;
	const tab: TabKey = tabParam && TABS.includes(tabParam) ? tabParam : "sueldos";

	// Loaded here so the tab shows how many are waiting.
	const [licencias, setLicencias] = useState<LicenciaPanel[] | null>(null);
	const cargarLicencias = useCallback(() => {
		if (!token) return;
		panelFetch<{ data: LicenciaPanel[] }>("/licencias", token)
			.then((r) => setLicencias(r.data))
			.catch(() => setLicencias([]));
	}, [token]);
	useEffect(() => {
		cargarLicencias();
	}, [cargarLicencias]);

	const trigger =
		"flex items-center gap-2 px-4 py-3 rounded-none! border-0! text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent! data-[state=active]:shadow-none! data-[state=active]:text-foreground data-[state=active]:font-semibold after:bg-primary! after:bottom-0!";

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground">Panel RR.HH.</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Sueldos, contratos y licencias de todo el equipo en un solo lugar.
				</p>
			</div>

			<Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })}>
				<TabsList
					variant="line"
					className="w-full justify-start gap-0 h-auto border-b border-border rounded-none overflow-x-auto p-0"
				>
					<TabsTrigger value="sueldos" className={trigger}>
						<Wallet className="h-4 w-4 text-amber-600" />
						Sueldos del mes
					</TabsTrigger>
					<TabsTrigger value="contratos" className={trigger}>
						<FileText className="h-4 w-4 text-indigo-600" />
						Contratos
					</TabsTrigger>
					<TabsTrigger value="licencias" className={trigger}>
						<Palmtree className="h-4 w-4 text-emerald-600" />
						Licencias
						{!!licencias?.length && (
							<span className="rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
								{licencias.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="sueldos" className="mt-4">
					<SueldosTab />
				</TabsContent>
				<TabsContent value="contratos" className="mt-4">
					<ContratosTab />
				</TabsContent>
				<TabsContent value="licencias" className="mt-4">
					<LicenciasTab licencias={licencias} onCambio={cargarLicencias} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
