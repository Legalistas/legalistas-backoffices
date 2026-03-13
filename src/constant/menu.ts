import type { NavItem, MenuSection } from "@/types/navigation";
import { Role } from "@/constant/user";

import {
  LayoutDashboard,
  SquareKanban,
  Users2,
  Scale,
  CalendarDays,
  Landmark,
  Handshake,
  Wallet,
  BarChart3,
  User,
  ChartArea,
  ArrowRightLeft,
  Pencil,
  Wrench,
  Settings,
  MessageCircle,
} from "lucide-react";

// ── Roles activos ──────────────────────────────────────────────────

const {
  ADMINISTRATOR,
  DIRECTOR_GENERAL_CEO,
  DIRECTOR_AREA_IT,
  DIRECTORA_AREA_VENTAS,
  REPRESENTANTE_VENTAS,
  DIRECTORA_AREA_CONTABLE,
  DIRECTORA_AREA_MARKETING,
  GESTOR_CONTENIDOS,
  DISENADOR_GRAFICO,
  ASISTENTE_LEGAL,
  ABOGADO_REPRESENTANTE,
} = Role;

/** Estos 3 ven TODO el menú. Se inyectan automáticamente en cada grupo. */
export const SUPERADMIN = [
  ADMINISTRATOR,
  DIRECTOR_GENERAL_CEO,
  DIRECTOR_AREA_IT,
];

// ── Grupos de acceso ───────────────────────────────────────────────
// Solo listá los roles específicos del área. SUPERADMIN se agrega solo.

const LEGAL = [...SUPERADMIN, ASISTENTE_LEGAL, ABOGADO_REPRESENTANTE];
const LEGAL_INTERNO = [...SUPERADMIN, ASISTENTE_LEGAL];
const VENTAS = [...SUPERADMIN, DIRECTORA_AREA_VENTAS, REPRESENTANTE_VENTAS];
const CAJA = [
  ...SUPERADMIN,
  ASISTENTE_LEGAL,
  DIRECTORA_AREA_VENTAS,
  REPRESENTANTE_VENTAS,
  DIRECTORA_AREA_CONTABLE,
];
const CONTABLE = [...SUPERADMIN, DIRECTORA_AREA_CONTABLE];
const MARKETING = [
  ...SUPERADMIN,
  DIRECTORA_AREA_MARKETING,
  GESTOR_CONTENIDOS,
  DISENADOR_GRAFICO,
];

// ── Menú único ─────────────────────────────────────────────────────
// El orden aquí es el orden en el sidebar.

export const MENU_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    name: "Panel Principal",
    path: "/admin/dashboard",
    roles: [...LEGAL, ...VENTAS],
  },
  {
    icon: SquareKanban,
    name: "Embudo",
    path: "/admin/crm",
    roles: [...LEGAL, ...VENTAS],
  },
  {
    icon: CalendarDays,
    name: "Calendario",
    path: "/admin/calendar",
    roles: [...LEGAL, ...VENTAS],
  },
  {
    icon: Users2,
    name: "Clientes",
    path: "/admin/customers",
    roles: [...LEGAL_INTERNO, ...VENTAS],
  },
  {
    icon: Scale,
    name: "Causas",
    path: "/admin/legal-cases",
    roles: LEGAL,
  },
  {
    icon: Wrench,
    name: "Calculadoras",
    roles: LEGAL,
    subItems: [
      { name: "RIPTE", path: "/admin/calculator/ripte", roles: LEGAL_INTERNO },
      { name: "Acc. de Trabajo", path: "/admin/calculator/accidents-work" },
      { name: "Acc. de Tránsito", path: "/admin/calculator/accidents-transit" },
    ],
  },
  {
    icon: MessageCircle,
    name: "Consultas",
    path: "/admin/consultations",
    roles: LEGAL,
  },
  {
    icon: ArrowRightLeft,
    name: "Negociaciones",
    path: "/admin/negotiation",
    roles: LEGAL,
  },
  {
    icon: Handshake,
    name: "Gestor de Cierres",
    path: "/admin/closing-manager",
    roles: LEGAL,
  },
  {
    icon: Wallet,
    name: "Mi Caja",
    path: "/admin/my-cashbox",
    roles: CAJA,
  },
  {
    icon: Landmark,
    name: "Caja Principal",
    path: "/admin/cashbox",
    roles: CONTABLE,
  },
  {
    icon: BarChart3,
    name: "Estadísticas",
    path: "/admin/reports/sales",
    roles: VENTAS,
  },
  {
    icon: ChartArea,
    name: "Estadísticas",
    path: "/admin/reports/legal",
    roles: LEGAL_INTERNO,
  },
  {
    icon: User,
    name: "Miembros",
    path: "/admin/members",
    roles: SUPERADMIN,
  },
  {
    icon: Pencil,
    name: "Blog",
    path: "/admin/posts",
    roles: MARKETING,
  },
  {
    icon: Settings,
    name: "Configuración",
    path: "/admin/settings",
    roles: SUPERADMIN,
    subItems: [
      { name: "General", path: "/admin/settings/general" },
      { name: "Usuarios", path: "/admin/settings/users" },
      { name: "Permisos", path: "/admin/settings/permissions" },
      { name: "RIPTE", path: "/admin/calculator/ripte" },
    ],
  },
];

// ── Sección para el sidebar ────────────────────────────────────────

export const MENU_SECTIONS: MenuSection[] = [
  { label: "MENU", type: "menu", items: MENU_ITEMS },
];

export const NAV_ITEMS: NavItem[] = MENU_ITEMS;
