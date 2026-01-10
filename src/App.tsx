import React, { useState, createContext, useContext, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

// استيراد المكونات الأساسية للنظام
import { Sidebar } from "./assets/components/Sidebar";
import { Dashboard } from "./assets/components/Dashboard";
import { Login } from "./assets/components/Login";
import { Management } from "./assets/components/Management";
import { UserManagement } from "./assets/components/UserManagement";
import { SupportTickets } from "./assets/components/SupportTickets";
import { GatePortal } from "./assets/components/GatePortal"; 
import { EmployeePortal } from "./assets/components/EmployeePortal"; 

// استيراد المديولات التخصصية
import CompanyManager from "./modules/Contractors/CompanyManager";
import DepartmentManager from "./modules/Employees/DepartmentManager";
import WorkCards from "./modules/Permits/WorkCards";
import AccessControl from "./modules/Security/AccessControl";
import { EmployeesTable } from "./assets/components/EmployeesTable";
import { ContractorsTable } from "./assets/components/ContractorsTable";

// تعريف واجهة سياق التطبيق (Context Interface)
interface AppContextType {
  language: string; 
  setLanguage: (lang: string) => void;
  theme: 'light' | 'dark'; 
  setTheme: (theme: 'light' | 'dark') => void;
  user: any; 
  setUser: (user: any) => void;
  navigateTo: (tab: string, filter?: string) => void;
  activeFilter: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// الخطاف المخصص للوصول لبيانات التطبيق من أي مكان
export const useApp = () => { 
  const context = useContext(AppContext); 
  if (!context) throw new Error("useApp must be used within AppProvider"); 
  return context; 
};

const App: React.FC = () => {
  // 1. حالات الحالة الأساسية (Language, Theme, User)
  const [lang, setLang] = useState(() => localStorage.getItem("maaden_lang") || "ar");
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem("maaden_theme") as 'light' | 'dark') || 'dark'
  );
  
  // استعادة جلسة المستخدم عند بدء التطبيق (تذكرني)
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem("maaden_session");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [pendingRequestsTotal, setPendingRequestsTotal] = useState(0); 

  // وظائف التحكم بالحالة
  const handleSetLanguage = (l: string) => {
    setLang(l);
    localStorage.setItem("maaden_lang", l);
  };

  const handleSetTheme = (t: 'light' | 'dark') => {
    setTheme(t);
    localStorage.setItem("maaden_theme", t);
  };

  const handleSetUser = (u: any) => {
    setUser(u);
    if (u) {
      // حفظ الجلسة في الذاكرة الدائمة لضمان "تذكرني"
      localStorage.setItem("maaden_session", JSON.stringify(u));
    } else { 
      // مسح الجلسة تماماً عند تسجيل الخروج
      localStorage.removeItem("maaden_session"); 
      setActiveTab("dashboard"); 
      setActiveFilter(null);
    }
  };

  // مراقبة الطلبات الجديدة للإدارة فقط (Real-time Audit Badge)
  useEffect(() => {
    if (user && user.role !== 'Employee' && user.role !== 'Gate') {
      const q = query(collection(db, "employee_requests"), where("status", "==", "قيد المراجعة"));
      const unsub = onSnapshot(q, (snapshot) => setPendingRequestsTotal(snapshot.size));
      return () => unsub();
    }
  }, [user]);

  // تحديث سمة النظام البصرية
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  // تجهيز القيم لمزود السياق
  const contextValue: AppContextType = { 
    language: lang, 
    setLanguage: handleSetLanguage, 
    theme, 
    setTheme: handleSetTheme, 
    user, 
    setUser: handleSetUser, 
    activeFilter, 
    navigateTo: (tab, filter) => { 
      setActiveTab(tab); 
      setActiveFilter(filter || null); 
    } 
  };

  const isRTL = lang === 'ar';

  // محرك عرض المحتوى الذكي بناءً على الصلاحيات والتبويبات
  const renderContent = () => {
    // التوجيه الإلزامي للأدوار المحددة (عزل تام للبوابات)
    if (user?.role === 'Employee') return <EmployeePortal />;
    if (user?.role === 'Gate') return <GatePortal />;

    // مسارات الإدارة والقيادة
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "management": return <Management />;
      case "security_control": return <Management />; 
      
      // للمدير: بوابة الموظف تعرض الطلبات الواردة (تدقيق) وبوابة الأمن تعرض الفحص الميداني
      case "employee_portal": return <SupportTickets />; 
      case "gate_portal": return <AccessControl />; 
      
      case "users": return <UserManagement />;
      case "tickets": return <SupportTickets />;
      case "personnel": return <DepartmentManager />;
      case "employees": return <EmployeesTable filterDeptId={activeFilter} />;
      case "contractors_mgmt": return <CompanyManager />;
      case "contractors": return <ContractorsTable />;
      case "permits": return <WorkCards />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`min-h-screen relative transition-colors duration-700 ${theme === 'dark' ? 'bg-black text-white' : 'bg-[#F8FAFC] text-zinc-900'}`}>
        {/* خلفية النظام الإستراتيجية */}
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-40"
          style={{ backgroundImage: "url('/bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="relative z-10 min-h-screen flex flex-col">
          {!user ? (
            <Login /> 
          ) : (
            <div className="flex h-screen overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
              {/* شريط السايدبار للإدارة فقط */}
              {(user.role !== 'Employee' && user.role !== 'Gate') && (
                <Sidebar activeTab={activeTab} activeFilter={activeFilter} navigateTo={contextValue.navigateTo} />
              )}
              
              <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* الهيدر العلوي للإدارة فقط */}
                {(user.role !== 'Employee' && user.role !== 'Gate') && (
                  <header className={`h-20 border-b flex items-center justify-between px-10 z-20 backdrop-blur-xl ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white/90 border-zinc-200'}`}>
                    <button onClick={() => handleSetLanguage(isRTL ? "en" : "ar")} className="px-6 py-2 rounded-xl border border-[#C4B687] text-[#C4B687] font-black text-[10px] uppercase">
                        {isRTL ? "English" : "العربية"}
                    </button>
                    
                    <div className="flex items-center gap-6">
                      {/* جرس الإشعارات للطلبات المعلقة */}
                      <div className="relative cursor-pointer" onClick={() => setActiveTab("tickets")}>
                        <span className="text-xl">🔔</span>
                        {pendingRequestsTotal > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                            {pendingRequestsTotal}
                          </span>
                        )}
                      </div>
                      
                      <div className={`${isRTL ? 'text-right border-r-2 pr-5' : 'text-left border-l-2 pl-5'} border-[#C4B687]/40`}>
                        <p className="font-bold text-sm leading-tight">{user.name}</p>
                        <p className="text-[#C4B687] font-black text-[8px] uppercase tracking-widest opacity-80">
                            {user.role === 'Admin' || user.username === 'deefullahna' ? (isRTL ? 'مدير النظام' : 'Administrator') : (isRTL ? 'مشرف SOC' : 'SOC Supervisor')}
                        </p>
                      </div>
                      
                      <button onClick={() => handleSetUser(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      </button>
                    </div>
                  </header>
                )}
                
                {/* منطقة عرض المحتوى الرئيسية */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className={`${(user.role === 'Employee' || user.role === 'Gate') ? '' : 'p-8 max-w-[1600px] mx-auto'} animate-view`}>
                    {renderContent()}
                  </div>
                </div>
              </main>
            </div>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;