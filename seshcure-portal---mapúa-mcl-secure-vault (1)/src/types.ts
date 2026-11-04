export type UserRole = 'student' | 'faculty' | 'staff' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  avatar?: string;
  lastLoginIp?: string;
  isCampusSubnet?: boolean;
  pin2faEnabled?: boolean;
  pinCode?: string;
}

export interface FileVersion {
  version: number;
  uploadedAt: string;
  fileSize: number;
  sha256Hash: string;
  changeNote: string;
  uploadedBy: string;
}

export interface FileCollaborator {
  email: string;
  name: string;
  permission: 'viewer' | 'reviewer' | 'editor';
  addedAt: string;
}

export interface FileComment {
  id: string;
  author: string;
  email: string;
  timestamp: string;
  text: string;
}

export interface FolderItem {
  id: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  sharedWith: FileCollaborator[];
  generalAccess: 'restricted' | 'mcl_domain' | 'anyone_with_link';
  createdAt: string;
}

export interface EncryptedFileItem {
  id: string;
  name: string;
  folder: string;
  mimeType: string;
  size: number;
  currentVersion: number;
  sha256Hash: string;
  encryptedPayloadPreview?: string;
  uploadedAt: string;
  ownerEmail: string;
  ownerName: string;
  versions: FileVersion[];
  tags: string[];
  isRevoked: boolean;
  isStarred?: boolean;
  sharedWith: FileCollaborator[];
  generalAccess: 'restricted' | 'mcl_domain' | 'anyone_with_link';
  activeShareLinksCount: number;
  rawContent?: string; // Stored for real browser decryption simulation
  comments?: FileComment[];
}

export interface SharedLink {
  id: string;
  fileId: string;
  fileName: string;
  token: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  expiresAt: string | null; // null = never expires / until revoked
  expiryHours: number | null; // null = no time limit
  isNeverExpire: boolean;
  accessScope: 'restricted' | 'mcl_domain' | 'anyone_with_link';
  allowedEmails?: string[];
  pinRequired: boolean;
  pinCode?: string;
  downloadCount: number;
  maxDownloads: number;
  isRevoked: boolean;
  accessLog: {
    timestamp: string;
    ip: string;
    location: string;
    emailAttempt: string;
    status: 'GRANTED' | 'REJECTED_DOMAIN' | 'EXPIRED' | 'INVALID_PIN';
  }[];
}

export interface SessionAuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  action: string;
  ipAddress: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  isCampusSubnet: boolean;
  status: 'SUCCESS' | 'REJECTED' | 'WARNING';
  riskScore: number; // 0-100
}

export interface CloudDeliverable {
  filename: string;
  path: string;
  language: string;
  description: string;
  content: string;
}
