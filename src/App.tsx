import React, { useState, createContext, useContext, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { uploadToCloudinary } from "./utils/cloudinary";
import { User } from "./types";

// ... (Imports remain same)
import { Sidebar } from "./assets/components/Sidebar";
import { Dashboard } from "./assets/components/Dashboard";
import { Login } from "./assets/components/Login";
import { Management } from "./assets/components/Management";
import { UserManagement } from "./assets/components/UserManagement";
import { SupportTickets } from "./assets/components/SupportTickets";
import { GatePortal } from "./assets/components/GatePortal";
import { EmployeePortal } from "./assets/components/EmployeePortal";

import CompanyManager from "./modules/Contractors/CompanyManager";
import DepartmentManager from "./modules/Employees/DepartmentManager";
import WorkCards from "./modules/Permits/WorkCards";
import AccessControl from "./modules/Security/AccessControl";
import { EmployeesTable } from "./assets/components/EmployeesTable";
import { ContractorsTable } from "./assets/components/ContractorsTable";

// ... (Context definition remains same)
interface AppContextType {
  language: string;
  setLanguage: (lang: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  user: User | null;
  setUser: (user: User | null) => void;
  navigateTo: (tab: string, filter?: string) => void;
  activeFilter: string | null;
  adminAvatar: string; // New Context Value
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const App: React.FC = () => {
  const [lang, setLang] = useState(() => localStorage.getItem("maaden_lang") || "ar");
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem("maaden_theme") as 'light' | 'dark') || 'dark'
  );

  const [user, setUser] = useState<User | null>(() => {
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

  // Profile & Security State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [securityForm, setSecurityForm] = useState({ username: "", password: "", pin: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [adminAvatar, setAdminAvatar] = useState(""); // State for global avatar URL

  // Load Settings from Firestore on Mount (and when modal opens)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "system_settings", "config");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setSecurityForm({
            username: data.username || "",
            password: data.password || "",
            pin: data.vip_pin || ""
          });
          setAdminAvatar(data.avatar || "");
        }
      } catch (e) {
        console.error("Error fetching settings:", e);
      }
    };
    fetchSettings();
  }, [showSettingsModal]);

  const handleSaveSecurity = async () => {
    try {
      let avatarUrl = adminAvatar;
      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile);
        setAdminAvatar(avatarUrl);
      }

      await setDoc(doc(db, "system_settings", "config"), {
        username: securityForm.username,
        password: securityForm.password,
        vip_pin: securityForm.pin,
        avatar: avatarUrl
      }, { merge: true });

      alert(lang === 'ar' ? "تم حفظ الإعدادات في السحابة بنجاح ✅" : "Settings Saved to Cloud Successfully ✅");
      setShowSettingsModal(false);
    } catch (e) {
      console.error(e);
      alert("Error saving settings");
    }
  };

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
      localStorage.setItem("maaden_session", JSON.stringify(u));
    } else {
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
    },
    adminAvatar // Export avatar to context
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

                      <div className="relative">
                        <button
                          onClick={() => setShowProfileMenu(!showProfileMenu)}
                          className="flex items-center gap-4 hover:bg-[#C4B687]/5 p-2 rounded-xl transition-all"
                        >
                          <div className={`${isRTL ? 'text-right border-r-2 pr-5' : 'text-left border-l-2 pl-5'} border-[#C4B687]/40`}>
                            <p className="font-bold text-sm leading-tight">{user.name}</p>
                            <p className="text-[#C4B687] font-black text-[8px] uppercase tracking-widest opacity-80">
                              {user.role === 'Admin' || user.username === 'admin' ? (isRTL ? 'مدير النظام' : 'Administrator') : (isRTL ? 'مشرف SOC' : 'SOC Supervisor')}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-[#C4B687] flex items-center justify-center overflow-hidden shadow-lg">
                            {/* Placeholder Image or User Initial */}
                            <span className="text-xs font-black text-[#C4B687]">
                              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
                            </span>
                          </div>
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                          <div className={`absolute top-full mt-2 w-56 rounded-2xl border shadow-2xl overflow-hidden py-2 z-50 ${theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-zinc-200'} ${isRTL ? 'left-0' : 'right-0'}`}>

                            {/* Account Settings Option (Admin Only) */}
                            {(user.role === 'Admin' || user.username === 'admin') && (
                              <button
                                onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                                className={`w-full text-start px-6 py-3 text-xs font-bold transition-all flex items-center gap-3 ${theme === 'dark' ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-50'}`}
                              >
                                <span>⚙️</span> {isRTL ? "إعدادات الحساب" : "Account Settings"}
                              </button>
                            )}

                            <div className="h-px bg-white/10 my-1 mx-4"></div>

                            <button
                              onClick={() => handleSetUser(null)}
                              className={`w-full text-start px-6 py-3 text-xs font-bold transition-all flex items-center gap-3 text-red-500 hover:bg-red-500/10`}
                            >
                              <span>🚪</span> {isRTL ? "تسجيل الخروج" : "Logout"}
                            </button>
                          </div>
                        )}
                      </div>
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

        {/* Account Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className={`w-full max-w-2xl p-8 rounded-[2.5rem] border-2 shadow-2xl relative ${theme === 'dark' ? 'bg-black border-[#C4B687]/30 shadow-[#C4B687]/10' : 'bg-white border-zinc-200'}`} dir={isRTL ? "rtl" : "ltr"}>
              <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 left-6 text-zinc-500 hover:text-red-500 transition-colors text-2xl font-black">✕</button>

              <h3 className="text-2xl font-[900] text-[#C4B687] uppercase tracking-tighter mb-2 text-center">{isRTL ? "إعدادات الحساب الإداري" : "Admin Account Settings"}</h3>
              <p className={`text-center text-xs font-bold opacity-50 mb-8 ${theme === 'dark' ? 'text-white' : 'text-zinc-600'}`}>
                {isRTL ? "تحكم كامل بهوية المدير ورمز الطوارئ" : "Manage admin credentials and VIP PIN"}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Credentials */}
                <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                  <h4 className={`text-sm font-black mb-4 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{isRTL ? "بيانات الدخول (Local)" : "Login Credentials"}</h4>
                  <div className="space-y-3">
                    <input value={securityForm.username} onChange={e => setSecurityForm({ ...securityForm, username: e.target.value })} placeholder="Username" className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${theme === 'dark' ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200'}`} />
                    <input type="password" value={securityForm.password} onChange={e => setSecurityForm({ ...securityForm, password: e.target.value })} placeholder="Password" className={`w-full p-3 rounded-xl border outline-none font-bold text-sm ${theme === 'dark' ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200'}`} />
                  </div>
                </div>

                {/* VIP PIN */}
                <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                  <h4 className={`text-sm font-black mb-4 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{isRTL ? "الرمز السريع (VIP PIN)" : "VIP Quick Access"}</h4>
                  <div className="space-y-3 text-center">
                    <p className="text-[10px] opacity-50 mb-2">Use this code for instant login.</p>
                    <input type="text" value={securityForm.pin} onChange={e => setSecurityForm({ ...securityForm, pin: e.target.value })} placeholder="080012" className={`w-full p-3 rounded-xl border outline-none text-center text-2xl tracking-[0.3em] font-black ${theme === 'dark' ? 'bg-black border-white/10 text-[#C4B687]' : 'bg-white border-zinc-200 text-black'}`} />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button onClick={handleSaveSecurity} className="px-12 py-4 bg-[#C4B687] text-black rounded-2xl font-[900] shadow-xl hover:scale-105 active:scale-95 transition-all">
                  {isRTL ? "حفظ التحديثات" : "Save Updates"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppContext.Provider>
  );
};

export default App;