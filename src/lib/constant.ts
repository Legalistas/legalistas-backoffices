import { Role } from "@/constant/user";

type ServiceType = {
  id: number;
  value: number;
  label: string;
};

type StageType = {
  id: number;
  value: number;
  label: string;
};

// services
export const servicesType: ServiceType[] = [
  { id: 1, value: 1, label: "Acc. de trabajo" },
  { id: 2, value: 2, label: "Acc. de transito" },
  { id: 3, value: 3, label: "Jubilaciones" },
  { id: 4, value: 4, label: "Sucesiones" },
  { id: 5, value: 5, label: "Daños y materiales" },
  { id: 6, value: 6, label: "Despidos" },
  { id: 7, value: 7, label: "Civil" },
  { id: 8, value: 8, label: "Ejecutivos" },
];

export const stageCases: StageType[] = [
  { id: 1, value: 1, label: "Documentación Pendiente" },
  { id: 2, value: 2, label: "Caso En Trámite" },
  { id: 3, value: 3, label: "Cierre Logrado" },
  { id: 4, value: 4, label: "Cobrado" },
  { id: 5, value: 5, label: "Experiencia" },
  { id: 6, value: 6, label: "Cerrado" },
];

export const filesType = [
  { id: 1, value: 1, label: "Administrativo" },
  { id: 2, value: 2, label: "Judicial" },
];

// You can also add a helper constant for the "todos" option if needed
export const fileFilterOptions = [
  { id: 0, value: 0, label: "Todos" },
  ...filesType.map((type) => ({
    id: type.id,
    value: type.value,
    label: type.value === 1 ? "Administrativo" : "Judicial",
  })),
];

export const protectedRoutes = {
  "/admin": [Role.ADMINISTRATOR],
  "/welcome": [Role.ADMINISTRATOR, Role.CUSTOMER],
};

export const docsType = [
  { id: 1, value: 1, label: "DNI" },
  { id: 2, value: 2, label: "Cuil/Cuit" },
  { id: 3, value: 3, label: "LC" },
  { id: 4, value: 4, label: "LE" },
  { id: 5, value: 5, label: "Pasaporte" },
];

export const genderType = [
  { id: 1, value: 1, label: "Masculino" },
  { id: 2, value: 2, label: "Femenino" },
  { id: 3, value: 3, label: "X" },
];

export const statusType = [
  { id: 1, value: "IN_PROGRESS", label: "En Progreso" },
  { id: 2, value: "WON", label: "Ganado" },
  { id: 3, value: "LOST", label: "Perdido" },
];

export const COLORS = [
  { name: "Default", value: "#000000" },
  { name: "Purple", value: "#958DF1" },
  { name: "Red", value: "#E63946" },
  { name: "Green", value: "#2A9D8F" },
  { name: "Blue", value: "#457B9D" },
  { name: "Yellow", value: "#E9C46A" },
];

export const FONT_SIZES = [
  { value: "12px", label: "12px" },
  { value: "14px", label: "14px" },
  { value: "16px", label: "16px" },
  { value: "18px", label: "18px" },
  { value: "20px", label: "20px" },
  { value: "24px", label: "24px" },
  { value: "30px", label: "30px" },
  { value: "36px", label: "36px" },
];
