import { LucideProps } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export interface SubNavItem {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  roles?: string[];
}

export interface NavItem {
  name: string;
  icon:
    | ReactNode
    | ComponentType<LucideProps>
    | ComponentType<React.SVGProps<SVGSVGElement>>;
  path?: string;
  subItems?: SubNavItem[];
  roles?: string[];
}

export interface MenuSection {
  label: string;
  type: string;
  items: NavItem[];
  roles?: string[];
}
