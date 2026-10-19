"use client";

import { Can } from "@/components/auth/Can";
import MembersContent from "@/components/members/MembersContent";
import { TEAM_ACCESS_ROLES } from "@/constant/rrhh";

export default function Page() {
	return (
		<Can
			role={TEAM_ACCESS_ROLES}
			fallback={
				<div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
					<p className="text-sm font-medium text-foreground">Sin acceso</p>
					<p className="max-w-md text-xs text-muted-foreground">
						El equipo es solo para dirección: CEO, administración, Sistemas, el director contable y la directora legal.
					</p>
				</div>
			}
		>
			<MembersContent />
		</Can>
	);
}
