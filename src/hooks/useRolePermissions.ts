import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { Role } from "@/constant/user";

interface RolePermissions {
	isAdmin: boolean;
	isLawyer: boolean;
	canViewAllNegotiations: boolean;
	canViewAllCauses: boolean;
	canViewAllClosings: boolean;
	getUserId: () => number | null;
}

export const useRolePermissions = (): RolePermissions => {
	const { data: session } = useSession();

	return useMemo(() => {
		const adminRoles = [
			Role.DIRECTOR_GENERAL_CEO,
			Role.GERENTE_GENERAL_COO,
			Role.DIRECTORA_AREA_LEGAL,
			Role.COORDINADOR_LEGAL,
			Role.ASISTENTE_LEGAL,
			Role.REFERENTES,
			Role.DIRECTOR_AREA_IT,
		];

		const lawyerRoles = [Role.ABOGADO_REPRESENTANTE];

		const currentRole = session?.user?.role as Role;
		const isAdmin = adminRoles.includes(currentRole);
		const isLawyer = lawyerRoles.includes(currentRole);

		const getUserId = (): number | null => {
			if (!session?.user?.id) return null;
			const id = parseInt(session.user.id);
			return isNaN(id) ? null : id;
		};

		return {
			isAdmin,
			isLawyer,
			canViewAllNegotiations: isAdmin,
			canViewAllCauses: isAdmin,
			canViewAllClosings: isAdmin,
			getUserId,
		};
	}, [session?.user?.role, session?.user?.id]);
};

// Función helper para construir URLs con filtros de usuario
export const buildFilteredUrl = (
	baseUrl: string,
	permissions: RolePermissions,
	additionalParams?: Record<string, string>,
): string => {
	const url = new URL(baseUrl);

	// Si es abogado, agregar filtro por usuario
	if (permissions.isLawyer && permissions.getUserId()) {
		url.searchParams.append("lawyerId", permissions.getUserId()!.toString());
	}

	// Agregar parámetros adicionales
	if (additionalParams) {
		Object.entries(additionalParams).forEach(([key, value]) => {
			url.searchParams.append(key, value);
		});
	}

	return url.toString();
};
