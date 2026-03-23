# Pendiente: Landing de Confirmacion de Reunion

## URL: `legalistas.ar/confirmacion-reunion`

## Que se necesita

### 1. ~~Landing page (en el proyecto de landing de Legalistas)~~ HECHO
Creada en `Legalistas_Landing_Page/src/app/(main)/confirmacion-reunion/[token]/`
- `page.tsx` — Server component, fetch por token
- `ConfirmacionReunionClient.tsx` — Client component con botones confirmar/reprogramar
- Manejo de token expirado / invalido / ya procesado

### 2. ~~Backend: Modelo en Prisma~~ HECHO
Se agregaron campos directamente a `CrmMeetings`: `token`, `confirmationStatus`, `confirmedAt`, `tokenExpiresAt`. Falta correr `prisma migrate dev`.

### 3. ~~Backend: Endpoints necesarios~~ HECHO
Creados en `client-portal.routes.ts` (rutas publicas sin auth):
- ~~`GET /api/v1/client-portal/public/meeting-confirmation/:token`~~
- ~~`PATCH /api/v1/client-portal/public/meeting-confirmation/:token/confirm`~~
- ~~`PATCH /api/v1/client-portal/public/meeting-confirmation/:token/reschedule`~~

Funciones en `crm.controller.ts`: `getMeetingByToken`, `confirmMeeting`, `rescheduleMeeting`

### 4. ~~Backend: Generar token al crear reunion~~ HECHO
En `crm.controller.ts > createMeeting()`:
- ~~Token UUID se genera automatico por Prisma (`@default(uuid())`)~~
- ~~`tokenExpiresAt` se setea a 1 dia despues de la reunion~~
- ~~`confirmationUrl` se devuelve en el response~~
- ~~Se elimino el webhook de N8N~~

### 5. ~~Cron Jobs (node-cron en backend con PM2)~~ HECHO
Creado `backend/src/services/crm-reminder-cron.service.ts`:
- ~~**Reunion (col 2/3):** Recordatorio 3 dias antes — 9:00 AM~~
- ~~**En Tratamiento (col 4):** Cada 7 dias — 10:00 AM~~
- ~~**Pendiente Poder (col 8):** Cada 3 dias — 10:30 AM~~

Envio directo con nodemailer desde el backend (sin depender del frontend). HTML replica el diseño de los email templates. Inicializado en `index.ts` con `initCrmReminderCronJobs()`.

### 6. ~~Historial de envio de emails~~ HECHO
- `updateLeadColumn()` registra log tipo `EMAIL` con titulo descriptivo al cambiar de etapa
- Cron jobs registran cada envio en `crm_lead_logs` con tipo `EMAIL`
- `getLeadById()` ya incluye `crmLeadLogs` — se muestran automaticamente en el CRM

## Que falta
- [ ] Correr `prisma migrate dev` para agregar columnas a `crm_meetings`
- [x] ~~Crear el modelo en Prisma~~ (campos agregados a CrmMeetings)
- [x] ~~Crear endpoints en el backend~~
- [x] ~~Integrar generacion de token en `createMeeting()`~~
- [x] ~~Crear la pagina en la landing~~
- [x] ~~Configurar cron jobs para recordatorios~~
- [x] ~~Historial de emails en el CRM~~
