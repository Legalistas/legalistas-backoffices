import {
  ArrowRightLeft,
  BarChart3,
  CalendarDays,
  ChartArea,
  Handshake,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  Pencil,
  Scale,
  Settings,
  SquareKanban,
  User,
  Users2,
  Wallet,
  Wrench,
} from "lucide-react";
import { Role } from "@/constant/user";
import type { MenuSection, NavItem } from "@/types/navigation";

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

const LEGAL = [
  ...SUPERADMIN,
  ASISTENTE_LEGAL,
  ABOGADO_REPRESENTANTE,
  DIRECTORA_AREA_CONTABLE,
];
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
    name: "Casos",
    path: "/admin/legal-cases",
    roles: LEGAL,
  },
  {
    icon: Wrench,
    name: "Calculadoras",
    roles: LEGAL,
    subItems: [
      { name: "RIPTE", path: "/admin/calculator/ripte", roles: LEGAL_INTERNO },
      { name: "LTR", path: "/admin/calculator/accidents-work" },
      { name: "Acc. de Tránsito", path: "/admin/calculator/accidents-transit" },
    ],
  },
  // {
  //   icon: MessageCircle,
  //   name: "Consultas",
  //   path: "/admin/consultations",
  //   roles: LEGAL,
  // },
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
    roles: [...CAJA, ...MARKETING],
  },
  {
    icon: Landmark,
    name: "Caja Principal",
    path: "/admin/cashbox",
    roles: CONTABLE,
  },
  {
    icon: BarChart3,
    name: "Estadísticas Ventas",
    path: "/admin/reports/sales",
    roles: VENTAS,
  },
  {
    icon: ChartArea,
    name: "Estadísticas Legal",
    path: "/admin/reports/legal",
    roles: LEGAL_INTERNO,
  },
  {
    icon: User,
    name: "Equipo",
    path: "/admin/teams",
    roles: LEGAL_INTERNO,
  },
  // {
  //   icon: Pencil,
  //   name: "Blog",
  //   path: "/admin/posts",
  //   roles: MARKETING,
  // },
];

// ── Sección para el sidebar ────────────────────────────────────────

export const MENU_SECTIONS: MenuSection[] = [
  { label: "MENU", type: "menu", items: MENU_ITEMS },
];

export const NAV_ITEMS: NavItem[] = MENU_ITEMS;
