import type { NavItem } from "@/types/navigation";

import {
  LayoutDashboard,
  MessageCircle,
  SquareKanban,
  Bot,
  Users2,
  Scale,
  Calculator,
  CalendarDays,
  Landmark,
  Handshake,
  Ticket,
  Bell,
  Wallet,
  BarChart3,
  Settings,
  User,
  ChartArea,
  ArrowRightLeft,
  PencilOff,
  Pencil,
} from "lucide-react";

// MENU section
export const MENU_ITEMS: NavItem[] = [
  {
    icon: LayoutDashboard,
    name: "Panel Principal",
    path: "/admin/dashboard",
  },
  // {
  //   icon: Bell,
  //   name: "Notificaciones",
  //   path: "/admin/notifications",
  // },
];

// VENTAS section
export const VENTAS_ITEMS: NavItem[] = [
  {
    icon: SquareKanban,
    name: "Embudo",
    path: "/admin/crm",
  },
  {
    icon: Users2,
    name: "Clientes",
    path: "/admin/customers",
  },
];

// LEGALES section
export const LEGALES_ITEMS: NavItem[] = [
  {
    icon: Scale,
    name: "Causas",
    path: "/admin/legal-cases",
  },
  {
    name: "Calculadoras",
    icon: Calculator,
    subItems: [
      { name: "RIPTE", path: "/admin/calculator/ripte" },
      {
        name: "Acc...de Trabajo",
        path: "/admin/calculator/accidents-work",
        pro: true,
      },
      {
        name: "Acc...de Transito",
        path: "/admin/calculator/accidents-transit",
        pro: true,
      },
    ],
  },
  {
    name: "Consultas",
    icon: MessageCircle,
    path: "/admin/consultations",
  },
  {
    name: "Calendario",
    icon: CalendarDays,
    path: "/admin/calendar",
  },
];

// CONTABLE section
export const CONTABLE_ITEMS: NavItem[] = [
  {
    icon: ArrowRightLeft,
    name: "Negociaciones",
    path: "/admin/negotiation",
  },
  {
    icon: Handshake,
    name: "Gestor de Cierres",
    path: "/admin/closing-manager",
  },
  {
    icon: Landmark,
    name: "Caja Principal",
    path: "/admin/cashbox",
  },
  {
    icon: Wallet,
    name: "Mi Caja",
    path: "/admin/my-cashbox",
  },
];

// ESTADISTICAS section
export const ESTADISTICAS_ITEMS: NavItem[] = [
  {
    icon: BarChart3,
    name: "Ventas",
    path: "/admin/reports/sales",
  },
  {
    icon: ChartArea,
    name: "Legales",
    path: "/admin/reports/legal",
  },
];

// SOPORTE section
export const SOPORTE_ITEMS: NavItem[] = [
];

// ADMINISTRACION section
export const ADMINISTRACION_ITEMS: NavItem[] = [
  {
    icon: User,
    name: "Miembros",
    path: "/admin/members",
  },
  {
    icon: Pencil,
    name: "Blog",
    path: "/admin/posts",
  },
  {
    icon: Settings,
    name: "Configuración",
    path: "/admin/settings",
    subItems: [
      { name: "General", path: "/admin/settings/general" },
      { name: "Usuarios", path: "/admin/settings/users" },
      { name: "Permisos", path: "/admin/settings/permissions" },
    ],
  },
];

// For backward compatibility, keep these exports but update them to use the new structure
export const NAV_ITEMS: NavItem[] = [
  ...MENU_ITEMS,
  ...VENTAS_ITEMS,
  ...LEGALES_ITEMS,
  ...CONTABLE_ITEMS,
];

export const SUPPORT_ITEMS: NavItem[] = [...ESTADISTICAS_ITEMS];

export const OTHERS_ITEMS: NavItem[] = [
  ...SOPORTE_ITEMS,
  ...ADMINISTRACION_ITEMS,
];
