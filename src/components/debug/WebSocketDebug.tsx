"use client"

import { useEffect, useState } from "react"
import { useChat } from "@/context/ChatContext"

interface ConnectionInfo {
  transport: string
  socketId: string
  connected: boolean
  ping: number
}

export default function WebSocketDebug() {
  const { connectionStatus } = useChat()
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Solo mostrar en desarrollo o con parámetro debug
    const showDebug = process.env.NODE_ENV === 'development' || 
                     new URLSearchParams(window.location.search).has('debug')
    setIsVisible(showDebug)

    if (typeof window !== 'undefined' && (window as any).io) {
      const socket = (window as any).io.sockets[0] // Primer socket
      
      if (socket) {
        const updateInfo = () => {
          setConnectionInfo({
            transport: socket.io?.engine?.transport?.name || 'unknown',
            socketId: socket.id || 'none',
            connected: socket.connected,
            ping: socket.ping || 0
          })
        }

        socket.on('connect', updateInfo)
        socket.on('disconnect', updateInfo)
        socket.io?.engine?.on('upgrade', updateInfo)
        
        updateInfo() // Initial update

        return () => {
          socket.off('connect', updateInfo)
          socket.off('disconnect', updateInfo)
          socket.io?.engine?.off('upgrade', updateInfo)
        }
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg text-xs font-mono z-50 shadow-lg">
      <div className="mb-2 font-semibold">🔌 WebSocket Debug</div>
      <div>Estado: 
        <span className={`ml-1 ${
          connectionStatus === 'connected' ? 'text-green-400' : 
          connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {connectionStatus}
        </span>
      </div>
      {connectionInfo && (
        <>
          <div>Transport: <span className="text-blue-400">{connectionInfo.transport}</span></div>
          <div>Socket ID: <span className="text-gray-400">{connectionInfo.socketId}</span></div>
          <div>Ping: <span className="text-green-400">{connectionInfo.ping}ms</span></div>
        </>
      )}
      <div className="mt-2 text-gray-400 text-[10px]">
        Agregar ?debug a la URL para mostrar
      </div>
    </div>
  )
}