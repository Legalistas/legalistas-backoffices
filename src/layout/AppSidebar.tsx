"use client"
import type React from "react"
import { useEffect, useRef, useCallback, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/context/SidebarContext"
import SidebarWidget from "../components/SidebarWidget"
import type { NavItem } from "@/types/navigation"
import { ChevronDown, Ellipsis } from "lucide-react"
import {
    MENU_ITEMS,
    VENTAS_ITEMS,
    LEGALES_ITEMS,
    CONTABLE_ITEMS,
    ESTADISTICAS_ITEMS,
    SOPORTE_ITEMS,
    ADMINISTRACION_ITEMS,
} from "@/constant/menu"
import { useSession } from "next-auth/react"
import { Can } from "@/components/auth/Can"

const AppSidebar: React.FC = () => {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar()
    const pathname = usePathname()
    const { data: session } = useSession()

    const renderMenuItems = (navItems: NavItem[], menuType: string) => (
        <ul className="flex flex-col gap-4">
            {navItems.map((nav, index) => (
                <li key={nav.name}>
                    {/* Aplicar restricciones basadas en rol para elementos específicos */}
                    {nav.path === "/admin/cashbox" ? (
                        <Can role={["admin", "director_general_ceo", "gerente_general_coo", "directora_area_contable"]}>
                            {nav.subItems ? (
                                <button
                                    onClick={() => handleSubmenuToggle(index, menuType)}
                                    className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                        ? "menu-item-active"
                                        : "menu-item-inactive"
                                        } cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                                >
                                    <span
                                        className={` ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                            ? "menu-item-icon-active"
                                            : "menu-item-icon-inactive"
                                            }`}
                                    >
                                        <nav.icon />
                                    </span>
                                    {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text`}>{nav.name}</span>}
                                    {(isExpanded || isHovered || isMobileOpen) && (
                                        <ChevronDown
                                            className={`ml-auto w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType && openSubmenu?.index === index ? "rotate-180 text-[#09A4B5]" : ""
                                                }`}
                                        />
                                    )}
                                </button>
                            ) : (
                                nav.path && (
                                    <Link
                                        href={nav.path}
                                        className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                                    >
                                        <span className={`${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                                            <nav.icon />
                                        </span>
                                        {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text`}>{nav.name}</span>}
                                    </Link>
                                )
                            )}
                        </Can>
                    ) : nav.path === "/admin/customers" ? (
                        // Bloquear clientes para asistente_legal
                        <Can role="asistente_legal" inverse>
                            {nav.subItems ? (
                                <button
                                    onClick={() => handleSubmenuToggle(index, menuType)}
                                    className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                        ? "menu-item-active"
                                        : "menu-item-inactive"
                                        } cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                                >
                                    <span
                                        className={` ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                            ? "menu-item-icon-active"
                                            : "menu-item-icon-inactive"
                                            }`}
                                    >
                                        <nav.icon />
                                    </span>
                                    {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text`}>{nav.name}</span>}
                                    {(isExpanded || isHovered || isMobileOpen) && (
                                        <ChevronDown
                                            className={`ml-auto w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType && openSubmenu?.index === index ? "rotate-180 text-[#09A4B5]" : ""
                                                }`}
                                        />
                                    )}
                                </button>
                            ) : (
                                nav.path && (
                                    <Link
                                        href={nav.path}
                                        className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                                    >
                                        <span className={`${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                                            <nav.icon />
                                        </span>
                                        {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text`}>{nav.name}</span>}
                                    </Link>
                                )
                            )}
                        </Can>
                    ) : (
                        // Elementos sin restricciones especiales
                        <>
                            {nav.subItems ? (
                                <button
                                    onClick={() => handleSubmenuToggle(index, menuType)}
                                    className={`menu-item group  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                        ? "menu-item-active"
                                        : "menu-item-inactive"
                                        } cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                                >
                                    <span
                                        className={` ${openSubmenu?.type === menuType && openSubmenu?.index === index
                                            ? "menu-item-icon-active"
                                            : "menu-item-icon-inactive"
                                            }`}
                                    >
                                        <nav.icon />
                                    </span>
                                    {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text`}>{nav.name}</span>}
                                    {(isExpanded || isHovered || isMobileOpen) && (
                                        <ChevronDown
                                            className={`ml-auto w-5 h-5 transition-transform duration-200  ${openSubmenu?.type === menuType && openSubmenu?.index === index ? "rotate-180 text-[#09A4B5]" : ""
                                                }`}
                                        />
                                    )}
                                </button>
                            ) : (
                                nav.path && (
                                    <Link
                                        href={nav.path}
                                        className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                                    >
                                        <span className={`${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                                            <nav.icon />
                                        </span>
                                        {(isExpanded || isHovered || isMobileOpen) && <span className={`menu-item-text`}>{nav.name}</span>}
                                    </Link>
                                )
                            )}
                        </>
                    )}
                    {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                        <div
                            ref={(el) => {
                                subMenuRefs.current[`${menuType}-${index}`] = el
                            }}
                            className="overflow-hidden transition-all duration-300"
                            style={{
                                height:
                                    openSubmenu?.type === menuType && openSubmenu?.index === index
                                        ? `${subMenuHeight[`${menuType}-${index}`]}px`
                                        : "0px",
                            }}
                        >
                            <ul className="mt-2 space-y-1">
                                {nav.subItems.map((subItem) => (
                                    <li key={subItem.name}>
                                        <Link
                                            href={subItem.path}
                                            className={`menu-dropdown-item ${isActive(subItem.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                                                }`}
                                        >
                                            {subItem.name}
                                            <span className="flex items-center gap-1 ml-auto">
                                                {subItem.new && (
                                                    <span
                                                        className={`ml-auto ${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"
                                                            } menu-dropdown-badge `}
                                                    >
                                                        new
                                                    </span>
                                                )}
                                                {subItem.pro && (
                                                    <span
                                                        className={`ml-auto ${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"
                                                            } menu-dropdown-badge `}
                                                    >
                                                        pro
                                                    </span>
                                                )}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    )

    const [openSubmenu, setOpenSubmenu] = useState<{
        type: string
        index: number
    } | null>(null)
    const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({})
    const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const isActive = useCallback((path: string) => path === pathname, [pathname])

    useEffect(() => {
        // Check if the current path matches any submenu item
        let submenuMatched = false
        const allMenuTypes = [
            { type: "menu", items: MENU_ITEMS },
            { type: "ventas", items: VENTAS_ITEMS },
            { type: "legales", items: LEGALES_ITEMS },
            { type: "contable", items: CONTABLE_ITEMS },
            { type: "estadisticas", items: ESTADISTICAS_ITEMS },
            { type: "soporte", items: SOPORTE_ITEMS },
            { type: "administracion", items: ADMINISTRACION_ITEMS },
        ]

        allMenuTypes.forEach(({ type, items }) => {
            items.forEach((nav, index) => {
                if (nav.subItems) {
                    nav.subItems.forEach((subItem) => {
                        if (isActive(subItem.path)) {
                            setOpenSubmenu({
                                type,
                                index,
                            })
                            submenuMatched = true
                        }
                    })
                }
            })
        })

        // If no submenu item matches, close the open submenu
        if (!submenuMatched) {
            setOpenSubmenu(null)
        }
    }, [pathname, isActive])

    useEffect(() => {
        // Set the height of the submenu items when the submenu is opened
        if (openSubmenu !== null) {
            const key = `${openSubmenu.type}-${openSubmenu.index}`
            if (subMenuRefs.current[key]) {
                setSubMenuHeight((prevHeights) => ({
                    ...prevHeights,
                    [key]: subMenuRefs.current[key]?.scrollHeight || 0,
                }))
            }
        }
    }, [openSubmenu])

    const handleSubmenuToggle = (index: number, menuType: string) => {
        setOpenSubmenu((prevOpenSubmenu) => {
            if (prevOpenSubmenu && prevOpenSubmenu.type === menuType && prevOpenSubmenu.index === index) {
                return null
            }
            return { type: menuType, index }
        })
    }

    return (
        <aside
            className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-[#1C2434] dark:bg-gray-900 dark:border-gray-800 text-white h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[225px]" : isHovered ? "w-[225px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`py-8 flex  ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                <Link href="/">
                    {isExpanded || isHovered || isMobileOpen ? (
                        <>
                            <Image className="dark:hidden" src="/images/logo/logo-dark.svg" alt="Logo" width={180} height={60} />
                            <Image
                                className="hidden dark:block"
                                src="/images/logo/logo-dark.svg"
                                alt="Logo"
                                width={180}
                                height={60}
                            />
                        </>
                    ) : (
                        <Image src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} className="dark:hidden" />
                    )}
                </Link>
            </div>
            <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
                <nav className="mb-6">
                    <div className="flex flex-col gap-4">
                        {/* MENU Section */}
                        <div>
                            <h2
                                className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                    }`}
                            >
                                {isExpanded || isHovered || isMobileOpen ? "MENU" : <Ellipsis />}
                            </h2>
                            {renderMenuItems(MENU_ITEMS, "menu")}
                        </div>

                        {/* VENTAS Section */}
                        <div>
                            <h2
                                className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                    }`}
                            >
                                {isExpanded || isHovered || isMobileOpen ? "VENTAS" : <Ellipsis />}
                            </h2>
                            {renderMenuItems(VENTAS_ITEMS, "ventas")}
                        </div>

                        {/* LEGALES Section */}
                        <Can role="asistente_legal" inverse>
                            <div>
                                <h2
                                    className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                        }`}
                                >
                                    {isExpanded || isHovered || isMobileOpen ? "LEGALES" : <Ellipsis />}
                                </h2>
                                {renderMenuItems(LEGALES_ITEMS, "legales")}
                            </div>
                        </Can>

                        {/* CONTABLE Section */}
                        <Can role="asistente_legal" inverse>
                            <div>
                                <h2
                                    className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                        }`}
                                >
                                    {isExpanded || isHovered || isMobileOpen ? "CONTABLE" : <Ellipsis />}
                                </h2>
                                {renderMenuItems(CONTABLE_ITEMS, "contable")}
                            </div>
                        </Can>

                        {/* ESTADISTICAS Section */}
                        <Can role="asistente_legal" inverse>
                            <div>
                                <h2
                                    className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                        }`}
                                >
                                    {isExpanded || isHovered || isMobileOpen ? "ESTADISTICAS" : <Ellipsis />}
                                </h2>
                                {renderMenuItems(ESTADISTICAS_ITEMS, "estadisticas")}
                            </div>
                        </Can>

                        {/* SOPORTE Section */}
                        <div>
                            <h2
                                className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                    }`}
                            >
                                {isExpanded || isHovered || isMobileOpen ? "SOPORTE" : <Ellipsis />}
                            </h2>
                            {renderMenuItems(SOPORTE_ITEMS, "soporte")}
                        </div>

                        {/* ADMINISTRACION Section */}
                        <Can role="asistente_legal" inverse>
                            <div>
                                <h2
                                    className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                                        }`}
                                >
                                    {isExpanded || isHovered || isMobileOpen ? "ADMINISTRACIÓN" : <Ellipsis />}
                                </h2>
                                {renderMenuItems(ADMINISTRACION_ITEMS, "administracion")}
                            </div>
                        </Can>
                    </div>
                </nav>
                {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
            </div>
        </aside>
    )
}

export default AppSidebar
