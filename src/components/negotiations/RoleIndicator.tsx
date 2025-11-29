import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Shield, Users, User } from "lucide-react";

export function RoleIndicator() {
  const permissions = useRolePermissions();

  if (permissions.isAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#09A4B5] bg-brand-50 px-3 py-1 rounded-full">
        <Shield className="h-4 w-4" />
        <span>Vista completa - Administrador</span>
      </div>
    );
  }

  if (permissions.isLawyer) {
    return (
      <div className="flex items-center gap-2 text-sm text-success-600 bg-success-50 px-3 py-1 rounded-full">
        <User className="h-4 w-4" />
        <span>Mis negociaciones - Abogado</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
      <Users className="h-4 w-4" />
      <span>Vista estándar</span>
    </div>
  );
}