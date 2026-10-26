"use client";

import {
	FileText,
	Loader2,
	Palmtree,
	Receipt,
	Scale,
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
	SRT_LAWYER_BY_ID_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import ContractsTab from "@/components/members/ContractsTab";
import LeavesTab from "@/components/members/LeavesTab";
import PayrollsTab from "@/components/members/PayrollsTab";
import LegalSection from "@/components/profile/LegalSection";
import PersonalInfoSection from "@/components/profile/PersonalInfoSection";
import ProfileSummary from "@/components/profile/ProfileSummary";

// Mi perfil = who you are: personal data, professional data (SRT lawyers only)
// and the HR file (only once HR registered the employment). HR tabs are
// read-only except requesting leaves and attaching their certificate.
// Hidden since 2026-10-05, same as the HR file (EmployeeHrPage): Mi
// asistencia, Mi legajo, Mis evaluaciones and Mi onboarding.
type SectionKey = "data" | "legal" | "contracts" | "leaves" | "payrolls";

type Section = {
	key: SectionKey;
	label: string;
	icon: typeof FileText;
	color: string;
};

const DATA_SECTION: Section = { key: "data", label: "Mis datos", icon: UserIcon, color: "text-sky-600" };
const LEGAL_SECTION: Section = { key: "legal", label: "Datos profesionales", icon: Scale, color: "text-violet-600" };
const HR_SECTIONS: Section[] = [
	{ key: "contracts", label: "Mi contrato", icon: FileText, color: "text-indigo-600" },
	{ key: "payrolls", label: "Mis recibos", icon: Receipt, color: "text-amber-600" },
	{ key: "leaves", label: "Mis licencias", icon: Palmtree, color: "text-emerald-600" },
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
	const { data: session } = useSession();

	const [user, setUser] = useState<UserInfo | null>(null);
	const [isLawyer, setIsLawyer] = useState(false);
	const [loading, setLoading] = useState(true);

	const token = session?.user?.accessToken;
	const userId = session?.user?.id ? Number(session.user.id) : 0;

	// Not keyed on the session status: saving the profile calls update(), which
	// goes through "loading" and would reload the whole page.
	useEffect(() => {
		if (!token || !userId) return;
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
			// 404 / 403 = not an SRT lawyer.
			fetch(SRT_LAWYER_BY_ID_ENDPOINT(userId), { headers })
				.then((res) => (res.ok ? res.json() : null))
				.catch(() => null),
		])
			.then(([userJson, empJson, lawyerJson]) => {
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
				setIsLawyer(!!lawyerJson?.lawyer);
			})
			.catch(() => setUser(null))
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [userId, token]);

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

	const sections: Section[] = [
		DATA_SECTION,
		...(isLawyer ? [LEGAL_SECTION] : []),
		...(user.employment ? HR_SECTIONS : []),
	];
	// The tab lives in the URL (?section=payrolls) so it can be linked directly.
	const sectionParam = searchParams.get("section");
	const section = sections.find((s) => s.key === sectionParam)?.key ?? "data";

	const changeSection = (key: SectionKey) => {
		const params = new URLSearchParams(Array.from(searchParams.entries()));
		params.set("section", key);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	// Name and photo from the session: they refresh as soon as "Mis datos" is saved.
	const name = session?.user?.name || user.name;
	const rawImage = session?.user?.image || user.image;
	const image = rawImage
		? rawImage.startsWith("http") ? rawImage : `${process.env.NEXT_PUBLIC_BACKEND_URL}${rawImage}`
		: null;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<Avatar size="lg">
					{image && <AvatarImage src={image} alt={name} />}
					<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-medium">
						{getInitials(name)}
					</AvatarFallback>
				</Avatar>
				<div>
					<h1 className="text-xl font-bold tracking-tight text-foreground">
						{name}
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

			{user.employment && (
				<ProfileSummary
					userId={userId}
					hireDate={user.employment.hireDate}
					onOpen={changeSection}
				/>
			)}

			<Tabs
				value={section}
				onValueChange={(v) => changeSection(v as SectionKey)}
				className="w-full"
			>
				<TabsList
					variant="line"
					className="w-full justify-start flex-wrap gap-0 h-auto border-b border-border rounded-none overflow-x-auto p-0"
				>
					{sections.map((s) => {
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

				{sections.map((s) => (
					<TabsContent
						key={s.key}
						value={s.key}
						className="rounded-lg border border-border bg-card p-4 sm:p-6 mt-4"
					>
						{s.key === "data" && <PersonalInfoSection isLawyer={isLawyer} />}
						{s.key === "legal" && (
							<div className="space-y-6">
								<p className="text-sm text-muted-foreground">
									Matrícula y datos de contacto que se usan en los formularios SRT.
								</p>
								<LegalSection />
							</div>
						)}
						{s.key === "contracts" && <ContractsTab userId={userId} />}
						{s.key === "leaves" && <LeavesTab userId={userId} />}
						{s.key === "payrolls" && <PayrollsTab userId={userId} />}
					</TabsContent>
				))}
			</Tabs>

			{!user.employment && (
				<p className="text-xs text-muted-foreground">
					Tu contrato, recibos y licencias aparecen acá cuando RR.HH. carga tu alta como empleado.
				</p>
			)}
		</div>
	);
}
