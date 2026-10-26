"use client";

import { Briefcase, Palmtree, Receipt } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { LEAVES_BY_USER_ENDPOINT, PAYROLLS_BY_USER_ENDPOINT } from "@/constant/api-endpoints";
import { seniority } from "@/lib/seniority";

interface VacationBalance {
	anio: number;
	corresponden: number | null;
	disponibles: number | null;
	pedidos: number;
}

interface LastPayroll {
	period: string;
	netAmount: string;
	currency: string;
}

type Target = "contracts" | "leaves" | "payrolls";

const periodLabel = (period: string) => {
	const [y, m] = period.split("-");
	const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-AR", {
		month: "long",
		year: "numeric",
	});
	return label.charAt(0).toUpperCase() + label.slice(1);
};

const money = (amount: string, currency: string) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: currency || "ARS" }).format(
		Number(amount) || 0,
	);

/** Top of Mi perfil for employees: seniority, vacation days left and last payslip. */
export default function ProfileSummary({
	userId,
	hireDate,
	onOpen,
}: {
	userId: number;
	hireDate: string | null;
	onOpen: (target: Target) => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [vacation, setVacation] = useState<VacationBalance | null>(null);
	const [payroll, setPayroll] = useState<LastPayroll | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (!token || !userId) return;
		const headers = { Authorization: `Bearer ${token}` };
		const get = (url: string) =>
			fetch(url, { headers })
				.then((r) => (r.ok ? r.json() : null))
				.catch(() => null);
		Promise.all([get(LEAVES_BY_USER_ENDPOINT(userId)), get(PAYROLLS_BY_USER_ENDPOINT(userId))]).then(
			([leaves, payrolls]) => {
				setVacation(leaves?.stats?.vacaciones ?? null);
				setPayroll(payrolls?.data?.[0] ?? null);
				setLoaded(true);
			},
		);
	}, [token, userId]);

	const since = seniority(hireDate);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
			<Card icon={Briefcase} color="text-indigo-600" title="Antigüedad" onClick={() => onOpen("contracts")}>
				<Value>{since ?? "—"}</Value>
				<Hint>
					{hireDate
						? `Desde el ${new Date(hireDate).toLocaleDateString("es-AR", { timeZone: "UTC" })}`
						: "Falta la fecha de ingreso"}
				</Hint>
			</Card>

			<Card icon={Palmtree} color="text-emerald-600" title="Vacaciones" onClick={() => onOpen("leaves")}>
				{!loaded ? (
					<Value>…</Value>
				) : vacation?.disponibles != null ? (
					<>
						<Value>
							{vacation.disponibles} {vacation.disponibles === 1 ? "día disponible" : "días disponibles"}
						</Value>
						<Hint>
							De {vacation.corresponden} en {vacation.anio}
							{vacation.pedidos > 0 && ` · ${vacation.pedidos} pedidos sin aprobar`}
						</Hint>
					</>
				) : (
					<>
						<Value>—</Value>
						<Hint>Se calculan con la fecha de ingreso</Hint>
					</>
				)}
			</Card>

			<Card icon={Receipt} color="text-amber-600" title="Último recibo" onClick={() => onOpen("payrolls")}>
				{!loaded ? (
					<Value>…</Value>
				) : payroll ? (
					<>
						<Value>{periodLabel(payroll.period)}</Value>
						<Hint>Neto {money(payroll.netAmount, payroll.currency)}</Hint>
					</>
				) : (
					<>
						<Value>—</Value>
						<Hint>Todavía no hay recibos</Hint>
					</>
				)}
			</Card>
		</div>
	);
}

function Card({
	icon: Icon,
	color,
	title,
	onClick,
	children,
}: {
	icon: typeof Briefcase;
	color: string;
	title: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
		>
			<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
				<Icon className={`h-4 w-4 ${color}`} />
				{title}
			</div>
			<div className="mt-2 space-y-0.5">{children}</div>
		</button>
	);
}

const Value = ({ children }: { children: React.ReactNode }) => (
	<p className="text-base font-semibold text-foreground">{children}</p>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
	<p className="text-xs text-muted-foreground">{children}</p>
);
