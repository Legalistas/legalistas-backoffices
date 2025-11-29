"use client"

import { useState } from "react"
import { EllipsisVertical, User } from 'lucide-react'

import Button from "@/components/ui/button/Button"
import Badge from "@/components/ui/badge/Badge"
import { Dropdown } from "@/components/ui/dropdown/Dropdown"
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem"
import type { Lead } from "@/types/crm"
import { formatDateCustom } from "@/lib/functions"
import { SOURCE_CHANNEL } from "@/constant/crm"
import Link from "next/link"
import Image from "next/image"

interface LeadCardProps {
  lead: Lead
  onEdit: () => void
  onDelete: () => void
}

export default function LeadCard({ lead, onEdit, onDelete }: LeadCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Add defensive checks for lead properties
  if (!lead) {
    console.error("Lead is undefined or null")
    return null
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es", {
        day: "numeric",
        month: "short",
      }).format(date)
    } catch (e) {
      console.error("Error formatting date:", e)
      return "Invalid date"
    }
  }

  const getSellerName = (sellerId: number | undefined) => {
    if (!sellerId) return "Sin vendedor"

    // Map seller IDs to names
    const sellerMap: Record<number, string> = {
      4: "Juan Pérez",
      5: "María García",
      6: "Carlos Rodríguez",
    }

    return sellerMap[sellerId] || `Vendedor ${sellerId}`
  }

  const getSourceChannelLabel = (sourceChannelId: number | undefined) => {
    if (!sourceChannelId) return "Desconocido"

    const channel = SOURCE_CHANNEL.find((ch) => ch.id === sourceChannelId)
    return channel ? channel.name : `Canal ${sourceChannelId}`
  }

  // Get user location from userAddresses
  const getUserLocation = () => {
    if (!lead.user?.userAddresses || lead.user.userAddresses.length === 0) {
      return "-"
    }

    // Buscar dirección por defecto o la primera
    const defaultAddress = lead.user.userAddresses.find(addr => addr.isDefault) || lead.user.userAddresses[0]

    if (!defaultAddress) return "-"

    const province = defaultAddress.state?.name || "Estado desconocido"
    const city = defaultAddress.city?.trim()

    return `${province}${city ? ` - ${city}` : " - -"}`
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            <Link href={`/admin/crm/leads/${lead.id}`}>
              {lead.user?.name || "Sin nombre"}
            </Link>
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400  mb-2">
            {getUserLocation()}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            {/* Badge de servicio */}
            {lead.services && (
              <Badge
                variant="light"
                className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
              >
                {lead.services.label}
              </Badge>
            )}
          </div>


          {/* Avatares */}
          <div className="flex -space-x-2 mt-2">
            {lead.seller && (
              <Image
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src={
                  lead.seller?.image
                    ? (lead.seller.image.startsWith('http')
                      ? lead.seller.image
                      : `${process.env.NEXT_PUBLIC_BACKEND_URL}${lead.seller.image}`)
                    : "/placeholder.svg"
                }
                alt={lead.seller?.name || "avatar 1"}
                width={32}
                height={32}
              />
            )}
            {lead.internalLawyer && (
              <Image
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src={
                  lead.internalLawyer?.image
                    ? (lead.internalLawyer.image.startsWith('http')
                      ? lead.internalLawyer.image
                      : `${process.env.NEXT_PUBLIC_BACKEND_URL}${lead.internalLawyer.image}`)
                    : "/placeholder.svg"
                }
                alt={lead.internalLawyer?.name || "avatar 2"}
                width={32}
                height={32}
              />
            )}
            {lead.responsibleLawyer && (
              <Image
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                src={
                  lead.responsibleLawyer?.image
                    ? (lead.responsibleLawyer.image.startsWith('http')
                      ? lead.responsibleLawyer.image
                      : `${process.env.NEXT_PUBLIC_BACKEND_URL}${lead.responsibleLawyer.image}`)
                    : "/placeholder.svg"
                }
                alt={lead.responsibleLawyer?.name || "avatar 3"}
                width={32}
                height={32}
              />
            )}
          </div>
        </div>
        <div className="relative">
          <Button
            variant="custom"
            size="sm"
            className="h-7 w-7 text-gray-600 hover:bg-gray-300 dark:hover:bg-gray-400 rounded-full p-1"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <EllipsisVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
          <Dropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} className="w-40">
            <DropdownItem tag="a" href={`/admin/crm/leads/${lead.id}`}>
              Ver detalles
            </DropdownItem>
            <DropdownItem onClick={onEdit}>Editar</DropdownItem>
            <DropdownItem 
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.')) {
                  onDelete()
                }
              }} 
              className="text-red-600"
            >
              Eliminar
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* <div className="px-4 pb-2">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
        </div>
        <div className="mb-2">
        </div>
      </div> */}

      <div className="flex justify-between items-center px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatDateCustom(lead.createdAt)}
        </div>
        <Badge variant="light" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {getSourceChannelLabel(lead.sourceChannelId)}
        </Badge>
      </div>
    </div>
  )
}