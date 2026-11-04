import { User, EncryptedFileItem, SharedLink, SessionAuditLog, FolderItem } from '../types';

export interface TestCredential {
  email: string;
  password: string;
  name: string;
  role: string;
  department: string;
  description: string;
  pinCode?: string;
  pin2faEnabled?: boolean;
}

export const TEST_CREDENTIALS: TestCredential[] = [
  {
    email: 'admin@mcl.edu.ph',
    password: 'MCL_SecureAdmin2026!',
    name: 'MCL IT Security Directorate',
    role: 'admin',
    department: 'Campus Cybersecurity Operations',
    description: 'Administrative rights (PIN 6767 required for access)',
    pinCode: '6767',
    pin2faEnabled: true
  },
  {
    email: 'lpayong@mcl.edu.ph',
    password: 'FacultySecure2026!',
    name: 'Engr. Luis Miguel Payong',
    role: 'faculty',
    department: 'College of Information Technology (CCIS)',
    description: 'Faculty account with curriculum syllabus, thesis docs, and sharing permissions',
    pinCode: '2026',
    pin2faEnabled: false
  },
  {
    email: 'esantos@mcl.edu.ph',
    password: 'MitlProf2026!',
    name: 'Prof. Enrico Santos',
    role: 'faculty',
    department: 'Mapúa Institute of Technology at Laguna (MITL)',
    description: 'Engineering professor with lab blueprints and grading sheets',
    pinCode: '2026',
    pin2faEnabled: false
  },
  {
    email: 'mcramos@live.mcl.edu.ph',
    password: 'StudentPass2026!',
    name: 'Maria Clara Ramos',
    role: 'student',
    department: 'BS Computer Science (Year 3)',
    description: 'Enrolled student (@live.mcl.edu.ph Microsoft 365 campus account)',
    pinCode: '1234',
    pin2faEnabled: false
  }
];

export const INITIAL_FOLDERS: FolderItem[] = [
  {
    id: 'f-1',
    name: 'Curriculum & Syllabi',
    ownerEmail: 'lpayong@mcl.edu.ph',
    ownerName: 'Engr. Luis Miguel Payong',
    sharedWith: [
      {
        email: 'mcramos@live.mcl.edu.ph',
        name: 'Maria Clara Ramos',
        permission: 'viewer',
        addedAt: '2026-11-04 09:30:00'
      },
      {
        email: 'esantos@mcl.edu.ph',
        name: 'Prof. Enrico Santos',
        permission: 'reviewer',
        addedAt: '2026-11-04 09:35:00'
      }
    ],
    generalAccess: 'mcl_domain',
    createdAt: '2026-11-04 09:00:00'
  },
  {
    id: 'f-2',
    name: 'Capstone & Research',
    ownerEmail: 'lpayong@mcl.edu.ph',
    ownerName: 'Engr. Luis Miguel Payong',
    sharedWith: [
      {
        email: 'admin@mcl.edu.ph',
        name: 'MCL IT Security Directorate',
        permission: 'editor',
        addedAt: '2026-11-03 17:00:00'
      }
    ],
    generalAccess: 'restricted',
    createdAt: '2026-11-03 16:00:00'
  },
  {
    id: 'f-3',
    name: 'IT Directorate',
    ownerEmail: 'admin@mcl.edu.ph',
    ownerName: 'MCL IT Security Directorate',
    sharedWith: [],
    generalAccess: 'restricted',
    createdAt: '2026-11-02 10:00:00'
  },
  {
    id: 'f-4',
    name: 'Faculty Grades',
    ownerEmail: 'esantos@mcl.edu.ph',
    ownerName: 'Prof. Enrico Santos',
    sharedWith: [
      {
        email: 'lpayong@mcl.edu.ph',
        name: 'Engr. Luis Miguel Payong',
        permission: 'viewer',
        addedAt: '2026-11-01 19:00:00'
      }
    ],
    generalAccess: 'restricted',
    createdAt: '2026-11-01 18:00:00'
  },
  {
    id: 'f-5',
    name: 'Student Submissions',
    ownerEmail: 'mcramos@live.mcl.edu.ph',
    ownerName: 'Maria Clara Ramos',
    sharedWith: [
      {
        email: 'lpayong@mcl.edu.ph',
        name: 'Engr. Luis Miguel Payong',
        permission: 'editor',
        addedAt: '2026-11-04 11:00:00'
      }
    ],
    generalAccess: 'restricted',
    createdAt: '2026-11-04 11:00:00'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    email: 'admin@mcl.edu.ph',
    name: 'MCL IT Security Directorate',
    role: 'admin',
    department: 'Campus Cybersecurity Operations',
    lastLoginIp: '10.10.42.105',
    isCampusSubnet: true,
    pin2faEnabled: true,
    pinCode: '6767'
  },
  {
    id: 'u-2',
    email: 'lpayong@mcl.edu.ph',
    name: 'Engr. Luis Miguel Payong',
    role: 'faculty',
    department: 'College of Information Technology (CCIS)',
    lastLoginIp: '10.10.18.24',
    isCampusSubnet: true,
    pin2faEnabled: false,
    pinCode: '2026'
  },
  {
    id: 'u-3',
    email: 'esantos@mcl.edu.ph',
    name: 'Prof. Enrico Santos',
    role: 'faculty',
    department: 'Mapúa Institute of Technology at Laguna (MITL)',
    lastLoginIp: '172.16.88.20',
    isCampusSubnet: true,
    pin2faEnabled: false,
    pinCode: '2026'
  },
  {
    id: 'u-4',
    email: 'mcramos@live.mcl.edu.ph',
    name: 'Maria Clara Ramos',
    role: 'student',
    department: 'BS Computer Science (Year 3)',
    lastLoginIp: '120.28.184.21',
    isCampusSubnet: false,
    pin2faEnabled: false,
    pinCode: '1234'
  }
];

export const INITIAL_FILES: EncryptedFileItem[] = [
  {
    id: 'file-101',
    name: 'CCIS_Cybersecurity_Framework_2026.pdf',
    folder: 'Curriculum & Syllabi',
    mimeType: 'application/pdf',
    size: 2450000,
    currentVersion: 3,
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    uploadedAt: '2026-11-04 09:15:00',
    ownerEmail: 'lpayong@mcl.edu.ph',
    ownerName: 'Engr. Luis Miguel Payong',
    tags: ['Curriculum', 'Confidential', 'Faculty'],
    isRevoked: false,
    isStarred: true,
    sharedWith: [
      {
        email: 'mcramos@live.mcl.edu.ph',
        name: 'Maria Clara Ramos',
        permission: 'viewer',
        addedAt: '2026-11-04 09:30:00'
      },
      {
        email: 'esantos@mcl.edu.ph',
        name: 'Prof. Enrico Santos',
        permission: 'reviewer',
        addedAt: '2026-11-04 09:32:00'
      }
    ],
    generalAccess: 'mcl_domain',
    activeShareLinksCount: 1,
    rawContent: 'MAPUA MALAYAN COLLEGES LAGUNA\nCOLLEGE OF INFORMATION TECHNOLOGY\nCYBERSECURITY SYLLABUS & LAB INSTRUCTIONS 2026\nRESTRICTED TO ENROLLED STUDENTS.',
    versions: [
      {
        version: 3,
        uploadedAt: '2026-11-04 09:15:00',
        fileSize: 2450000,
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        changeNote: 'Added hands-on AES-256 and IP Geolocation lab guidelines',
        uploadedBy: 'lpayong@mcl.edu.ph'
      },
      {
        version: 2,
        uploadedAt: '2026-10-28 14:20:00',
        fileSize: 2210000,
        sha256Hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        changeNote: 'Updated grading rubric per Dean review',
        uploadedBy: 'lpayong@mcl.edu.ph'
      },
      {
        version: 1,
        uploadedAt: '2026-10-15 11:00:00',
        fileSize: 1980000,
        sha256Hash: 'f0e1d2c3b4a596877869504132231405f0e1d2c3b4a596877869504132231405',
        changeNote: 'Initial draft approved by department',
        uploadedBy: 'lpayong@mcl.edu.ph'
      }
    ]
  },
  {
    id: 'file-102',
    name: 'SeshCure_Portal_Architectural_Spec.docx',
    folder: 'Capstone & Research',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1420000,
    currentVersion: 2,
    sha256Hash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    uploadedAt: '2026-11-03 16:40:00',
    ownerEmail: 'lpayong@mcl.edu.ph',
    ownerName: 'Engr. Luis Miguel Payong',
    tags: ['Architecture', 'Encryption', 'Capstone'],
    isRevoked: false,
    isStarred: false,
    sharedWith: [
      {
        email: 'admin@mcl.edu.ph',
        name: 'MCL IT Security Directorate',
        permission: 'editor',
        addedAt: '2026-11-03 17:00:00'
      }
    ],
    generalAccess: 'restricted',
    activeShareLinksCount: 1,
    rawContent: 'SESHCURE PORTAL SPECIFICATION DOCUMENT\nEnd-to-End Encrypted Cloud File Vault for Mapua Malayan Colleges Laguna.',
    versions: [
      {
        version: 2,
        uploadedAt: '2026-11-03 16:40:00',
        fileSize: 1420000,
        sha256Hash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        changeNote: 'Incorporated Mapua Cabuyao campus subnet routing topology',
        uploadedBy: 'lpayong@mcl.edu.ph'
      },
      {
        version: 1,
        uploadedAt: '2026-10-20 08:30:00',
        fileSize: 1200000,
        sha256Hash: '4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade67a9b2f',
        changeNote: 'Initial draft specification submitted to thesis panel',
        uploadedBy: 'lpayong@mcl.edu.ph'
      }
    ]
  },
  {
    id: 'file-103',
    name: 'MCL_Campus_Infrastructure_Diagram_AirGapped.png',
    folder: 'IT Directorate',
    mimeType: 'image/png',
    size: 3840000,
    currentVersion: 1,
    sha256Hash: '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b',
    uploadedAt: '2026-11-02 11:22:00',
    ownerEmail: 'admin@mcl.edu.ph',
    ownerName: 'MCL IT Security Directorate',
    tags: ['Network', 'Security', 'Restricted'],
    isRevoked: false,
    isStarred: true,
    sharedWith: [],
    generalAccess: 'restricted',
    activeShareLinksCount: 0,
    rawContent: 'MAPUA MCL PULO-DIEZMO CAMPUS FIBER BACKBONE AND FIREWALL ARCHITECTURE MAP',
    versions: [
      {
        version: 1,
        uploadedAt: '2026-11-02 11:22:00',
        fileSize: 3840000,
        sha256Hash: '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b',
        changeNote: 'Baseline perimeter diagram for Laguna campus gateway',
        uploadedBy: 'admin@mcl.edu.ph'
      }
    ]
  },
  {
    id: 'file-104',
    name: 'MITL_Midterm_Master_Grades_Official.xlsx',
    folder: 'Faculty Grades',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 890000,
    currentVersion: 1,
    sha256Hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    uploadedAt: '2026-11-01 18:05:00',
    ownerEmail: 'esantos@mcl.edu.ph',
    ownerName: 'Prof. Enrico Santos',
    tags: ['Grades', 'FERPA', 'Confidential'],
    isRevoked: false,
    isStarred: false,
    sharedWith: [
      {
        email: 'lpayong@mcl.edu.ph',
        name: 'Engr. Luis Miguel Payong',
        permission: 'viewer',
        addedAt: '2026-11-01 19:00:00'
      }
    ],
    generalAccess: 'restricted',
    activeShareLinksCount: 0,
    rawContent: 'OFFICIAL MIDTERM GRADING SHEET - MAPUA INSTITUTE OF TECHNOLOGY AT LAGUNA',
    versions: [
      {
        version: 1,
        uploadedAt: '2026-11-01 18:05:00',
        fileSize: 890000,
        sha256Hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        changeNote: 'Certified midterm computation with cryptographic seal',
        uploadedBy: 'esantos@mcl.edu.ph'
      }
    ]
  }
];

export const INITIAL_SHARED_LINKS: SharedLink[] = [
  {
    id: 'link-201',
    fileId: 'file-101',
    fileName: 'CCIS_Cybersecurity_Framework_2026.pdf',
    token: 'mcl-vault-x9k2p7q1',
    createdByName: 'Engr. Luis Miguel Payong',
    createdByEmail: 'lpayong@mcl.edu.ph',
    createdAt: '2026-11-04 10:10:00',
    expiresAt: '2026-11-04 12:10:00', // 2 hours
    expiryHours: 2,
    isNeverExpire: false,
    accessScope: 'mcl_domain',
    allowedEmails: ['mcramos@live.mcl.edu.ph', 'esantos@mcl.edu.ph'],
    pinRequired: true,
    pinCode: '2026',
    downloadCount: 4,
    maxDownloads: 50,
    isRevoked: false,
    accessLog: [
      {
        timestamp: '2026-11-04 10:24:12',
        ip: '10.10.18.24',
        location: 'Cabuyao, Laguna (MCL Campus Subnet)',
        emailAttempt: 'mcramos@live.mcl.edu.ph',
        status: 'GRANTED'
      },
      {
        timestamp: '2026-11-04 10:35:40',
        ip: '112.198.77.102',
        location: 'Quezon City, Metro Manila',
        emailAttempt: 'student.hacker@gmail.com',
        status: 'REJECTED_DOMAIN'
      }
    ]
  },
  {
    id: 'link-202',
    fileId: 'file-102',
    fileName: 'SeshCure_Portal_Architectural_Spec.docx',
    token: 'mcl-capstone-7m4v9w',
    createdByName: 'Engr. Luis Miguel Payong',
    createdByEmail: 'lpayong@mcl.edu.ph',
    createdAt: '2026-11-04 09:30:00',
    expiresAt: null, // No time limit / until revoked
    expiryHours: null,
    isNeverExpire: true,
    accessScope: 'anyone_with_link',
    pinRequired: false,
    downloadCount: 8,
    maxDownloads: 100,
    isRevoked: false,
    accessLog: [
      {
        timestamp: '2026-11-04 09:45:00',
        ip: '10.10.42.105',
        location: 'Cabuyao, Laguna (MCL Admin LAN)',
        emailAttempt: 'admin@mcl.edu.ph',
        status: 'GRANTED'
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: SessionAuditLog[] = [
  {
    id: 'log-501',
    timestamp: '2026-11-04 11:32:18',
    userEmail: 'lpayong@mcl.edu.ph',
    userName: 'Engr. Luis Miguel Payong',
    action: 'AES256_PAYLOAD_COMMIT',
    ipAddress: '10.10.18.24',
    city: 'Cabuyao City',
    region: 'Laguna (CALABARZON)',
    country: 'Philippines',
    isp: 'Mapúa MCL Enterprise Campus Network',
    isCampusSubnet: true,
    status: 'SUCCESS',
    riskScore: 2
  },
  {
    id: 'log-502',
    timestamp: '2026-11-04 11:28:44',
    userEmail: 'mcramos@live.mcl.edu.ph',
    userName: 'Maria Clara Ramos',
    action: 'SESSION_LOGIN',
    ipAddress: '120.28.184.21',
    city: 'Santa Rosa City',
    region: 'Laguna',
    country: 'Philippines',
    isp: 'PLDT Residential Fiber',
    isCampusSubnet: false,
    status: 'SUCCESS',
    riskScore: 18
  },
  {
    id: 'log-503',
    timestamp: '2026-11-04 11:15:02',
    userEmail: 'unknown_intruder@gmail.com',
    userName: 'External Attempter',
    action: 'LOGIN_GATE_DOMAIN_REJECTION',
    ipAddress: '185.220.101.5',
    city: 'Frankfurt',
    region: 'Hesse',
    country: 'Germany',
    isp: 'Tor Exit Node / Hosting Provider',
    isCampusSubnet: false,
    status: 'REJECTED',
    riskScore: 98
  },
  {
    id: 'log-504',
    timestamp: '2026-11-04 10:48:30',
    userEmail: 'admin@mcl.edu.ph',
    userName: 'MCL IT Security Directorate',
    action: 'SESSION_REVOCATION_SCAN',
    ipAddress: '10.10.42.105',
    city: 'Cabuyao City',
    region: 'Laguna',
    country: 'Philippines',
    isp: 'Mapúa MCL Enterprise Campus Network',
    isCampusSubnet: true,
    status: 'SUCCESS',
    riskScore: 0
  },
  {
    id: 'log-505',
    timestamp: '2026-11-04 10:35:40',
    userEmail: 'student.hacker@gmail.com',
    userName: 'Unverified Guest',
    action: 'SHARE_LINK_UNAUTHORIZED_DOMAIN',
    ipAddress: '112.198.77.102',
    city: 'Quezon City',
    region: 'Metro Manila',
    country: 'Philippines',
    isp: 'Globe Telecom Commercial',
    isCampusSubnet: false,
    status: 'REJECTED',
    riskScore: 72
  },
  {
    id: 'log-506',
    timestamp: '2026-11-04 10:10:00',
    userEmail: 'esantos@mcl.edu.ph',
    userName: 'Prof. Enrico Santos',
    action: 'ENCRYPTED_FILE_DOWNLOAD',
    ipAddress: '172.16.88.20',
    city: 'Cabuyao City',
    region: 'Laguna',
    country: 'Philippines',
    isp: 'Mapúa MCL MITL Lab 402 Network',
    isCampusSubnet: true,
    status: 'SUCCESS',
    riskScore: 1
  }
];
