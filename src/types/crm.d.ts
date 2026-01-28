import { User } from "./users";

export interface Lead {
  id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  userId?: number;
  sellerId: number;
  internalLawyerId: number;
  responsibleLawyerId: number;
  servicesId: number;
  sourceChannel?: string;
  sourceChannelId?: number;
  status: "IN_PROGRESS" | "WON" | "LOST";
  statusDate?: string;
  columnId: number;
  column?: string;
  notes?: string;
  priority?: string;
  documentationComplete?: boolean;
  referentId?: number;
  createdAt: string;
  updatedAt?: string;
  clientId?: string;
  accidentDate?: string;
  accepted?: boolean;
  acceptedAt?: string;
  services: {
    values: number;
    label: string;
  };
  user?: User;
  seller?: {
    id: number;
    name: string;
    image: string | null;
  };
  internalLawyer?: {
    id: number;
    name: string;
    image: string | null;
  };
  responsibleLawyer?: {
    id: number;
    name: string;
    image: string | null;
  };
  crmMeetings?: CrmMeeting[];
  crmNotes?: CrmNote[];
  crmLeadLogs?: CrmLeadLog[];
  crmDocument?: CrmDocument[];
  referent?: {
    id: number;
    name: string;
    image: string | null;
  };
}

export interface CrmLeadLog {
  id: number;
  leadId: number;
  type: string;
  title: string;
  description: string?;
  status: string;
  createdById: number;
  createdByUser: {
    id: number;
    name: string;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CrmMeeting {
  id: number;
  leadId: number;
  type: string; // This corresponds to meetingType in your form
  date: Date; // This corresponds to scheduledAt in your form
  note?: string; // This corresponds to notes in your form
  responsibleLawyerId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  responsibleLawyer: {
    id: number;
    name: string;
    image: string | null;
  };
  user: {
    id: number;
    name: string;
    image: string | null;
  };
}

export interface CrmNote {
  id: number;
  leadId: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    image: string | null;
  };
}

export interface CrmDocument {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  extension: string;
  uploadedAt: string;
  updatedAt: string;
  leadId: number;
  uploadedById: number;
  description: string;
  isPublic: boolean;
  category: string;
}
