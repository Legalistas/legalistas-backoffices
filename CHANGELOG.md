# Changelog — Legalistas Frontend

## [3.0.1] - 2026-03-19

### CRM

#### Leads
- **Nuevo diseño del formulario de Lead** — Dialog rediseñado con 4 secciones organizadas (Cliente, Asignación, Detalle del Caso, Seguros), layout 3 columnas, dialog más ancho (`max-w-3xl`), botón Cancelar + Guardar
- **Campos ART y Seguro** — Dos nuevos dropdowns opcionales (nulleables) para seleccionar compañía ART y aseguradora de vehículos, con 11 ARTs y 18 aseguradoras precargadas
- **ART y Seguro en detalle del Lead** — Se muestran en la card "Información del Lead" cuando tienen valor
- **Referente removido del formulario** — El selector de referente se quitó del crear/editar lead, se envía siempre como `null`
- **Constantes nuevas** — `ART_COMPANIES` e `INSURANCE_COMPANIES` en `crm.ts`
- **Tipo Lead actualizado** — Agregados `artId` e `insuranceId` al tipo `Lead`

#### Clientes
- **Formulario simplificado en modo crear** — Solo muestra: Nombre, Email, Teléfono, Provincia, Ciudad
- **Campos nulleados en creación** — `docType`, `docNumber`, `gender`, `birthDate`, `street`, `streetNumber` se envían como `null`
- **Argentina auto-seleccionada** — `countryId` se preselecciona automáticamente sin mostrarse
- **Modo editar sin cambios** — El formulario completo se mantiene para edición

### Caja / Cash Box

#### Bugs críticos corregidos
- **`closeMonth` no marcaba transacciones como cerradas** — Se agregó `updateMany({ closed: true })` al cierre de mes (el bug principal que causaba descuadre de datos)
- **`initialBalanceForPeriod` siempre era 0** — El frontend leía `result.initialBalanceForPeriod` pero la API devolvía `result.initialBalance` (typo en nombre de propiedad)
- **Transfers se restaban como gastos** — `currentCashBalance`, `totalExpensesAll` y `accumulatedBalance` incluían transferencias como gastos, pero el backend las excluye de la caja
- **`saldoInicialMes` buscaba mes anterior exacto** — Si no existía cierre para ese mes (sin movimientos), daba 0. Ahora busca el último mes cerrado anterior

#### Endpoint de reparación
- **`POST /cash/repair`** — Nuevo endpoint que borra todos los cierres, resetea transacciones, y re-cierra cada mes en orden cronológico con datos reales. El mes actual queda abierto

#### Página de debug
- **`/admin/test/cashbox-debug`** — Nueva página con:
  - Cards resumen (transacciones abiertas vs cerradas, saldo desglosado)
  - Tabla mes a mes con columna "Match?" que compara cierres vs datos reales
  - Tabla por usuario con ingresos, gastos, transferencias enviadas/recibidas
  - Reportes de meses cerrados del backend
  - Botón "Ejecutar Reparación" con resultado detallado

#### Diseño mejorado
- **KPI Cards** — Borde de color izquierdo (primary/green/red/blue/amber), iconos en círculos, hover con elevación, `tabular-nums`
- **Tabla de usuarios** — Headers uppercase, filas clickeables, botón "Detalles" aparece en hover, avatares con ring
- **Header** — Subtítulo, botones compactos (Nuevo movimiento, Transferencia, Abrir Caja), barra de saldo acumulado rediseñada
- **Gráfico** — Tabs compactas con loop
- **Movimientos del mes** — Botón "Cerrar" en variant destructive

### Dashboard

#### Eventos del calendario en "Mi Día"
- **Integración de eventos generales** — Se traen eventos de la tabla `Events` donde `userId` o `responsibleId` coincide con el usuario logueado
- **Render con diseño card** — Icono púrpura, badges "EVENTO" y "todo el día", link a Meet si existe, flecha de navegación

#### Protección contra datos nulos
- Todos los `.case.title` protegidos con optional chaining (`?.title ?? "Sin causa"`)
- Todas las fechas (`dueDate`, `date`, `createdAt`) protegidas contra `null`/`Invalid Date`

### Backend

#### Prisma Schema
- **CrmLeads** — Agregados campos `artId Int?` e `insuranceId Int?`

#### CRM Controller
- `createLead` — Acepta y guarda `artId`, `insuranceId`, `accidentDate`
- `updateLeadById` — Ídem para actualización

#### Cash Controller
- `closeMonth` — Ahora marca transacciones como `closed: true`
- `repairClosedMonths` — Nuevo endpoint de reparación masiva

#### Dashboard Controller
- `getLegalDashboardStats` — Agrega query de `events` para calendario general del usuario
- Fix orden de destructuración en `Promise.all`

#### Rutas
- `POST /cash/repair` — Nueva ruta protegida

---

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

### Activity Logs
- Dark mode actualizado con tokens semánticos (`bg-card`, `text-foreground`, `border-border`, etc.)
- Eliminados todos los `dark:bg-gray-*` / `dark:text-gray-*` hardcodeados

### Detalle de Caso (`legal-cases/[id]`)
- **Dark mode completo** en 16 componentes:
  - CaseDetails, CaseStatsSidebar, CaseTabs, CaseEditForm, CaseHeader
  - DeleteConfirmationModal, NewFileModal, FilesListView
  - NotesView, EventosView, PlazosView, GastosView
  - CedulasView, PartesView, ConsultationsView, CaseDocuments
  - CaseLogsComponent, LiquidacionView, EmptyFilesState, EmptyNotesState
- Todos los colores migrados a **tokens semánticos CSS** (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `bg-muted`)
- Se preservaron colores intencionales (status badges, alertas amber/red/green/blue)

### Migración de Modales a Dialog (shadcn)
- **9 modales** convertidos de `Modal` wrapper a `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogDescription` + `DialogFooter` directamente:
  - CaseDetails (WhatsApp), DeleteConfirmationModal, NewFileModal
  - EventosView, PlazosView (×2), GastosView, PartesView
  - MyCashbox (Registrar Movimiento), CashBoxPage (Registrar Movimiento + Abrir Caja)
- Modales grandes con scroll: `max-h-[85vh] overflow-hidden flex flex-col` + body `overflow-y-auto flex-1`
- `aria-describedby={undefined}` en Modal wrapper para suprimir warnings de accesibilidad

### DialogDescription — Accesibilidad
- Agregado `DialogDescription` faltante en 7 componentes:
  - EventModal, AddNewClosing, ClientPortalModal, LeadFormDialog
  - MembersContent, area-tabs, TodoListForm
- NegotiationsTable: agregado `DialogDescription` al modal de Historial de Ofertas

### Negociaciones
- Botón de acción `⋯` (dropdown) reemplazado por **3 botones individuales**: Ver Ofertas (Eye), Editar (Edit2), Eliminar (Trash2)
- Eliminado código muerto: estados del dropdown, `useRef`, `useEffect` click outside, imports no usados
- Skeleton loading para la tabla de negociaciones

### Skeleton Loading
- Spinners reemplazados por **Skeleton** en 5 páginas:
  - Mi Caja (`my-cashbox`): 4 KPI cards + tabla
  - Caja (`cashbox`): 4 stat cards + tabla
  - Reportes Legales (`reports/legal`): 6 stat cards + 2 chart cards
  - Reportes de Ventas (`reports/sales`): ya tenía skeleton
  - Equipos (`teams/members`): stats + tabs + tabla con avatares

### Reemplazo de `alert()` por Toast (Sonner)
- **37 `alert()` eliminados** en 15 archivos, reemplazados por:
  - `toast.success()` para confirmaciones
  - `toast.error()` para errores y validaciones
  - `toast.info()` para informativos

### Reemplazo de `confirm()` por AlertDialog
- Creado componente reutilizable **`ConfirmDialog`** (`@/components/shared/ConfirmDialog`):
  - Detecta automáticamente tipo de acción por `variant`
  - `destructive`: icono Trash2 rojo, fondo rojo, título "Confirmar eliminación"
  - `default`: icono Info con color primary, título "¿Estás seguro?"
  - Usa `AlertDialogMedia` de shadcn para icono destacado
- Creado hook **`useConfirm`** (`@/hooks/useConfirm`):
  - API tipo Promise: `const ok = await confirm({ description: "..." })`
  - Reemplaza `confirm()` nativo sin refactorizar el flujo async
- **~20 `confirm()` eliminados** en 17 archivos:
  - case-details: CedulasView, EventosView, GastosView, NotesView, PartesView, PlazosView
  - posts/page, todolist/page, closing-manager-table
  - MembersContent, NegotiationsTable, CashBoxPage
  - FilesCedulas, FilesNotes, FilesParts
  - KanbanList, LeadCard

### Limpieza
- Eliminada carpeta `src/layout/` (AppHeader.old.tsx, AppSidebar.old.tsx) — sin uso
- Iconos PNG inexistentes eliminados del `manifest.json`, reemplazados por `logo-icon.svg`
- Fix: `next.config.ts` — agregado `qualities: [100, 75]` para Image quality
- Fix: logos con `loading="eager"` y `style={{ height: "auto" }}` (LCP + aspect ratio warnings)

### Backend (cambios menores)
- `viewProfileAndAddress`: ahora devuelve `googleLinked`, `emailVerified`, `createdAt`, `activeSessions`
- `auth.controller.ts`: prioriza `req.body.userAgent` sobre headers para activity logs
- Ambos endpoints de login (credentials y Google) usan el user-agent real del browser
