// User Types
export type UserRole = 'citizen' | 'rso' | 'admin' | 'compliance_officer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  zone?: string; // For RSO users
  isApproved?: boolean; // For RSO (requires admin approval)
  points?: number; // Petty wallet points
  adminPointsPool?: number; // For admin to distribute
}



// Report Types
export type ReportingMode = 'on-site' | 'from-elsewhere';
export type DamageType = 'crack' | 'pothole' | 'other';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type ReportStatus = 'pending' | 'in-progress' | 'completed';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  roadName?: string;
  area?: string;
  zone?: string;
}

export interface AIDetectionResult {
  damageType: DamageType;
  confidence: number;
  severity: SeverityLevel;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Report {
  id: string;
  citizenId: string;
  reportingMode: ReportingMode;
  location: Location;
  photoUri: string;
  aiDetection?: AIDetectionResult;
  status: ReportStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  repairProofUri?: string;
  repairCompletedAt?: string;

  reportApprovedForPoints?: boolean;
  repairApprovedForPoints?: boolean;
  rsoId?: string;
  citizenRating?: number;
  citizenFeedback?: string;
  videoUri?: string; // URL to recorded video
}

// Zone Types
export type ZoneId = 'zone1' | 'zone4' | 'zone8';

export interface Zone {
  id: ZoneId;
  name: string;
  boundaries: {
    latitude: number;
    longitude: number;
  }[];
}

// Analytics Types
export interface ZoneAnalytics {
  zoneId: ZoneId;
  totalReports: number;
  pendingReports: number;
  completedReports: number;
  averageSeverity: number;
  roadHealthIndex: number;
}

export interface RoadHealthData {
  roadName: string;
  zone: ZoneId;
  totalDamages: number;
  severityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  healthIndex: number;
  lastRepairDate?: string;
}
