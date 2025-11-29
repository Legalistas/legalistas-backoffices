"use client"

import Link from "next/link"
import type React from "react"
import type { BreadcrumbItem } from "@/types/breadcrumbs"

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  pageTitle?: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, pageTitle }) => {
  const displayPageTitle = pageTitle || (items.length > 0 ? items[items.length - 1].title : "")

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{displayPageTitle}</h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            return (
              <li key={item.href} className="flex items-center">
                {!isLast ? (
                  <Link
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    href={item.href}
                  >
                    {item.icon && <span className="flex items-center justify-center w-4 h-4">{item.icon}</span>}
                    <span className="flex items-center">{item.title}</span>
                    <svg
                      className="stroke-current"
                      width="17"
                      height="16"
                      viewBox="0 0 17 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                        stroke=""
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-white/90">
                    {item.icon && <span className="flex items-center justify-center w-4 h-4">{item.icon}</span>}
                    <span className="flex items-center">{item.title}</span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}

export default Breadcrumb

