import {
  ArrowRightLeft,
  BarChart3,
  Bell,
  CalendarDays,
  ChartArea,
  HardDrive,
  Handshake,
  Landmark,
  LayoutDashboard,
  Medal,
  MessageCircle,
  Pencil,
  PieChart,
  Receipt,
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
  GERENTE_GENERAL_COO,
  DIRECTORA_AREA_LEGAL,
  COORDINADOR_LEGAL,
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
  DIRECTORA_AREA_CONTABLE,
];

// ── Grupos de acceso ───────────────────────────────────────────────
// Solo listá los roles específicos del área. SUPERADMIN se agrega solo.

const LEGAL = [
  ...SUPERADMIN,
  ASISTENTE_LEGAL,
  ABOGADO_REPRESENTANTE,
  DIRECTORA_AREA_CONTABLE,
  DIRECTORA_AREA_VENTAS,
  DIRECTORA_AREA_LEGAL,
];
const LEGAL_INTERNO = [...SUPERADMIN, ASISTENTE_LEGAL, DIRECTORA_AREA_LEGAL];
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
const REPRESENTANTES_ACCESS = [
  ...SUPERADMIN,
  GERENTE_GENERAL_COO,
  DIRECTORA_AREA_LEGAL,
  COORDINADOR_LEGAL,
  ASISTENTE_LEGAL,
];

const RRHH_REPORTS_ACCESS = [
  ...SUPERADMIN,
  DIRECTORA_AREA_LEGAL,
  COORDINADOR_LEGAL,
  ASISTENTE_LEGAL,
];

// ── Menú agrupado por área funcional ───────────────────────────────
// El orden de las secciones y de los items dentro de cada sección es el orden
// en que aparecen en el sidebar. Items con `roles` se filtran por usuario;
// una sección queda oculta si todos sus items lo están.

export const MENU_SECTIONS: MenuSection[] = [
  {
    label: "Operación",
    type: "menu",
    items: [
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
        roles: [...LEGAL, ...VENTAS, ...MARKETING],
      },
      {
        icon: CalendarDays,
        name: "Calendario",
        path: "/admin/calendar",
        roles: [...LEGAL, ...VENTAS, ...MARKETING],
      },
      {
        icon: Bell,
        name: "Monitor CRM",
        path: "/admin/crm-monitor",
        roles: [...SUPERADMIN, DIRECTORA_AREA_LEGAL, DIRECTORA_AREA_VENTAS],
      },
    ],
  },
  {
    label: "Comercial",
    type: "menu",
    items: [
      {
        icon: Users2,
        name: "Clientes",
        path: "/admin/customers",
        roles: [...LEGAL_INTERNO, ...VENTAS, DIRECTORA_AREA_MARKETING],
      },
      {
        icon: BarChart3,
        name: "Estadísticas Ventas",
        path: "/admin/reports/sales",
        roles: VENTAS,
      },
    ],
  },
  {
    label: "Coordinación",
    type: "menu",
    items: [
      {
        icon: LayoutDashboard,
        name: "KPIs",
        path: "/admin/kpis",
        roles: [...LEGAL_INTERNO, ...VENTAS, ...CONTABLE, ...MARKETING],
      },
    ],
  },
  {
    label: "Legal",
    type: "menu",
    items: [
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
          {
            name: "RIPTE",
            path: "/admin/calculator/ripte",
            roles: LEGAL_INTERNO,
          },
          { name: "LRT", path: "/admin/calculator/accidents-work" },
          {
            name: "Acc. de Tránsito",
            path: "/admin/calculator/accidents-transit",
            roles: SUPERADMIN,
          },
          {
            name: "Despidos",
            path: "/admin/calculator/dismissal",
            roles: SUPERADMIN,
          },
        ],
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
        icon: ChartArea,
        name: "Estadísticas Legal",
        path: "/admin/reports/legal",
        roles: LEGAL_INTERNO,
      },
      {
        icon: MessageCircle,
        name: "Consultas",
        path: "/admin/consultations",
        roles: [...LEGAL, ...LEGAL_INTERNO],
      },
    ],
  },
  {
    label: "Finanzas",
    type: "menu",
    items: [
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
        icon: Receipt,
        name: "Gastos e Ingresos",
        path: "/admin/accounting",
        roles: CONTABLE,
      },
    ],
  },
  {
    label: "Equipo",
    type: "menu",
    items: [
      {
        icon: Medal,
        name: "Representantes",
        path: "/admin/representantes",
        roles: REPRESENTANTES_ACCESS,
      },
      {
        icon: User,
        name: "Equipo",
        path: "/admin/teams",
        roles: [...LEGAL_INTERNO, ...CONTABLE],
      },
      {
        icon: PieChart,
        name: "Reportes RRHH",
        path: "/admin/rrhh/reports",
        roles: RRHH_REPORTS_ACCESS,
      },
      {
        icon: Users2,
        name: "Reclutamiento",
        path: "/admin/rrhh/recruitment",
        roles: SUPERADMIN,
      },
      {
        icon: Scale,
        name: "Abogados SRT",
        path: "/admin/lawyers",
        roles: LEGAL_INTERNO,
      },
    ],
  },
  {
    label: "Recursos",
    type: "menu",
    items: [
      {
        icon: HardDrive,
        name: "Archivos",
        path: "/admin/file-manager",
        roles: SUPERADMIN,
      },
      {
        icon: Pencil,
        name: "Blog",
        path: "/admin/blog",
        roles: MARKETING,
      },
    ],
  },
];

// ── Compat: lista plana para callers que aún esperan MENU_ITEMS / NAV_ITEMS ─

export const MENU_ITEMS: NavItem[] = MENU_SECTIONS.flatMap((s) => s.items);

export const NAV_ITEMS: NavItem[] = MENU_ITEMS;
