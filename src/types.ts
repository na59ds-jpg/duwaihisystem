// types.ts - الملف الأساسي لتعريفات النظام (النسخة المحدثة لعام 2025)

// اللغات والقوالب المدعومة
export type Language = "ar" | "en";
export type Theme = "light" | "dark";

// تعريف هيكل الصلاحيات الرباعي (عرض، إضافة، تعديل، حذف)
export type Permission = {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
};

// مفاتيح الصفحات (Modules) لضمان الربط البرمجي الصحيح
export type ModuleKey =
  | "dashboard"        // لوحة التحكم
  | "employees"        // إدارة الموظفين
  | "contractors"      // إدارة المقاولين
  | "vehicle_permits"  // إدارة التصاريح
  | "management"       // إدارة الهيكل
  | "users";           // إدارة المستخدمين

// الرتب الوظيفية المحدثة (نظام المسميات الجديد)
// Admin: مدير النظام (تاج)
// Leader: قائد (4 نجوم)
// Assistant: مساعد قائد (3 نجوم)
// Custom: مستخدم (نجمتين)
export type Role = "Admin" | "Leader" | "Assistant" | "Custom";

// هيكل بيانات المستخدم الكامل
export type User = {
  id: string;
  name: string;
  username: string;
  role: Role;
  password?: string;
  permissions: Record<ModuleKey, Permission>;
};

// هيكل بيانات الموظف (للمزامنة مع رقم الشارة)
export interface Employee {
  id: string;
  fullName: string;
  empId: string;      // رقم الشارة / الرقم الوظيفي
  nationalId: string;
  deptId: string;
  phone?: string;
  createdAt: any;
}

// هيكل بيانات تصريح المركبة (مرتبط بالألوان المعتمدة)
export interface VehiclePermit {
  id: string;
  empNo: string;      // رقم الشارة المربوط
  fullName: string;
  vehicleOwnership: "مركبة خاصة" | "مركبة الشركة" | "مركبة مقاول"; // الأبيض، الأخضر، الأصفر
  plateNo: string;
  stickerNo: string;
  expiryDate: string;
  createdAt: number;
}