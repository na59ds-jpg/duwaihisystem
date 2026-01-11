import { useState, useEffect } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, getDoc, query, where, serverTimestamp, doc, onSnapshot } from "firebase/firestore";

/**
 * MASAR PLATFORM - Al Duwaihi Gold Mine
 * FEATURE: Security Services Center (Refactored)
 */

import type { StructureItem, TicketData, User } from "../../types";

import { ServiceRequestModal } from "./ServiceRequestModal";

export function Login() {
  const { setUser, language, setLanguage, theme } = useApp();
  const isRTL = language === 'ar';

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'main' | 'employee' | 'gate' | 'admin'>('main');

  // New State for Service Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceType, setServiceType] = useState<any>('employee_card');

  const [empIdLogin, setEmpIdLogin] = useState("");
  const [empPassword, setEmpPassword] = useState("");

  // Structure Lists
  const [departments, setDepartments] = useState<StructureItem[]>([]);
  const [companies, setCompanies] = useState<StructureItem[]>([]);

  const [showSupport, setShowSupport] = useState(false);
  const [supportType, setSupportType] = useState<"tech" | "security">("tech");
  const [ticket, setTicket] = useState<TicketData>({ name: "", empId: "", nationalId: "", message: "", issueType: "" });

  // جلب الأقسام والشركات ديناميكياً دائماً (Dropdowns for Services)
  useEffect(() => {
    // We always need this now for the Service Requests
    const unsub = onSnapshot(collection(db, "structure"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as StructureItem));
      setDepartments(data.filter((i) => i.type === "dept"));
      setCompanies(data.filter((i) => i.type === "comp"));
    });
    return () => unsub();
  }, []);

  const handleOpenService = (type: string) => {
    setServiceType(type);
    setShowServiceModal(true);
  };

  // 1. دخول الإدارة (Admin Login) مع الرمز السريع الاحترافي
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");

    try {
      // Fetch Security Config from Firestore
      const docRef = doc(db, "system_settings", "config");
      const snap = await getDoc(docRef);

      let adminUser = "admin";
      let adminPass = "admin123";
      let adminPin = "1990";

      if (snap.exists()) {
        const data = snap.data();
        if (data.username) adminUser = data.username;
        if (data.password) adminPass = data.password;
        if (data.vip_pin) adminPin = data.vip_pin;
      }

      // VIP PIN Login
      if (username.trim() === adminPin.trim()) {
        const adminSession: User = {
          id: "admin_vip",
          name: "نواف الجعيد",
          role: "Admin",
          username: adminUser,
          isPersistent: true
        };
        localStorage.setItem("maaden_session", JSON.stringify(adminSession));
        setUser(adminSession);
        setLoading(false);
        return;
      }

      // Standard Admin Login
      if (username === adminUser && password === adminPass) {
        const admin: User = { id: "admin_standard", name: "نواف الجعيد", role: "Admin", username: adminUser };
        localStorage.setItem("maaden_session", JSON.stringify(admin));
        setUser(admin);
        setLoading(false);
        return;
      }

      // Fallback: Check Firebase Users Collection
      const q = query(collection(db, "users"), where("username", "==", username.trim()));
      const userSnap = await getDocs(q);

      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        if (userData.password === password) {
          const finalUser: User = { id: userSnap.docs[0].id, ...userData } as User;
          localStorage.setItem("maaden_session", JSON.stringify(finalUser));
          setUser(finalUser);
        } else {
          setError(isRTL ? "كلمة المرور غير صحيحة" : "Incorrect Password");
        }
      } else {
        setError(isRTL ? "بيانات الدخول غير مسجلة" : "User Not Found");
      }

    } catch (err) {
      console.error("Auth Error", err);
      setError(isRTL ? "فشل الاتصال" : "Server Error");
    }
    setLoading(false);
  };

  // 2. دخول مستخدمي البوابة (Employee & Gate Login)
  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const collectionName = view === 'gate' ? "employees_accounts" : "portal_users";
      const q = query(collection(db, collectionName), where("empId", "==", empIdLogin.trim()), where("pass", "==", empPassword));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

        if (view === 'gate' && userData.role !== 'Gate') {
          setError(isRTL ? "عذراً، هذا الحساب ليس لديه صلاحية أمنية" : "Security Access Only");
          setLoading(false); return;
        }

        localStorage.setItem("maaden_session", JSON.stringify(userData));
        setUser(userData);
      } else { setError(isRTL ? "بيانات الدخول غير صحيحة" : "Invalid Credentials"); }
    } catch { setError(isRTL ? "فشل تسجيل الدخول" : "Login Failed"); }
    setLoading(false);
  };



  const handleSendSupport = async () => {
    const isTech = supportType === "tech";
    if (isTech && !ticket.nationalId) return alert("يرجى إدخال رقم الهوية/الإقامة");
    if (!isTech && (!ticket.name || !ticket.empId)) return alert("يرجى إدخال الاسم والرقم الوظيفي");
    if (!ticket.message) return alert("يرجى إدخال تفاصيل البلاغ/المشكلة");

    setLoading(true);
    try {
      await addDoc(collection(db, "tickets"), {
        ...ticket,
        supportType,
        category: isTech ? "دعم تقني" : "بلاغ أمني",
        status: "جديد",
        createdAt: serverTimestamp()
      });
      alert(isRTL ? "تم الإرسال بنجاح ✅" : "Sent Successfully ✅");
      setShowSupport(false);
      setTicket({ name: "", empId: "", nationalId: "", message: "", issueType: "" });
    } catch { alert("Error"); }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex flex-col font-['Cairo'] relative transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black`} dir={isRTL ? "rtl" : "ltr"}>

      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      <div className="fixed inset-0 bg-black/40 pointer-events-none"></div>

      {/* Decorative Luxury Lines */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top Section Lines */}
        <div className="absolute top-[15%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C4B687]/40 to-transparent"></div>
        <div className="absolute top-[16%] left-0 w-full h-[2px] bg-black/80 blur-[1px]"></div>

        {/* Bottom Section Lines */}
        <div className="absolute bottom-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C4B687]/30 to-transparent"></div>
        <div className="absolute bottom-[19%] left-0 w-full h-[3px] bg-black/60 blur-[2px]"></div>

        {/* Vertical Accents (Optional subtle connects) */}
        <div className="absolute top-0 right-[15%] w-[1px] h-full bg-gradient-to-b from-transparent via-[#C4B687]/5 to-transparent"></div>
        <div className="absolute top-0 left-[15%] w-[1px] h-full bg-gradient-to-b from-transparent via-[#C4B687]/5 to-transparent"></div>
      </div>

      {/* Header */}
      <header className={`backdrop-blur-xl border-b p-6 flex justify-between items-center px-10 md:px-20 z-20 shadow-xl transition-all ${theme === 'dark' ? 'bg-black/60 border-[#C4B687]/20' : 'bg-black/80 border-zinc-800'}`}>
        <div className="flex items-center gap-6">
          <div className="bg-white p-2 rounded-xl shadow-md border border-[#C4B687]"><img src="/logo.png" alt="Logo" className="h-10" /></div>
          <div className={`${isRTL ? 'border-r-4 pr-6' : 'border-l-4 pl-6'} border-[#C4B687] text-right`}>
            <p className="text-[10px] font-black text-[#C4B687] tracking-[0.2em] uppercase opacity-90 leading-tight">
              {isRTL ? 'المنصة الأمنية الموحدة لمنجم الدويحي' : 'Unified Security Platform - Al Duwaihi Mine'}
            </p>
            <h1 className={`text-5xl font-black text-white leading-none mt-2 tracking-wide font-['IBM_Plex_Sans_Arabic'] flex items-center`}>
              مـسـار
              <span className="text-[#C4B687] mx-3 text-4xl opacity-50 font-light">|</span>
              <span className="tracking-[0.3em] font-sans font-bold text-[#C4B687]">MASAR</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowSupport(true)} className="px-4 py-2 bg-[#C4B687]/10 text-[#C4B687] border border-[#C4B687]/20 rounded-xl font-black text-[10px] hover:bg-[#C4B687] hover:text-black transition-all">
            🛠️ {isRTL ? "الدعم والبلاغات" : "Support"}
          </button>
          <button onClick={() => setLanguage(isRTL ? 'en' : 'ar')} className="px-6 py-2 border border-[#C4B687] text-[#C4B687] rounded-xl font-bold text-xs hover:bg-[#C4B687] hover:text-black transition-all">
            {isRTL ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center z-10 p-6 w-full max-w-[1600px] mx-auto py-20">

        {/* TOP SECTION: Command & Control Only */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 animate-in slide-in-from-top-10 duration-700">
          <MenuCard
            icon="👑"
            title={isRTL ? "مركز الإدارة" : "Command Center"}
            desc="Admin System Access"
            onClick={() => setView('admin')}
            featured
            theme={theme}
          />
          <MenuCard
            icon="🛡️"
            title={isRTL ? "بوابة الأمن" : "Security Gate"}
            desc="Field Control Access"
            onClick={() => setView('gate')}
            theme={theme}
          />
        </div>

        {/* BOTTOM SECTION: Security Services Grid (6 Cards) */}
        <div className="w-full text-center">
          <div className="flex items-center justify-center gap-4 mb-10 opacity-70">
            <div className="h-[1px] w-20 bg-[#C4B687]"></div>
            <h3 className="text-[#C4B687] text-xs font-black uppercase tracking-[0.3em]">
              {isRTL ? "الخدمات الإلكترونية والأمنية" : "Security Electronic Services"}
            </h3>
            <div className="h-[1px] w-20 bg-[#C4B687]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
            {/* Employee Card - White/Gold */}
            <ServiceCard
              title="Employee Card"
              titleAr="إصدار بطاقة موظف"
              color="bg-white border-[#C4B687]"
              textColor="text-zinc-900"
              icon="🆔"
              onClick={() => handleOpenService('employee_card')}
            />

            {/* Contractor Card - White/Orange */}
            <ServiceCard
              title="Contractor Card"
              titleAr="إصدار بطاقة مقاول"
              color="bg-white border-orange-500"
              textColor="text-zinc-900"
              icon="👷"
              onClick={() => handleOpenService('contractor_card')}
            />

            {/* Private Vehicle - White */}
            <ServiceCard
              title="Private Vehicle"
              titleAr="تصريح مركبة خاصة"
              color="bg-white border-zinc-200"
              textColor="text-zinc-900"
              icon="🚗"
              onClick={() => handleOpenService('private_vehicle')}
            />

            {/* Company Vehicle - Green */}
            <ServiceCard
              title="Company Vehicle"
              titleAr="تصريح مركبة شركة"
              color="bg-emerald-700 border-emerald-500"
              textColor="text-white"
              icon="🚙"
              onClick={() => handleOpenService('company_vehicle')}
            />

            {/* Contractor Vehicle - Yellow */}
            <ServiceCard
              title="Contractor Vehicle"
              titleAr="تصريح مركبة مقاول"
              color="bg-yellow-400 border-yellow-300"
              textColor="text-black"
              icon="🚜"
              onClick={() => handleOpenService('contractor_vehicle')}
            />

            {/* Inquiry - Dark */}
            <ServiceCard
              title="Request Inquiry"
              titleAr="استعلام عن طلب"
              color="bg-zinc-800 border-zinc-600"
              textColor="text-white"
              icon="🔍"
              onClick={() => handleOpenService('inquiry')}
            />
          </div>
        </div>

        {/* Modal Injection */}
        {showServiceModal && (
          <ServiceRequestModal
            type={serviceType}
            onClose={() => setShowServiceModal(false)}
            departments={departments}
            companies={companies}
            theme={theme}
          />
        )}

        {/* Keep existing login form for Admin/Gate views */}
        {(view === 'admin' || view === 'gate') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in zoom-in-95">
            <div className="relative w-full max-w-md">
              <button onClick={() => setView('main')} className="absolute -top-12 right-0 text-white/50 hover:text-white text-xl font-bold">✕ Close</button>
              <div className={`p-10 rounded-[3rem] border border-[#C4B687]/30 shadow-2xl bg-black relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-[#C4B687]"></div>

                <h3 className="text-2xl font-black text-center text-white mb-8">
                  {view === 'admin' ? (isRTL ? "دخول مركز الإدارة" : "Command Center Login") : (isRTL ? "دخول البوابة الأمنية" : "Security Gate Login")}
                </h3>

                <form onSubmit={view === 'admin' ? handleLogin : handleEmployeeLogin} className="space-y-4">
                  <InputBox
                    placeholder={view === 'admin' ? (isRTL ? "اسم المستخدم" : "Username") : (isRTL ? "الرقم الوظيفي" : "Emp ID")}
                    value={view === 'admin' ? username : empIdLogin}
                    onChange={e => view === 'admin' ? setUsername(e.target.value) : setEmpIdLogin(e.target.value)}
                    theme="dark"
                  />
                  <InputBox
                    type="password"
                    placeholder={isRTL ? "كلمة المرور" : "Password"}
                    value={view === 'admin' ? password : empPassword}
                    onChange={e => view === 'admin' ? setPassword(e.target.value) : setEmpPassword(e.target.value)}
                    theme="dark"
                  />
                  {error && <p className="text-red-500 text-center text-xs font-bold">{error}</p>}

                  <button type="submit" className="w-full py-4 bg-[#C4B687] text-black rounded-xl font-bold text-lg hover:brightness-110 mt-4 transition-all">
                    {isRTL ? "دخول النظام" : "Login System"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="p-8 text-center opacity-40 text-[10px] font-black tracking-[0.4em] text-[#C4B687] uppercase">
        MASAR SECURITY PLATFORM • AL DUWAIHI GOLD MINE • 2026
      </footer>

      {showSupport && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-zinc-950 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-white/5 relative">
            <button onClick={() => setShowSupport(false)} className="absolute top-8 left-8 font-bold text-white/20 hover:text-red-500 text-xl transition-colors">✕</button>
            <h3 className="text-2xl font-black mb-10 text-right text-white border-r-4 border-[#C4B687] pr-4 uppercase tracking-tighter">
              {isRTL ? "البلاغات والدعم الفني" : "Support & Reports"}
            </h3>

            <div className="flex gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl">
              <button onClick={() => setSupportType("tech")} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${supportType === 'tech' ? 'bg-[#C4B687] text-black' : 'text-zinc-500 hover:text-white'}`}>🔧 {isRTL ? "دعم تقني" : "Technical"}</button>
              <button onClick={() => setSupportType("security")} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${supportType === 'security' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}>🛡️ {isRTL ? "بلاغ أمني" : "Security"}</button>
            </div>

            <div className="space-y-4">
              {supportType === "tech" ? (
                <>
                  <InputBox placeholder={isRTL ? "رقم الهوية / الإقامة *" : "ID Number"} value={ticket.nationalId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicket({ ...ticket, nationalId: e.target.value })} theme="dark" />
                  <select
                    value={ticket.issueType}
                    onChange={e => setTicket({ ...ticket, issueType: e.target.value })}
                    className="w-full p-4 bg-[#27272a] rounded-xl text-right font-bold border border-white/10 focus:border-[#C4B687] outline-none text-white text-xs appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#18181b] text-zinc-500">-- {isRTL ? "اختر نوع المشكلة" : "Select Issue Type"} --</option>
                    <option value="تسجيل الدخول" className="bg-[#18181b] text-white">{isRTL ? "مشكلة في تسجيل الدخول" : "Login Issue"}</option>
                    <option value="نسيان كلمة المرور" className="bg-[#18181b] text-white">{isRTL ? "نسيان كلمة المرور" : "Forgot Password"}</option>
                    <option value="بيانات خاطئة" className="bg-[#18181b] text-white">{isRTL ? "خطأ في بياناتي الشخصية" : "Data Error"}</option>
                    <option value="المرفقات" className="bg-[#18181b] text-white">{isRTL ? "مشكلة في رفع المرفقات" : "Upload Error"}</option>
                  </select>
                </>
              ) : (
                <>
                  <InputBox placeholder={isRTL ? "الاسم الكامل *" : "Full Name"} value={ticket.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicket({ ...ticket, name: e.target.value })} theme="dark" />
                  <InputBox placeholder={isRTL ? "الرقم الوظيفي *" : "Employee ID"} value={ticket.empId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicket({ ...ticket, empId: e.target.value })} theme="dark" />
                </>
              )}
              <textarea
                placeholder={isRTL ? "تفاصيل إضافية..." : "Message details..."}
                rows={4}
                value={ticket.message}
                onChange={e => setTicket({ ...ticket, message: e.target.value })}
                className="w-full p-4 bg-white/5 rounded-xl text-right font-medium border border-white/10 focus:border-[#C4B687] outline-none resize-none text-white text-sm"
              />
            </div>

            <button onClick={handleSendSupport} disabled={loading} className={`w-full py-5 mt-8 rounded-2xl font-black text-lg shadow-xl hover:brightness-110 active:scale-95 transition-all ${supportType === 'tech' ? 'bg-[#C4B687] text-black' : 'bg-red-600 text-white'}`}>
              {loading ? "..." : (isRTL ? "إرسال الطلب" : "Send Request")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- الهياكل الفرعية المساعدة ---

interface InputBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  theme: string;
}

function InputBox({ type = "text", theme, ...props }: InputBoxProps) {
  return (
    <input
      {...props}
      type={type}
      className={`
                w-full p-4 rounded-xl border border-[#C4B687]/50
                text-center font-bold focus:border-[#C4B687] 
                outline-none transition-all
                ${theme === 'dark'
          ? 'bg-white/5 text-white placeholder:text-white/50 focus:bg-white/[0.08]'
          : 'bg-black/5 text-zinc-900 placeholder:text-zinc-400 focus:bg-black/[0.02]'
        }
                ${type === 'password' ? 'text-2xl tracking-[0.3em]' : 'text-base'}
            `}
      required
    />
  );
}

interface MenuCardProps {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
  featured?: boolean;
  theme: string;
}

function MenuCard({ icon, title, desc, onClick, featured = false, theme }: MenuCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-10 rounded-[2.5rem] border transition-all duration-500 cursor-pointer text-center space-y-4 shadow-xl active:scale-95 group relative overflow-hidden flex flex-col items-center justify-center
        ${featured
          ? 'bg-[#C4B687]/10 border-[#C4B687] scale-105 shadow-[0_0_30px_rgba(196,182,135,0.2)] opacity-100'
          : (theme === 'dark' ? 'bg-black/40 border-white/5 hover:border-[#C4B687]/30' : 'bg-white/80 border-zinc-200 hover:border-[#C4B687]/30')
        } 
        hover:scale-110 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(196,182,135,0.15)]`}
    >
      <div className="text-6xl group-hover:scale-125 transition-transform duration-500 drop-shadow-xl filter group-hover:drop-shadow-[0_0_15px_rgba(196,182,135,0.5)]">
        {icon}
      </div>
      <h3 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} ${featured ? '!text-[#C4B687]' : ''}`}>
        {title}
      </h3>
      <p className="text-[#C4B687] text-[8px] font-bold uppercase tracking-[0.2em] opacity-50 group-hover:opacity-100">
        {desc}
      </p>
      {featured && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C4B687] to-transparent animate-pulse"></div>}
    </div>
  );
}

function ServiceCard({ title, titleAr, color, textColor, icon, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden group p-6 rounded-2xl border-b-4 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer ${color}`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h4 className={`text-lg font-black uppercase tracking-tight ${textColor}`}>{title}</h4>
          <p className={`text-sm font-bold opacity-70 ${textColor}`}>{titleAr}</p>
        </div>
        <span className="text-4xl group-hover:scale-110 transition-transform">{icon}</span>
      </div>
      <div className="absolute top-0 right-0 w-20 h-20 bg-black/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
    </div>
  );
}
