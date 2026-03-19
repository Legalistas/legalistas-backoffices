# Changelog — Legalistas Frontend

## [3.0.0] - 2026-03-19

### Infraestructura
- Actualizado a **Next.js 16.2.0** y **React 19.2.0**
- Migración de npm a **Bun** como package manager
- Migración de ESLint a **Biome** para linting y formato
- Actualizado **Tailwind CSS v4.2** (nueva sintaxis `@theme inline`, `@import "tailwindcss"`)
- Actualizado **Radix UI v1.4** y componentes shadcn/ui
- Eliminado `server.js`, `eslint.config.mjs`, `package-lock.json`

### Autenticación
- Corregido login con Google: mapeo de `role`, `roleDetails` y `permissions` desde `roleUser[0].role`
- Corregido registro de user-agent real del navegador en activity logs (antes registraba "Desconocido")
  - Frontend envía `navigator.userAgent` como campo en el body al backend
  - Backend prioriza `req.body.userAgent` sobre `req.headers['user-agent']`
- Rediseño completo del formulario de login (`SignInForm`)
  - Iconos en inputs (Mail, Lock), botón Google full-width, spinner de carga
  - Eliminado botón de login con X (no funcional)


### Modo Oscuro — Rediseño Global
- Nuevas variables CSS en `.dark` con tinte azulado (hue 250) para todo el tema oscuro
- Scrollbar personalizado para dark mode
- Páginas corregidas:
  - **Gestor de Casos**: tabla, filtros, paginación, badges de servicio/etapa
  - **Gestor de Cierres**: tabla, KPIs, filtros, formulario de creación
  - **Clientes**: tabla, modal de creación/edición
  - **Chat**: sidebar, lista, mensajes, header, input de envío
  - **Perfil**: todas las secciones
  - **Auth pages**: error, access-denied, signin, signup, reset-password
  - **Closing Manager Create**: tabs, dropdowns, inputs, info cards

### Gestor de Casos
- Loading spinner reemplazado por **Skeleton** (tabla con 10 filas)
- Overlay de recarga: `backdrop-blur` sutil sin degradé blanco
- Filtro de fecha: reemplazado inputs `type="date"` por **Calendar range picker** (shadcn) con 2 meses
- Paginación: formato español, ellipsis inteligente (`1 ... 4 5 6 ... 107`)
- Notas: limpieza de HTML tags antes de mostrar (`stripHtml`)
- Botones de acción: sin borde/fondo, solo iconos con hover sutil
- Fix: key duplicada "Estadísticas" en menú de navegación

### Gestor de Cierres
- Dark mode completo en tabla, KPIs, filtros y formulario de creación
- **ViewClosingModal** reemplazado por **Sheet** (panel lateral derecho)
  - Mantiene diseño: header gradiente, secciones HP/PCL/Aportes con colores
  - Colores de secciones con variantes dark (`dark:bg-blue-900/20`, etc.)
- Formulario de creación rediseñado con **grid layout**:
  - Sidebar izquierdo (280px): datos del caso con iconos + monto a transferir en vivo
  - Panel derecho: datos del cierre (tipo, estados, HP, PCL, aportes)
  - Campos Causa/Expediente/Capital en fila horizontal
- Selects arreglados: `<SelectValue>` en vez de `<span>` manual
- Badges de status con dark mode en `closing-manager.ts`
- Fix: enum `FINALIZADAS` (no `FINALIZADA`) para negociaciones
- Skeleton loading para la tabla principal

### Clientes
- Tabla con dark mode completo
- **Modal de creación/edición** reemplazado por **Dialog** de shadcn
  - Selects HTML reemplazados por Select de shadcn
  - Secciones con títulos limpios (Información Personal, Documentación, Dirección)
- Skeleton loading
- Botones de acción: iconos sin borde

### Chat
- Dark mode: fondos `dark:bg-white/3`, bordes `dark:border-gray-800`
- Tabs con estilo pill/segmented control
- Burbujas de mensaje con bordes redondeados (`rounded-2xl`)
- Input de mensaje con borde visible y fondo sutil
- Botón enviar con icono `Send` de lucide
- Tiempos compactos (`5min`, `2h`, `3d`)
- Todo traducido a español

### Perfil — Rediseño Completo
- Layout: grid `[240px_1fr]` con sidebar compacto
- **Información General**: avatar con nombre/email, Selects de shadcn, skeleton loading
- **Seguridad** (nuevo): cambio de contraseña conectado a `/api/v1/app/change-password`, toggle ver/ocultar
- **Sesiones activas** (nuevo): muestra dispositivo, navegador, OS, IP, método de login, fecha
- **Notificaciones** (nuevo): 5 toggles con Switch (email, push, reuniones, leads, sistema)
- **Conexiones** (nuevo, reemplaza Idioma): estado de vinculación con Google, Microsoft (próximamente)

### Backend (cambios menores)
- `viewProfileAndAddress`: ahora devuelve `googleLinked`, `emailVerified`, `createdAt`, `activeSessions`
- `auth.controller.ts`: prioriza `req.body.userAgent` sobre headers para activity logs
- Ambos endpoints de login (credentials y Google) usan el user-agent real del browser
