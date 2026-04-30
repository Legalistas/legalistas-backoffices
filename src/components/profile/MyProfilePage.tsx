"use client";

import {
	Clock,
	ClipboardCheck,
	ListChecks,
	Loader2,
	Palmtree,
	Receipt,
	User as UserIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	EMPLOYMENT_BY_USER_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import AttendanceTab from "@/components/members/AttendanceTab";
import ChecklistsTab from "@/components/members/ChecklistsTab";
import LeavesTab from "@/components/members/LeavesTab";
import PayrollsTab from "@/components/members/PayrollsTab";
import PerformanceTab from "@/components/members/PerformanceTab";

type SectionKey =
	| "attendance"
	| "leaves"
	| "payrolls"
	| "performance"
	| "checklists";

const SECTIONS: {
	key: SectionKey;
	label: string;
	icon: typeof Clock;
	color: string;
}[] = [
	{ key: "attendance", label: "Mi asistencia", icon: Clock, color: "text-cyan-600" },
	{ key: "leaves", label: "Mis licencias", icon: Palmtree, color: "text-emerald-600" },
	{ key: "payrolls", label: "Mis recibos", icon: Receipt, color: "text-amber-600" },
	{ key: "performance", label: "Mis evaluaciones", icon: ClipboardCheck, color: "text-fuchsia-600" },
	{ key: "checklists", label: "Mi onboarding", icon: ListChecks, color: "text-teal-600" },
];

const getInitials = (name: string | null | undefined) => {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface UserInfo {
	id: number;
	name: string;
	email: string | null;
	image: string | null;
	roleDisplayName?: string | null;
	employment?: {
		position: string | null;
		area: string | null;
		hireDate: string | null;
		status: string;
	} | null;
}

export default function MyProfilePage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { data: session, status } = useSession();

	const sectionParam = (searchParams.get("section") as SectionKey) || "attendance";
	const [section, setSection] = useState<SectionKey>(
		SECTIONS.some((s) => s.key === sectionParam) ? sectionParam : "attendance",
	);
	const [user, setUser] = useState<UserInfo | null>(null);
	const [loading, setLoading] = useState(true);

	const token = session?.user?.accessToken;
	const userId = session?.user?.id ? Number(session.user.id) : 0;

	useEffect(() => {
		if (!token || !userId || status !== "authenticated") return;
		let cancelled = false;
		setLoading(true);

		const headers = { Authorization: `Bearer ${token}` };

		Promise.all([
			fetch(`${USERS_ENDPOINT}/${userId}`, { headers }).then((res) =>
				res.ok ? res.json() : null,
			),
			fetch(EMPLOYMENT_BY_USER_ENDPOINT(userId), { headers })
				.then((res) => (res.ok ? res.json() : null))
				.catch(() => null),
		])
			.then(([userJson, empJson]) => {
				if (cancelled || !userJson) return;
				const u = userJson.data || userJson.user || userJson;
				if (!u?.id) return;
				const role = u.roleUser?.[0]?.role;
				const emp = empJson?.data?.employment ?? u.employment ?? null;
				setUser({
					id: u.id,
					name: u.name || "",
					email: u.email || null,
					image: u.image || null,
					roleDisplayName: role?.displayName || null,
					employment: emp,
				});
			})
			.catch(() => setUser(null))
			.finally(() => !cancelled && setLoading(false));
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

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-2">
				<UserIcon className="h-10 w-10 text-muted-foreground/50" />
				<p className="text-sm font-medium">No se pudo cargar tu perfil</p>
			</div>
		);
	}

	const hasEmployment = !!user.employment;

	return (
		<div className="flex flex-col gap-4">
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

			{!hasEmployment ? (
				<div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
					<UserIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
					<p className="text-sm font-medium text-foreground">
						Todavía no tenés ficha laboral
					</p>
					<p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
						Cuando RRHH genere tu alta como empleado, vas a poder ver acá tus
						recibos, licencias, evaluaciones y más.
					</p>
				</div>
			) : (
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
							{s.key === "attendance" && <AttendanceTab userId={userId} />}
							{s.key === "leaves" && <LeavesTab userId={userId} />}
							{s.key === "payrolls" && <PayrollsTab userId={userId} />}
							{s.key === "performance" && <PerformanceTab userId={userId} />}
							{s.key === "checklists" && <ChecklistsTab userId={userId} />}
						</TabsContent>
					))}
				</Tabs>
			)}
		</div>
	);
}
