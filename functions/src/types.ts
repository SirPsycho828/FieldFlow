export interface MilestoneData {
  title: string;
  date: FirebaseFirestore.Timestamp;
  completed: boolean;
  calendarEventId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UserSettings {
  stalenessThresholdDays: number;
  calendarSyncEnabled: boolean;
}

export interface TokenDocument {
  googleRefreshToken: string;
}
