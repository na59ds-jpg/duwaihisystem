export interface StructureItem {
  id: string;
  name: string;
  type: "dept" | "comp";
}

export interface User {
  id: string; // Required now
  name?: string;
  username?: string;
  password?: string;
  role?: string;
  empId?: string;
  nationalId?: string;
  isPersistent?: boolean;
  canManage?: string[];
  permissions?: Record<ModuleKey, Permission>;
  [key: string]: any;
}

export type Role = "Admin" | "Leader" | "Assistant" | "Custom" | "Employee" | "Gate";
export type ModuleKey = "dashboard" | "employees" | "contractors" | "vehicle_permits" | "management" | "users";

export interface Permission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface TicketData {
  name: string;
  empId: string;
  nationalId: string;
  message: string;
  issueType: string;
  category?: string;
  supportType?: "tech" | "security";
  status?: string;
  createdAt?: any;
}

export interface RequestData {
  id: string;
  type: string;
  status: string;
  createdAt: any;
  rejectionReason?: string;
  [key: string]: any;
}

export interface ApprovedRecord {
  id: string;
  fullName: string;
  jobTitle?: string;
  position?: string;
  serialNumber: string;
  approvedAt?: any;
  attachments?: { [key: string]: string };
  nationalId?: string;
  idNo?: string;
  empNo?: string;
  employeeId?: string;
  bloodGroup?: string;
  dept?: string;
  companyName?: string;
  plateNo?: string;
  color?: string;
  model?: string;
  activeService?: string; // Helper for UI
  status: string;
}

export interface FormState {
  category: string;
  requestType: string;
  fullName: string;
  jobTitle: string;
  empNo: string;
  grade: string;
  nationality: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationalId: string;
  idIssuePlace: string;
  idIssueDate: string;
  idExpiryDate: string;
  dept: string;
  section: string;
  companyName: string;
  mobile: string;
  bloodGroup: string;
  licenseType: string;
  licenseNo: string;
  licenseExpiry: string;
  plateNo: string;
  color: string;
  model: string;
  vehicleType: string;
  permitArea: string;
}

export interface GateRecord {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  location: string;
  status: "active" | "inactive";
  [key: string]: any;
}

export interface RegData {
  name: string;
  empId: string;
  nationalId: string;
  pass: string;
  userType: string;
  affiliation: string;
}

export interface RecoveryData {
  empId: string;
  nationalId: string;
  newPass: string;
}

export interface VisitorLog {
  id: string;
  name?: string;
  visitorName?: string;
  hostName?: string;
  gateName?: string;
  action?: string;
  timestamp?: any;
  [key: string]: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "Low" | "Normal" | "High" | "Critical";
  createdAt?: any;
}