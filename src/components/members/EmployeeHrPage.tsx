"use client";

import {
	ArrowLeft,
	Briefcase,
	ClipboardCheck,
	Clock,
	FileText,
	FileWarning,
	GraduationCap,
	Loader2,
	Palmtree,
	Receipt,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/Can";
import { Role } from "@/constant/user";
import { SUPERADMIN } from "@/constant/menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { USERS_ENDPOINT } from "@/constant/api-endpoints";
import AttendanceTab from "./AttendanceTab";
import ContractsTab from "./ContractsTab";
import DisciplinaryTab from "./DisciplinaryTab";
import EmploymentDataForm from "./EmploymentDataForm";
import LeavesTab from "./LeavesTab";
import PayrollsTab from "./PayrollsTab";
import PerformanceTab from "./PerformanceTab";
import TrainingsTab from "./TrainingsTab";

const EMPLOYMENT_ALLOWED_ROLES = [
	...SUPERADMIN,
	Role.COORDINADOR_FINANCIERO,
	Role.DIRECTOR_FINANCIERO,
	Role.CONTADOR_SENIOR,
	Role.ANALISTA_FINANCIERO,
	Role.TESORERO,
	Role.AUDITOR_INTERNO,
];

type SectionKey =
	| "data"
	| "contracts"
	| "attendance"
	| "leaves"
	| "payrolls"
	| "disciplinary"
	| "trainings"
	| "performance";

const SECTIONS: {
	key: SectionKey;
	label: string;
	icon: typeof Briefcase;
	color: string;
}[] = [
	{ key: "data", label: "Datos laborales", icon: Briefcase, color: "text-primary" },
	{ key: "contracts", label: "Contratos", icon: FileText, color: "text-blue-600" },
	{ key: "attendance", label: "Asistencia", icon: Clock, color: "text-cyan-600" },
	{ key: "leaves", label: "Licencias y vacaciones", icon: Palmtree, color: "text-emerald-600" },
	{ key: "payrolls", label: "Recibos de sueldo", icon: Receipt, color: "text-amber-600" },
	{ key: "disciplinary", label: "Legajo disciplinario", icon: FileWarning, color: "text-red-600" },
	{ key: "trainings", label: "Capacitaciones", icon: GraduationCap, color: "text-indigo-600" },
	{ key: "performance", label: "Evaluaciones", icon: ClipboardCheck, color: "text-fuchsia-600" },
];

const getInitials = (name: string | null | undefined) => {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface EmployeeHrPageProps {
	userId: number;
}

interface UserInfo {
	id: number;
	name: string;
	email: string | null;
	image: string | null;
	roleName?: string | null;
	roleDisplayName?: string | null;
	employment?: {
		position: string | null;
		area: string | null;
		status: string;
	} | null;
}

export default function EmployeeHrPage({ userId }: EmployeeHrPageProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { data: session, status } = useSession();

	const sectionParam = (searchParams.get("section") as SectionKey) || "data";
	const [section, setSection] = useState<SectionKey>(
		SECTIONS.some((s) => s.key === sectionParam) ? sectionParam : "data",
	);
	const [user, setUser] = useState<UserInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const token = session?.user?.accessToken;

	useEffect(() => {
		if (!token || status !== "authenticated") return;
		let cancelled = false;
		setIsLoading(true);
		fetch(`${USERS_ENDPOINT}/${userId}`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (cancelled || !json) return;
				const u = json.data || json.user || json;
				if (!u?.id) return;
				const role = u.roleUser?.[0]?.role;
				setUser({
					id: u.id,
					name: u.name || "",
					email: u.email || null,
					image: u.image || null,
					roleName: role?.name || null,
					roleDisplayName: role?.displayName || null,
					employment: u.employment || null,
				});
			})
			.catch(() => setUser(null))
			.finally(() => !cancelled && setIsLoading(false));
		return () => {
			cancelled = true;
		};
	}, [userId, token, status]);

	const changeSection = (key: SectionKey) => {
		setSection(key);
		const params = new URLSearchParams(Array.from(searchParams.entries()));
		params.set("section", key);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	return (
		<Can
			role={EMPLOYMENT_ALLOWED_ROLES}
			fallback={
				<div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-2">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="text-xs text-muted-foreground max-w-md">
						Solo el personal de SUPERADMIN y área contable puede acceder al módulo de RRHH.
					</p>
					<Button asChild variant="outline" size="sm" className="mt-2">
						<Link href="/admin/teams">Volver al equipo</Link>
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-4">
				{/* Header */}
				<div className="flex items-start gap-3">
					<div className="flex items-start gap-3 flex-1 min-w-0">
						<Button
							asChild
							size="icon"
							variant="ghost"
							className="mt-1"
							title="Volver"
						>
							<Link href="/admin/teams">
								<ArrowLeft className="h-4 w-4" />
							</Link>
						</Button>
						{isLoading ? (
							<div className="flex items-center gap-3">
								<div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
								<div className="space-y-2">
									<div className="h-4 w-40 bg-muted rounded animate-pulse" />
									<div className="h-3 w-28 bg-muted rounded animate-pulse" />
								</div>
							</div>
						) : user ? (
							<div className="flex items-center gap-3">
								<Avatar size="lg">
									{user.image && <AvatarImage src={user.image} alt={user.name} />}
									<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-medium">
										{getInitials(user.name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<h1 className="text-xl font-bold tracking-tight text-foreground">
										{user.name}
									</h1>
									<div className="flex items-center gap-2 flex-wrap mt-0.5">
										{user.email && (
											<span className="text-xs text-muted-foreground">
												{user.email}
											</span>
										)}
										{user.roleDisplayName && (
											<Badge variant="outline" className="text-[10px]">
												{user.roleDisplayName}
											</Badge>
										)}
										{user.employment?.position && (
											<span className="text-xs text-muted-foreground">
												· {user.employment.position}
												{user.employment.area && ` · ${user.employment.area}`}
											</span>
										)}
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								No se encontró el usuario
							</p>
						)}
					</div>

				</div>

				{/* Tabs de secciones */}
				{!isLoading && user ? (
					<Tabs
						value={section}
						onValueChange={(v) => changeSection(v as SectionKey)}
						className="w-full"
					>
						<TabsList
							variant="line"
							className="w-full justify-start flex-wrap gap-0 h-auto border-b border-border rounded-none overflow-x-auto p-0"
						>
							{SECTIONS.map((s) => {
								const Icon = s.icon;
								return (
									<TabsTrigger
										key={s.key}
										value={s.key}
										className="group flex items-center gap-2 px-4 py-3 rounded-none! border-0! text-sm font-medium text-muted-foreground whitespace-nowrap hover:text-foreground hover:bg-muted/30 transition-colors data-[state=active]:bg-transparent! data-[state=active]:shadow-none! data-[state=active]:text-foreground data-[state=active]:font-semibold after:bg-primary! after:bottom-0!"
									>
										<Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
										<span>{s.label}</span>
									</TabsTrigger>
								);
							})}
						</TabsList>

						{SECTIONS.map((s) => (
							<TabsContent
								key={s.key}
								value={s.key}
								className="rounded-lg border border-border bg-card p-4 sm:p-6 mt-4"
							>
								{s.key === "data" && (
									<EmploymentDataForm
										userId={userId}
										roleName={user?.roleName ?? null}
										roleDisplayName={user?.roleDisplayName ?? null}
									/>
								)}
								{s.key === "contracts" && <ContractsTab userId={userId} />}
								{s.key === "attendance" && <AttendanceTab userId={userId} />}
								{s.key === "leaves" && <LeavesTab userId={userId} />}
								{s.key === "payrolls" && <PayrollsTab userId={userId} />}
								{s.key === "disciplinary" && <DisciplinaryTab userId={userId} />}
								{s.key === "trainings" && <TrainingsTab userId={userId} />}
								{s.key === "performance" && <PerformanceTab userId={userId} />}
							</TabsContent>
						))}
					</Tabs>
				) : isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				) : null}
			</div>
		</Can>
	);
}
