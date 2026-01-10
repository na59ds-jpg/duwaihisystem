export const translations = {
  ar: {
    // عام
    dashboard: "لوحة التحكم",
    employees: "الموظفين",
    contractors: "المتعاقدين",
    management: "إدارة الأقسام والشركات",
    users: "المستخدمون",
    logout: "تسجيل الخروج",
    no_access: "ليس لديك صلاحية للوصول لهذه الصفحة",
    welcome: "مرحباً بك في منظومة أمن الدويحي",

    // تسجيل الدخول
    login: "تسجيل الدخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    sign_in: "دخول",

    // تصاريح المركبات والهويات
    vehicle_permits: "تصاريح المركبات",
    vp_emp_private: "تصاريح سيارات الموظفين الخاصة",
    vp_emp_company: "تصاريح سيارات الموظفين (شركة)",
    vp_con_private: "تصاريح سيارات المتعاقدين الخاصة",
    vp_con_company: "تصاريح سيارات المتعاقدين (شركة)",
    id_cards: "بطاقات الهوية والعمل",

    // أزرار عامة
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    search: "بحث",
    actions: "إجراءات",
    export: "تصدير البيانات",

    // صلاحيات وأدوار
    view: "مشاهدة",
    add_p: "إضافة",
    edit_p: "تعديل",
    delete_p: "حذف",
    leader: "مدير النظام",
    custom: "مستخدم مخصص",
    gate_operator: "مشغل بوابة الأمن",

    // رادار الرقابة (جديد ليتناسب مع Dashboard)
    radar_title: "رادار مراقبة الصلاحيات",
    expired: "منتهي الصلاحية",
    soon: "ينتهي قريباً",
    all_clear: "كافة الصلاحيات سارية",
  },

  en: {
    // General
    dashboard: "Dashboard",
    employees: "Employees",
    contractors: "Contractors",
    management: "Departments & Companies",
    users: "Users",
    logout: "Logout",
    no_access: "You do not have permission to access this page",
    welcome: "Welcome to Duwaihi Security System",

    // Login
    login: "Login",
    username: "Username",
    password: "Password",
    sign_in: "Sign in",

    // Vehicle permits & IDs
    vehicle_permits: "Vehicle Permits",
    vp_emp_private: "Employees Private Cars Permits",
    vp_emp_company: "Employees Company Cars Permits",
    vp_con_private: "Contractors Private Cars Permits",
    vp_con_company: "Contractors Company Cars Permits",
    id_cards: "ID & Work Cards",

    // Common buttons
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    actions: "Actions",
    export: "Export Data",

    // Permissions & Roles
    view: "View",
    add_p: "Add",
    edit_p: "Edit",
    delete_p: "Delete",
    leader: "System Admin",
    custom: "Custom User",
    gate_operator: "Security Gate Operator",

    // Expiration Radar (New for Dashboard)
    radar_title: "Expiration Radar",
    expired: "Expired",
    soon: "Expiring Soon",
    all_clear: "All permits are active",
  },
} as const;