import { Timestamp } from 'firebase/firestore';

// Pipeline stages
export const STAGES = ['lead', 'consultation', 'proposal', 'active_design', 'installation', 'complete'] as const;
export type Stage = typeof STAGES[number];

export const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  consultation: 'Consultation',
  proposal: 'Proposal',
  active_design: 'Active Design',
  installation: 'Installation',
  complete: 'Complete',
};

// Activity types
export const ACTIVITY_TYPES = [
  'stage_change', 'note_added', 'file_uploaded',
  'invoice_created', 'invoice_paid',
  'milestone_created', 'milestone_completed',
  'client_created', 'client_archived', 'client_restored',
] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

// File folders
export const FILE_FOLDERS = ['photos', 'documents', 'designs'] as const;
export type FileFolder = typeof FILE_FOLDERS[number];

// User document: users/{uid}
export interface UserSettings {
  stalenessThresholdDays: number;
  calendarSyncEnabled: boolean;
}

export interface BusinessProfile {
  name: string;
  address: string;
  email: string;
  phone: string;
  logoUrl: string | null;
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  googleRefreshToken: string | null;
  hasGoogleToken: boolean;
  settings: UserSettings;
  businessProfile: BusinessProfile | null;
}

// Property details (nested in client)
export interface PropertyDetails {
  lotSize: string | null;
  soilType: string | null;
  sunExposure: string | null;
  existingFeatures: string | null;
}

// Client document: users/{uid}/clients/{clientId}
export interface ClientDocument {
  id?: string; // Firestore document ID, added client-side after read
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  stage: Stage;
  stageOrder: number;
  archived: boolean;
  lastActivityAt: Timestamp;
  propertyDetails: PropertyDetails | null;
  budgetRange: string | null;
  source: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Note: users/{uid}/clients/{clientId}/notes/{noteId}
export interface NoteDocument {
  id?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
}

// File metadata: users/{uid}/clients/{clientId}/files/{fileId}
export interface FileDocument {
  id?: string;
  name: string;
  folder: FileFolder;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  thumbnailPath: string | null;
  uploadedAt: Timestamp;
}

// Invoice line item
export interface LineItem {
  description: string;
  amount: number; // in cents
}

// Invoice: users/{uid}/clients/{clientId}/invoices/{invoiceId}
export interface InvoiceDocument {
  id?: string;
  invoiceNumber: string;
  date: Timestamp;
  dueDate: Timestamp | null;
  status: 'unpaid' | 'paid';
  lineItems: LineItem[];
  subtotal: number; // in cents
  taxRate: number | null; // percentage, e.g., 8.5
  taxAmount: number | null; // in cents
  total: number; // in cents
  paymentTerms: string | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Milestone: users/{uid}/clients/{clientId}/milestones/{milestoneId}
export interface MilestoneDocument {
  id?: string;
  title: string;
  date: Timestamp;
  completed: boolean;
  calendarEventId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Activity log: users/{uid}/activityLog/{activityId}
export interface ActivityLogEntry {
  id?: string;
  clientId: string;
  clientName: string;
  type: ActivityType;
  description: string;
  createdAt: Timestamp;
}

// Source options for client creation
export const SOURCE_OPTIONS = ['Referral', 'Website', 'Social Media', 'Word of Mouth', 'Other'] as const;

// Milestone suggestion chips
export const MILESTONE_SUGGESTIONS = [
  'Site Assessment',
  'Design Presentation',
  'Client Approval',
  'Installation Start',
  'Planting Phase',
  'Final Walkthrough',
] as const;
