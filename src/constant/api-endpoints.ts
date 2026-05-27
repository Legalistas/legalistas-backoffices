export const BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;
export const API_BASE_URL =
	`${process.env.NEXT_PUBLIC_BACKEND_URL_API}` ||
	`http://localhost:5000/api/v1`;

// Authentication Endpoints
export const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;
export const GOOGLE_LOGIN_ENDPOINT = `${API_BASE_URL}/auth/google`;
export const REGISTER_ENDPOINT = `${API_BASE_URL}/auth/register`;
export const LOGOUT_ENDPOINT = `${API_BASE_URL}/auth/logout`;
export const FORGOT_PASSWORD_ENDPOINT = `${API_BASE_URL}/auth/forgot-password`;
export const SESSION_PAUSE_ENDPOINT = `${API_BASE_URL}/auth/session-pause`;
export const SESSION_END_ENDPOINT = `${API_BASE_URL}/auth/session-end`;

// Activity Logs Endpoints
export const ACTIVITY_LOGS_ENDPOINT = `${API_BASE_URL}/activity-logs`;
export const ACTIVITY_LOGS_STATS_ENDPOINT = `${API_BASE_URL}/activity-logs/stats`;
export const ACTIVITY_LOGS_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/activity-logs/user/${userId}`;

// RRHH — Ficha de empleado (UserEmployment)
export const EMPLOYMENT_ENDPOINT = `${API_BASE_URL}/employment`;
export const EMPLOYMENT_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}`;

// RRHH — Contratos laborales
export const CONTRACTS_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/contracts`;
export const CONTRACT_BY_ID_ENDPOINT = (contractId: number) =>
	`${API_BASE_URL}/contracts/${contractId}`;

// RRHH — Control de asistencia
export const ATTENDANCE_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/attendance`;
export const ATTENDANCE_TOGGLE_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/attendance/toggle`;
export const ATTENDANCE_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/attendance/${id}`;

// RRHH — Licencias y vacaciones
export const LEAVES_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/leaves`;
export const LEAVE_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/leaves/${id}`;
export const LEAVE_APPROVE_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/leaves/${id}/approve`;
export const LEAVE_REJECT_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/leaves/${id}/reject`;
export const LEAVE_CANCEL_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/leaves/${id}/cancel`;

// RRHH — Recibos de sueldo
export const PAYROLLS_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/payrolls`;
export const PAYROLL_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/payrolls/${id}`;

// RRHH — Legajo disciplinario
export const DISCIPLINARY_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/disciplinary`;
export const DISCIPLINARY_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/disciplinary/${id}`;
export const DISCIPLINARY_ACKNOWLEDGE_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/disciplinary/${id}/acknowledge`;

// RRHH — Capacitaciones y certificaciones
export const TRAININGS_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/trainings`;
export const TRAINING_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/trainings/${id}`;

// RRHH — Evaluaciones de desempeño
export const REVIEWS_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/reviews`;
export const REVIEW_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/reviews/${id}`;
export const REVIEW_SUBMIT_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/reviews/${id}/submit`;
export const REVIEW_ACKNOWLEDGE_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/reviews/${id}/acknowledge`;

// RRHH — Reclutamiento (candidatos)
export const CANDIDATES_ENDPOINT = `${API_BASE_URL}/rrhh/candidates`;
export const CANDIDATE_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/rrhh/candidates/${id}`;
export const CANDIDATE_STAGE_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/rrhh/candidates/${id}/stage`;
export const CANDIDATE_CV_UPLOAD_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/rrhh/candidates/${id}/cv`;

// RRHH — Onboarding / Offboarding (checklists)
export const CHECKLISTS_BY_USER_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/employment/${userId}/checklists`;
export const CHECKLIST_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/checklists/${id}`;
export const CHECKLIST_ITEMS_ENDPOINT = (checklistId: number) =>
	`${API_BASE_URL}/checklists/${checklistId}/items`;
export const CHECKLIST_ITEM_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/checklist-items/${id}`;

// RRHH — Self-service del empleado logueado
export const ME_ATTENDANCE_STATUS_ENDPOINT = `${API_BASE_URL}/me/attendance/status`;
export const ME_ATTENDANCE_ACTION_ENDPOINT = `${API_BASE_URL}/me/attendance/action`;

// LEGAL CASES
export const CASES_ENDPOINT = `${API_BASE_URL}/cases`;
export const CASES_EXPIRATION_ALERTS_ENDPOINT = `${API_BASE_URL}/cases/expiration-alerts`;

export const CASES_NOTES_CREATE_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/notes`;
export const CASES_NOTES_DELETE_ENDPOINT = (caseId: number, noteId: number) =>
	`${API_BASE_URL}/cases/${caseId}/notes/${noteId}`;

export const CASES_FILES_BY_CASE_ID_ENDPOINT = (
	caseId: number,
	fileId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}`;

export const CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT = (
	caseId: number,
	fileId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}`;

export const CASES_FILES_MOVEMENTS_CREATE_ENDPOINT = (
	caseId: number,
	fileId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/movements`;

export const CASES_FILES_PARTS_CREATE_ENDPOINT = (
	caseId: number,
	fileId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/parts`;
export const CASES_FILES_PARTS_UPDATE_ENDPOINT = (
	caseId: number,
	fileId: number,
	partId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/parts/${partId}`;
export const CASES_FILES_PARTS_DELETE_ENDPOINT = (
	caseId: number,
	fileId: number,
	partId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/parts/${partId}`;

export const CASES_FILES_NOTES_CREATE_ENDPOINT = (
	caseId: number,
	fileId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/notes`;

export const CASES_FILES_NOTES_DELETE_ENDPOINT = (
	caseId: number,
	fileId: number,
	noteId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/notes/${noteId}`;

export const CASES_FILES_EXPENSES_CREATE_ENDPOINT = (
	caseId: number,
	fileId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/expenses`;

export const CASES_FILES_EXPENSES_UPDATE_ENDPOINT = (
	caseId: number,
	fileId: number,
	expenseId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/expenses/${expenseId}`;

export const CASES_FILES_EXPENSES_DELETE_ENDPOINT = (
	caseId: number,
	fileId: number,
	expenseId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/expenses/${expenseId}`;

export const CASE_CEDULAS_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/cedulas`;

export const CASE_CEDULAS_DRAFT_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/cedulas/draft`;

export const CASE_CEDULA_BY_ID_ENDPOINT = (caseId: number, cedulaId: number) =>
	`${API_BASE_URL}/cases/${caseId}/cedulas/${cedulaId}`;

// Legacy: cédulas a nivel expediente (usado por FilesCedulas)
export const CASES_FILES_CEDULAS_ENDPOINT = (caseId: number, fileId: number) =>
	`${API_BASE_URL}/cases/${caseId}/files/${fileId}/cedulas`;

export const CASES_FILES_CEDULAS_BY_ID_ENDPOINT = (
	caseId: number,
	fileId: number,
	cedulaId: number,
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/cedulas/${cedulaId}`;

export const CASES_CONSULTATIONS_GET_ALL_ENDPOINT = `${API_BASE_URL}/consultations`;
export const CASES_CONSULTATIONS_MARK_ALL_READ_ENDPOINT = `${API_BASE_URL}/consultations/mark-all-read`;
export const CASES_CONSULTATIONS_GET_BY_ID_ENDPOINT = (id: string | number) =>
	`${API_BASE_URL}/consultations/${id}`;
export const CASES_CONSULTATIONS_MARK_READ_ENDPOINT = (id: string | number) =>
	`${API_BASE_URL}/consultations/${id}/mark-read`;
export const CASES_CONSULTATIONS_SEND_MESSAGE_ENDPOINT = (
	id: string | number,
) => `${API_BASE_URL}/consultations/${id}/messages`;
export const CASES_CONSULTATIONS_CLOSE_ENDPOINT = (id: string | number) =>
	`${API_BASE_URL}/consultations/${id}/close`;
export const CASES_CONSULTATIONS_REOPEN_ENDPOINT = (id: string | number) =>
	`${API_BASE_URL}/consultations/${id}/reopen`;

export const CASES_CONSULTATIONS_CREATE_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/consultations`;

export const CASES_CONSULTATIONS_DELETE_ENDPOINT = (
	caseId: number,
	consultationId: number,
) => `${API_BASE_URL}/cases/${caseId}/consultation/${consultationId}`;

export const CASES_CONSULTATIONS_MESSAGES_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/consultation/sendMessages`;

// CASE PARTS (Partes del Caso)
export const CASE_PARTS_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/parts`;
export const CASE_PART_BY_ID_ENDPOINT = (caseId: number, partId: number) =>
	`${API_BASE_URL}/cases/${caseId}/parts/${partId}`;

// CASE EXPENSES (Gastos del Caso)
export const CASE_EXPENSES_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/expenses`;
export const CASE_EXPENSE_BY_ID_ENDPOINT = (
	caseId: number,
	expenseId: number,
) => `${API_BASE_URL}/cases/${caseId}/expenses/${expenseId}`;

// CASE EVENTS
export const CASE_EVENTS_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/events`;
export const CASE_EVENT_BY_ID_ENDPOINT = (caseId: number, eventId: number) =>
	`${API_BASE_URL}/cases/${caseId}/events/${eventId}`;

// CASE DEADLINES
export const CASE_DEADLINES_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/deadlines`;
export const CASE_DEADLINE_BY_ID_ENDPOINT = (
	caseId: number,
	deadlineId: number,
) => `${API_BASE_URL}/cases/${caseId}/deadlines/${deadlineId}`;

// Customers
export const CUSTOMERS_ENDPOINT = `${API_BASE_URL}/customers`;
export const CUSTOMERS_EXPORT_ENDPOINT = `${API_BASE_URL}/customers/export`;
export const USERS_ENDPOINT = `${API_BASE_URL}/users`;
export const LAWYERS_ENDPOINT = `${API_BASE_URL}/users/lawyers`;
export const SELLERS_ENDPOINT = `${API_BASE_URL}/users/sellers`;

export const USER_PROFILE_ENDPOINT = `${API_BASE_URL}/users/profile`;
export const USER_NOTIFICATIONS_MARK_ALL_READ_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/users/${userId}/notifications/read`;

// CRM ENDPOINTS
export const LEADS_ENDPOINT = `${API_BASE_URL}/crm/leads`;

export const LEADS_NOTES_ENDPOINT = (leadId: number) =>
	`${API_BASE_URL}/crm/leads/${leadId}/note`;

export const LEADS_NOTES_UPDATE_ENDPOINT = (leadId: number, noteId: number) =>
	`${API_BASE_URL}/crm/leads/${leadId}/note/${noteId}`;
export const LEADS_NOTES_DELETE_ENDPOINT = (leadId: number, noteId: number) =>
	`${API_BASE_URL}/crm/leads/${leadId}/note/${noteId}`;

export const LEADS_UPLOAD_ENDPOINT = (leadId: number) =>
	`${API_BASE_URL}/crm/leads/${leadId}/documents`;
export const LEADS_DOCUMENTS_DELETE_ENDPOINT = (
	leadId: number,
	documentId: number,
) => `${API_BASE_URL}/crm/leads/${leadId}/documents/${documentId}`;

export const STATISTICS_CRM_ALL_ENDPOINT = `${API_BASE_URL}/statistics/crm-all`;
export const STATISTICS_CRM_DASHBOARD_ENDPOINT = `${API_BASE_URL}/statistics/crm-overview`;
export const STATISTICS_CRM_DASHBOARD_SC_ENDPOINT = `${API_BASE_URL}/statistics/crm-source-channel`;
export const STATISTICS_CRM_DASHBOARD_STATES_ENDPOINT = `${API_BASE_URL}/statistics/crm-states`;

export const STATISTICS_LAW_DASHBOARD_ENDPOINT = `${API_BASE_URL}/statistics/causes-overview`;
export const STATISTICS_LEGAL_OVERVIEW_ENDPOINT = `${API_BASE_URL}/statistics/legal-overview`;
export const RECENT_CASES_ENDPOINT = `${API_BASE_URL}/statistics/recent-cases`;
export const STATISTICS_MOVEMENTS_ENDPOINT = `${API_BASE_URL}/statistics/movements`;
export const STATISTICS_EVENTS_ENDPOINT = `${API_BASE_URL}/statistics/events`;
export const CALCULATOR_CAUSES_LIST_ENDPOINT = `${API_BASE_URL}/statistics/cause-calculator`;

// DASHBOARD ENDPOINTS
export const DASHBOARD_LEGAL_STATS_ENDPOINT = `${API_BASE_URL}/dashboard/legal-stats`;

// TASKS ENDPOINTS
export const TASKS_ENDPOINT = `${API_BASE_URL}/tasks`;
export const TASKS_CASES_ENDPOINT = `${API_BASE_URL}/tasks/cases`;
export const TASK_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/tasks/${id}`;

// UPLOAD ENDPOINTS
export const SETTINGS_JURISDICTIONS_ENDPOINT = `${API_BASE_URL}/settings/jurisdictions`;
export const SETTINGS_JURISDICTIONS_EXPORT_EXCEL_ENDPOINT = `${API_BASE_URL}/settings/jurisdictions/export-excel`;
export const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;
export const SETTINGS_HOLIDAY_ENDPOINT = `${API_BASE_URL}/settings/holidays`;
export const SETTINGS_COUNTRIES_ENDPOINT = `${API_BASE_URL}/settings/countries`;
export const SETTINGS_ROLES_ENDPOINT = `${API_BASE_URL}/settings/roles`;
export const SETTINGS_DEADLINE_TYPES_ENDPOINT = `${API_BASE_URL}/settings/deadline-types`;

// CHAT ENDPOINTS
export const CHAT_MESSAGES_ENDPOINT = `${API_BASE_URL}/chat/messages`;
export const CHAT_RECENT_ENDPOINT = `${API_BASE_URL}/chat/recent`;
export const CHAT_HISTORY_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/chat/messages/${userId}`;
export const CHAT_READ_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/chat/messages/${userId}/read`;

export const CALENDARS_EVENTS_ENDPOINT = `${API_BASE_URL}/calendar`;
export const CALENDAR_UNIFIED_ENDPOINT = `${API_BASE_URL}/calendar/unified`;
export const CALENDAR_EVENT_BY_ID_ENDPOINT = (id: string | number) =>
	`${API_BASE_URL}/calendar/${id}`;

// Google Calendar
export const GOOGLE_CALENDAR_AUTH_URL_ENDPOINT = `${API_BASE_URL}/google-calendar/auth-url`;
export const GOOGLE_CALENDAR_CALLBACK_ENDPOINT = `${API_BASE_URL}/google-calendar/callback`;
export const GOOGLE_CALENDAR_STATUS_ENDPOINT = `${API_BASE_URL}/google-calendar/status`;
export const GOOGLE_CALENDAR_DISCONNECT_ENDPOINT = `${API_BASE_URL}/google-calendar/disconnect`;
export const GOOGLE_CALENDAR_SYNC_ENDPOINT = `${API_BASE_URL}/google-calendar/sync`;

export const NOTIFICATIONS_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/notifications/${userId}`;
export const NOTIFICATIONS_READ_ENDPOINT = (notificationId: number) =>
	`${API_BASE_URL}/notifications/${notificationId}/read`;

export const CASH_ENDPOINT = `${API_BASE_URL}/cash`;

// ============================================================================
// CONTABLE - Gestor de Gastos e Ingresos (A Cobrar / A Pagar)
// ============================================================================

export const SCHEDULED_TX_ENDPOINT = `${API_BASE_URL}/accounting/scheduled`;
export const SCHEDULED_TX_SUMMARY_ENDPOINT = `${API_BASE_URL}/accounting/scheduled/summary`;
export const SCHEDULED_TX_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/accounting/scheduled/${id}`;
export const SCHEDULED_TX_MARK_PAID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/accounting/scheduled/${id}/mark-paid`;
export const SCHEDULED_TX_MARK_PENDING_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/accounting/scheduled/${id}/mark-pending`;
export const SCHEDULED_TX_CANCEL_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/accounting/scheduled/${id}/cancel`;

// ============================================================================
// NEGOTIATIONS MODULE - Sistema de Negociaciones
// ============================================================================

// Negotiations base endpoint
export const NEGOTIATIONS_ENDPOINT = `${API_BASE_URL}/negotiations`;

// Get negotiable causes (cases in stage 2)
export const NEGOTIATIONS_NEGOTIABLE_CAUSES_ENDPOINT = `${API_BASE_URL}/negotiations/negotiable-causes`;

// Get negotiations count by status
export const NEGOTIATIONS_COUNT_ENDPOINT = `${API_BASE_URL}/negotiations/count`;

// Individual negotiation endpoints
export const NEGOTIATION_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/negotiations/${id}`;

// Negotiation offers endpoints
export const NEGOTIATION_OFFERS_ENDPOINT = (negotiationId: number) =>
	`${API_BASE_URL}/negotiations/${negotiationId}/offers`;

export const NEGOTIATION_ACCEPT_OFFER_ENDPOINT = (
	negotiationId: number,
	offerId: number,
) => `${API_BASE_URL}/negotiations/${negotiationId}/offers/${offerId}/accept`;

// ============================================================================
// CLOSING MANAGER MODULE - Sistema de Gestión de Cierres
// ============================================================================

// Closings base endpoint
export const CLOSINGS_ENDPOINT = `${API_BASE_URL}/closings`;

// Create closing from negotiation
export const CLOSINGS_FROM_NEGOTIATION_ENDPOINT = (negotiationId: number) =>
	`${API_BASE_URL}/closings/from-negotiation/${negotiationId}`;

// KPIs financieros (mensuales/anuales)
export const CLOSINGS_KPIS_ENDPOINT = `${API_BASE_URL}/closings/kpis`;

// Exportar cierres a Excel/CSV
export const CLOSINGS_EXPORT_ENDPOINT = `${API_BASE_URL}/closings/export`;

// Individual closing endpoints
export const CLOSING_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/closings/${id}`;

// Inline edit del campo detalle
export const CLOSING_DETAIL_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/closings/${id}/detail`;

// ============================================================================
// POSTS / BLOG MODULE - Sistema de Posts estilo WordPress
// ============================================================================

//https://backend.legalistas.ar/api/v1/posts
// Get all posts with filters, Create new post
export const POSTS_ENDPOINT = `${API_BASE_URL}/posts`;

// Get, update, delete post by ID
export const POST_BY_ID_ENDPOINT = (id: number) =>
	`${API_BASE_URL}/posts/${id}`;

// Get post by slug
export const POST_BY_SLUG_ENDPOINT = (slug: string) =>
	`${API_BASE_URL}/posts/slug/${slug}`;

// Get related posts
export const POST_RELATED_ENDPOINT = (slug: string) =>
	`${API_BASE_URL}/posts/slug/${slug}/related`;

// Get posts by category
export const POSTS_BY_CATEGORY_ENDPOINT = (slug: string) =>
	`${API_BASE_URL}/posts/category/${slug}`;

// Get posts by tag
export const POSTS_BY_TAG_ENDPOINT = (slug: string) =>
	`${API_BASE_URL}/posts/tag/${slug}`;

// Get all categories
export const POSTS_CATEGORIES_ENDPOINT = `${API_BASE_URL}/posts/categories`;

// Get all tags
export const POSTS_TAGS_ENDPOINT = `${API_BASE_URL}/posts/tags`;

// Get recent posts
export const POSTS_RECENT_ENDPOINT = `${API_BASE_URL}/posts/recent`;

// Search posts
export const POSTS_SEARCH_ENDPOINT = `${API_BASE_URL}/posts/search`;

// INFORME TRIMESTRAL
export const CASE_INFORME_ENDPOINT = (caseId: number) =>
	`${API_BASE_URL}/cases/${caseId}/informe`;

// LEXIA - Analista IA
export const LEXIA_ANALYTICS_ENDPOINT = `${API_BASE_URL}/lexia/analytics`;

// ============================================================================
// REPRESENTATIVES MODULE - Seguimiento de desempeño de representantes
// ============================================================================

// Agregador de KPIs por período (mes/año) — devuelve global + lista ordenada
export const REPRESENTATIVES_KPIS_ENDPOINT = `${API_BASE_URL}/representatives/kpis`;

// Asignación de nivel para un (mes, año) específico — se guarda en historial
export const REPRESENTATIVE_LEVEL_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/representatives/${userId}/level`;

// Historial completo de medallas de un representante (todas las entradas)
export const REPRESENTATIVE_LEVELS_HISTORY_ENDPOINT = (userId: number) =>
	`${API_BASE_URL}/representatives/${userId}/levels`;
