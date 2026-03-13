"use client"
import type React from "react"
import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/context/SidebarContext"
import type { NavItem } from "@/types/navigation"
import { ChevronDown, Ellipsis } from "lucide-react"
import { MENU_SECTIONS } from "@/constant/menu"
import { useSession } from "next-auth/react"

const AppSidebar: React.FC = () => {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar()
    const pathname = usePathname()
    const { data: session } = useSession()

    const userRole = session?.user?.role?.toLowerCase?.() ?? session?.user?.role

    const hasAccess = useCallback((roles?: string[]) => {
        if (!roles || roles.length === 0) return true
        if (!userRole) return false
        return roles.includes(userRole)
    }, [userRole])

    const filteredSections = useMemo(() => {
        return MENU_SECTIONS
            .filter((section) => hasAccess(section.roles))
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => hasAccess(item.roles)),
            }))
            .filter((section) => section.items.length > 0)
    }, [hasAccess])

    const [openSubmenu, setOpenSubmenu] = useState<{
        type: string
        index: number
    } | null>(null)
    const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({})
    const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const isActive = useCallback((path: string) => path === pathname, [pathname])

    useEffect(() => {
        let submenuMatched = false

        filteredSections.forEach(({ type, items }) => {
            items.forEach((nav, index) => {
                if (nav.subItems) {
                    nav.subItems.forEach((subItem) => {
                        if (isActive(subItem.path)) {
                            setOpenSubmenu({ type, index })
                            submenuMatched = true
                        }
                    })
                }
            })
        })

        if (!submenuMatched) {
            setOpenSubmenu(null)
        }
    }, [pathname, isActive, filteredSections])

    useEffect(() => {
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

    const renderMenuItems = (navItems: NavItem[], menuType: string) => (
        <ul className="flex flex-col gap-4">
            {navItems.map((nav, index) => {
                const Icon = nav.icon as React.ComponentType<{ className?: string }>
                const hasSubItems = !!nav.subItems
                const isSubmenuOpen = openSubmenu?.type === menuType && openSubmenu?.index === index

                const visibleSubItems = hasSubItems
                    ? nav.subItems!.filter((sub) => hasAccess(sub.roles))
                    : []

                if (hasSubItems && visibleSubItems.length === 0) return null

                return (
                    <li key={nav.name}>
                        {hasSubItems ? (
                            <button
                                onClick={() => handleSubmenuToggle(index, menuType)}
                                className={`menu-item group ${visibleSubItems.some((sub) => isActive(sub.path)) ? "menu-item-active" : "menu-item-inactive"}`}
                            >
                                <span className={`menu-item-icon ${visibleSubItems.some((sub) => isActive(sub.path)) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                {(isExpanded || isHovered || isMobileOpen) && (
                                    <>
                                        <span>{nav.name}</span>
                                        <ChevronDown
                                            className={`ml-auto w-4 h-4 menu-item-arrow ${isSubmenuOpen ? "menu-item-arrow-active" : "menu-item-arrow-inactive"}`}
                                        />
                                    </>
                                )}
                            </button>
                        ) : (
                            <Link
                                href={nav.path || "#"}
                                className={`menu-item group ${isActive(nav.path || "") ? "menu-item-active" : "menu-item-inactive"}`}
                            >
                                <span className={`menu-item-icon ${isActive(nav.path || "") ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                {(isExpanded || isHovered || isMobileOpen) && (
                                    <span>{nav.name}</span>
                                )}
                            </Link>
                        )}

                        {hasSubItems && (isExpanded || isHovered || isMobileOpen) && (
                            <div
                                ref={(el) => {
                                    subMenuRefs.current[`${menuType}-${index}`] = el
                                }}
                                className="overflow-hidden transition-all duration-300"
                                style={{
                                    height: isSubmenuOpen
                                        ? `${subMenuHeight[`${menuType}-${index}`]}px`
                                        : "0px",
                                }}
                            >
                                <ul className="mt-2 space-y-1">
                                    {visibleSubItems.map((subItem) => (
                                        <li key={subItem.name}>
                                            <Link
                                                href={subItem.path}
                                                className={`menu-dropdown-item ${isActive(subItem.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}
                                            >
                                                {subItem.name}
                                                <span className="flex items-center gap-1 ml-auto">
                                                    {subItem.new && (
                                                        <span
                                                            className={`ml-auto ${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}
                                                        >
                                                            new
                                                        </span>
                                                    )}
                                                    {subItem.pro && (
                                                        <span
                                                            className={`ml-auto ${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}
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
                )
            })}
        </ul>
    )

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
                        {filteredSections.map((section, idx) => {
                            const prevLabel = idx > 0 ? filteredSections[idx - 1].label : null
                            const showLabel = section.label !== prevLabel

                            return (
                                <div key={section.type}>
                                    {showLabel && (
                                        <h2
                                            className={`mb-4 text-xs uppercase flex leading-[20px] text-white ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
                                        >
                                            {isExpanded || isHovered || isMobileOpen ? section.label : <Ellipsis />}
                                        </h2>
                                    )}
                                    {renderMenuItems(section.items, section.type)}
                                </div>
                            )
                        })}
                    </div>
                </nav>
            </div>
        </aside>
    )
}

export default AppSidebar
