export const BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}`;
export const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL_API}` || `http://localhost:5000/api/v1`;

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

// LEGAL CASES
export const CASES_ENDPOINT = `${API_BASE_URL}/cases`;
export const CASES_EXPIRATION_ALERTS_ENDPOINT = `${API_BASE_URL}/cases/expiration-alerts`;

export const CASES_NOTES_CREATE_ENDPOINT = (caseId: number) =>
  `${API_BASE_URL}/cases/${caseId}/notes`;
export const CASES_NOTES_DELETE_ENDPOINT = (caseId: number, noteId: number) =>
  `${API_BASE_URL}/cases/${caseId}/notes/${noteId}`;

export const CASES_FILES_BY_CASE_ID_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}`;

export const CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}`;

export const CASES_FILES_MOVEMENTS_CREATE_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/movements`;

export const CASES_FILES_PARTS_CREATE_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/parts`;
export const CASES_FILES_PARTS_UPDATE_ENDPOINT = (
  caseId: number,
  fileId: number,
  partId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/parts/${partId}`;
export const CASES_FILES_PARTS_DELETE_ENDPOINT = (
  caseId: number,
  fileId: number,
  partId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/parts/${partId}`;

export const CASES_FILES_NOTES_CREATE_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/notes`;

export const CASES_FILES_NOTES_DELETE_ENDPOINT = (
  caseId: number,
  fileId: number,
  noteId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/notes/${noteId}`;

export const CASES_FILES_EXPENSES_CREATE_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/expenses`;

export const CASES_FILES_EXPENSES_UPDATE_ENDPOINT = (
  caseId: number,
  fileId: number,
  expenseId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/expenses/${expenseId}`;

export const CASES_FILES_EXPENSES_DELETE_ENDPOINT = (
  caseId: number,
  fileId: number,
  expenseId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/expenses/${expenseId}`;

export const CASES_FILES_CEDULAS_ENDPOINT = (
  caseId: number,
  fileId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/cedulas`;

export const CASES_FILES_CEDULAS_BY_ID_ENDPOINT = (
  caseId: number,
  fileId: number,
  cedulaId: number
) => `${API_BASE_URL}/cases/${caseId}/files/${fileId}/cedulas/${cedulaId}`;

export const CASES_CONSULTATIONS_GET_ALL_ENDPOINT = `${API_BASE_URL}/consultations`;
export const CASES_CONSULTATIONS_MARK_ALL_READ_ENDPOINT = `${API_BASE_URL}/consultations/mark-all-read`;
export const CASES_CONSULTATIONS_GET_BY_ID_ENDPOINT = (id: string | number) =>
  `${API_BASE_URL}/consultations/${id}`;
export const CASES_CONSULTATIONS_MARK_READ_ENDPOINT = (id: string | number) =>
  `${API_BASE_URL}/consultations/${id}/mark-read`;
export const CASES_CONSULTATIONS_SEND_MESSAGE_ENDPOINT = (
  id: string | number
) => `${API_BASE_URL}/consultations/${id}/messages`;
export const CASES_CONSULTATIONS_CLOSE_ENDPOINT = (id: string | number) =>
  `${API_BASE_URL}/consultations/${id}/close`;
export const CASES_CONSULTATIONS_REOPEN_ENDPOINT = (id: string | number) =>
  `${API_BASE_URL}/consultations/${id}/reopen`;

export const CASES_CONSULTATIONS_CREATE_ENDPOINT = (caseId: number) =>
  `${API_BASE_URL}/cases/${caseId}/consultations`;

export const CASES_CONSULTATIONS_DELETE_ENDPOINT = (
  caseId: number,
  consultationId: number
) => `${API_BASE_URL}/cases/${caseId}/consultation/${consultationId}`;

export const CASES_CONSULTATIONS_MESSAGES_ENDPOINT = (caseId: number) =>
  `${API_BASE_URL}/cases/${caseId}/consultation/sendMessages`;

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
  documentId: number
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

// UPLOAD ENDPOINTS
export const SETTINGS_JURISDICTIONS_ENDPOINT = `${API_BASE_URL}/settings/jurisdictions`;
export const SETTINGS_JURISDICTIONS_EXPORT_EXCEL_ENDPOINT = `${API_BASE_URL}/settings/jurisdictions/export-excel`;
export const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;
export const SETTINGS_HOLIDAY_ENDPOINT = `${API_BASE_URL}/settings/holidays`;
export const SETTINGS_COUNTRIES_ENDPOINT = `${API_BASE_URL}/settings/countries`;
export const SETTINGS_ROLES_ENDPOINT = `${API_BASE_URL}/settings/roles`;

// CHAT ENDPOINTS
export const CHAT_MESSAGES_ENDPOINT = `${API_BASE_URL}/chat/messages`;
export const CHAT_RECENT_ENDPOINT = `${API_BASE_URL}/chat/recent`;
export const CHAT_HISTORY_ENDPOINT = (userId: number) =>
  `${API_BASE_URL}/chat/messages/${userId}`;
export const CHAT_READ_ENDPOINT = (userId: number) =>
  `${API_BASE_URL}/chat/messages/${userId}/read`;

export const CALENDARS_EVENTS_ENDPOINT = `${API_BASE_URL}/calendar`;
export const CALENDAR_EVENT_BY_ID_ENDPOINT = (id: string | number) =>
  `${API_BASE_URL}/calendar/${id}`;

export const NOTIFICATIONS_ENDPOINT = (userId: number) =>
  `${API_BASE_URL}/notifications/${userId}`;
export const NOTIFICATIONS_READ_ENDPOINT = (notificationId: number) =>
  `${API_BASE_URL}/notifications/${notificationId}/read`;

export const CASH_ENDPOINT = `${API_BASE_URL}/cash`;



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

export const NEGOTIATION_ACCEPT_OFFER_ENDPOINT = (negotiationId: number, offerId: number) => 
  `${API_BASE_URL}/negotiations/${negotiationId}/offers/${offerId}/accept`;

// ============================================================================
// CLOSING MANAGER MODULE - Sistema de Gestión de Cierres
// ============================================================================

// Closings base endpoint
export const CLOSINGS_ENDPOINT = `${API_BASE_URL}/closings`;

// Create closing from negotiation
export const CLOSINGS_FROM_NEGOTIATION_ENDPOINT = (negotiationId: number) => 
  `${API_BASE_URL}/closings/from-negotiation/${negotiationId}`;

// Get closings count
export const CLOSINGS_COUNT_ENDPOINT = `${API_BASE_URL}/closings/count`;

// Individual closing endpoints
export const CLOSING_BY_ID_ENDPOINT = (id: number) => 
  `${API_BASE_URL}/closings/${id}`;

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
