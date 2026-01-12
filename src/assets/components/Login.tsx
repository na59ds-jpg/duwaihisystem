import { useState, useEffect } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, getDoc, query, where, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import type { StructureItem, TicketData, User } from "../../types";
import { ServiceRequestModal } from "./ServiceRequestModal";
import { AlertsSlider } from "./AlertsSlider";
import { Footer } from "./Footer";

export function Login() {
  const { setUser, language, setLanguage, theme } = useApp();
  const isRTL = language === 'ar';

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'main' | 'employee' | 'gate' | 'admin'>('main');

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceType, setServiceType] = useState<any>('employee_card');

  const [empIdLogin, setEmpIdLogin] = useState("");
  const [empPassword, setEmpPassword] = useState("");

  const [departments, setDepartments] = useState<StructureItem[]>([]);
  const [companies, setCompanies] = useState<StructureItem[]>([]);

  const [showSupport, setShowSupport] = useState(false);
  const [supportType, setSupportType] = useState<"tech" | "security">("tech");
  const [ticket, setTicket] = useState<TicketData>({ name: "", empId: "", nationalId: "", message: "", issueType: "" });

  const [vipPin, setVipPin] = useState("1990");
  const [adminCreds, setAdminCreds] = useState({ user: "admin", pass: "admin123" });

  useEffect(() => {
    const unsubStruct = onSnapshot(collection(db, "structure"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as StructureItem));
      setDepartments(data.filter((i) => i.type === "dept"));
      setCompanies(data.filter((i) => i.type === "comp"));
    });

    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "system_settings", "config"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.vip_pin) setVipPin(data.vip_pin);
          if (data.username && data.password) setAdminCreds({ user: data.username, pass: data.password });
        }
      } catch (e) { console.error("Config Fetch Error", e); }
    };
    fetchConfig();

    return () => { unsubStruct(); };
  }, []);

  const handleOpenService = (type: string) => {
    setServiceType(type);
    setShowServiceModal(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // جلب أحدث الإعدادات من قاعدة البيانات لضمان تزامن الـ PIN المحدث
      const configSnap = await getDoc(doc(db, "system_settings", "config"));
      let currentVipPin = vipPin;
      let currentAdminUser = adminCreds.user;
      let currentAdminPass = adminCreds.pass;

      if (configSnap.exists()) {
        const cfg = configSnap.data();
        currentVipPin = cfg.vip_pin || vipPin;
        currentAdminUser = cfg.username || adminCreds.user;
        currentAdminPass = cfg.password || adminCreds.pass;
      }

      const inputVal = username.trim();
      const systemPin = String(currentVipPin).trim();

      // --- [تفعيل الدخول السريع]: التحقق من VIP PIN ---
      if (inputVal === systemPin) {
        const adminSession: User = {
          id: "admin_vip",
          name: "نواف الجعيد",
          role: "Admin",
          username: currentAdminUser,
          isPersistent: true
        };
        localStorage.setItem("maaden_session", JSON.stringify(adminSession));
        setUser(adminSession);
        setLoading(false);
        return;
      }

      // --- الدخول التقليدي (يوزر وباسوورد المسؤول) ---
      if (inputVal === currentAdminUser && password === currentAdminPass) {
        const admin: User = { id: "admin_standard", name: "نواف الجعيد", role: "Admin", username: currentAdminUser };
        localStorage.setItem("maaden_session", JSON.stringify(admin));
        setUser(admin);
        setLoading(false);
        return;
      }

      // --- دخول مستخدمي لوحة التحكم الآخرين ---
      const q = query(collection(db, "users"), where("username", "==", inputVal));
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
    <div className={`min-h-screen flex flex-col font-['Cairo'] relative text-[var(--text-main)]`} dir={isRTL ? "rtl" : "ltr"}>

      {/* Header */}
      <header className={`backdrop-blur-md border-b border-[var(--royal-gold)]/20 p-6 flex justify-between items-center px-10 md:px-20 z-20 shadow-sm glass-card sticky top-0`}>
        <div className="flex items-center gap-6">
          <div className="bg-white/80 p-2 rounded-xl shadow-md border border-[var(--royal-gold)]"><img src="/logo.png" alt="Logo" className="h-12" /></div>
          <div className={`${isRTL ? 'border-r-4 pr-6' : 'border-l-4 pl-6'} border-[var(--royal-gold)] text-right`}>
            <p className="text-[10px] font-black text-[var(--royal-gold)] tracking-[0.2em] uppercase opacity-90 leading-tight">
              {isRTL ? 'المنصة الأمنية الموحدة لمنجم الدويحي' : 'Unified Security Platform - Al Duwaihi Mine'}
            </p>
            <h1 className={`text-4xl font-black text-[var(--text-main)] leading-none mt-1 tracking-wide font-['IBM_Plex_Sans_Arabic'] flex items-center`}>
              مـسـار
              <span className="text-[var(--royal-gold)] mx-3 text-3xl opacity-50 font-light">|</span>
              <span className="tracking-[0.3em] font-sans font-bold text-[var(--royal-gold)]">MASAR</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowSupport(true)} className="px-4 py-2 bg-[var(--royal-gold)]/10 text-[var(--royal-gold)] border border-[var(--royal-gold)]/20 rounded-xl font-black text-[10px] hover:bg-[var(--royal-gold)] hover:text-white transition-all">
            🛠️ {isRTL ? "الدعم والبلاغات" : "Support"}
          </button>
          <button onClick={() => setLanguage(isRTL ? 'en' : 'ar')} className="px-6 py-2 border border-[var(--royal-gold)] text-[var(--royal-gold)] rounded-xl font-bold text-xs hover:bg-[var(--royal-gold)] hover:text-white transition-all">
            {isRTL ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto pt-8 px-6 flex flex-col items-center">

        <div className="w-full mb-8">
          <AlertsSlider lang={language} />
        </div>

        <div className="w-full grid grid-cols-2 gap-6 mb-12 max-w-3xl">
          <MenuCard
            icon="👑"
            title={isRTL ? "مركز الإدارة" : "Command Center"}
            desc="Admin Access"
            onClick={() => setView('admin')}
            theme="light"
          />
          <MenuCard
            icon="🛡️"
            title={isRTL ? "بوابة الأمن" : "Security Gate"}
            desc="Field Access"
            onClick={() => setView('gate')}
            theme="light"
          />
        </div>

        <div className="w-full mb-12">
          <h3 className="text-center text-3xl font-black mb-10 text-[var(--royal-gold)] tracking-[0.3em] uppercase relative py-4">
            <span className="relative z-10 drop-shadow-[0_4px_8px_rgba(196,182,135,0.8)] filter">
              {isRTL ? "الخدمات الإلكترونية" : "E-Services"}
            </span>
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--royal-gold)]/30 to-transparent -z-0"></div>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              title="Employee Private Vehicle"
              titleAr="مركبة موظف (خاصة)"
              icon={<IconCar />}
              onClick={() => handleOpenService('private_vehicle')}
            />
            <ServiceCard
              title="Employee Company Vehicle"
              titleAr="مركبة موظف (شركة)"
              icon={<IconCompanyCar />}
              onClick={() => handleOpenService('company_vehicle')}
            />
            <ServiceCard
              title="Employee Badge"
              titleAr="إصدار بطاقة موظف"
              icon={<IconBadge />}
              onClick={() => handleOpenService('employee_card')}
            />
            <ServiceCard
              title="Contractor Private Vehicle"
              titleAr="مركبة مقاول (خاصة)"
              icon={<IconCarPlus />}
              onClick={() => handleOpenService('private_vehicle')}
            />
            <ServiceCard
              title="Contractor Company Vehicle"
              titleAr="مركبة مقاول (شركة)"
              icon={<IconTruck />}
              onClick={() => handleOpenService('contractor_vehicle')}
            />
            <ServiceCard
              title="Contractor Badge"
              titleAr="إصدار بطاقة مقاول"
              icon={<IconBadgePlus />}
              onClick={() => handleOpenService('contractor_card')}
            />
          </div>
        </div>

        <div className="mb-12">
          <button
            onClick={() => handleOpenService('inquiry')}
            className="group relative px-12 py-4 bg-white border-2 border-[var(--royal-gold)] rounded-full hover:bg-[var(--royal-gold)] transition-all duration-300 flex items-center gap-4 shadow-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:-translate-y-1"
          >
            <span className="text-2xl text-[var(--royal-gold)] group-hover:text-white transition-colors">🔍</span>
            <div className="text-left">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white/80 transition-colors">Check Status</p>
              <p className="text-lg font-black text-[var(--text-main)] font-['Tajawal'] leading-none group-hover:text-white transition-colors">مركز الاستعلام الموحد</p>
            </div>
          </button>
        </div>

      </main>

      <Footer lang={language} />

      {showServiceModal && (
        <ServiceRequestModal
          type={serviceType}
          onClose={() => setShowServiceModal(false)}
          departments={departments}
          companies={companies}
          theme={theme}
        />
      )}

      {(view === 'admin' || view === 'gate') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[10px] p-4 animate-in fade-in zoom-in-95 font-['Tajawal']">
          <div className="relative w-full max-w-md">
            <button onClick={() => setView('main')} className="absolute -top-12 right-0 text-zinc-400 hover:text-red-500 text-3xl font-black transition-colors">&times;</button>
            <div className={`p-10 rounded-[2.5rem] border border-[var(--royal-gold)]/30 shadow-[0_20px_60px_rgba(0,0,0,0.1)] bg-white/40 backdrop-blur-md relative overflow-hidden glass-card`}>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--royal-gold)] to-[#A3966D] shadow-[0_0_15px_rgba(196,182,135,0.6)]"></div>

              <h3 className="text-2xl font-black text-center text-[var(--text-main)] mb-2 uppercase tracking-tight flex flex-col items-center gap-2">
                <span className="text-4xl">{view === 'admin' ? "👑" : "🛡️"}</span>
                {view === 'admin' ? (isRTL ? "مركز الإدارة" : "Command Center") : (isRTL ? "البوابة الأمنية" : "Security Gate")}
              </h3>
              <p className="text-center text-[10px] font-bold text-zinc-500/80 mb-8 uppercase tracking-[0.2em]">Authorized Access Only</p>

              <form onSubmit={view === 'admin' ? handleLogin : handleEmployeeLogin} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">{view === 'admin' ? (isRTL ? "اسم المستخدم أو الرمز السريع" : "Username or VIP PIN") : (isRTL ? "الرقم الوظيفي" : "Emp ID")}</label>
                  <InputBox
                    placeholder=""
                    value={view === 'admin' ? username : empIdLogin}
                    onChange={e => view === 'admin' ? setUsername(e.target.value) : setEmpIdLogin(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">{isRTL ? "كلمة المرور" : "Password"}</label>
                  <InputBox
                    type="password"
                    placeholder=""
                    value={view === 'admin' ? password : empPassword}
                    onChange={e => view === 'admin' ? setPassword(e.target.value) : setEmpPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="bg-red-50/50 border border-red-200/50 p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <p className="text-red-700 text-[10px] font-black uppercase tracking-wide">{error}</p>
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-gradient-to-r from-[var(--royal-gold)] to-[#A3966D] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] mt-6 transition-all shadow-[0_10px_20px_rgba(196,182,135,0.3)] hover:shadow-[0_15px_30px_rgba(196,182,135,0.5)]">
                  {isRTL ? "تسجيل الدخول" : "Login System"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-gray-200 relative">
            <button onClick={() => setShowSupport(false)} className="absolute top-8 left-8 font-bold text-gray-400 hover:text-red-500 text-xl transition-colors">✕</button>
            <h3 className="text-2xl font-black mb-10 text-right text-gray-800 border-r-4 border-[var(--royal-gold)] pr-4 uppercase tracking-tighter">
              {isRTL ? "البلاغات والدعم الفني" : "Support & Reports"}
            </h3>

            <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-2xl">
              <button onClick={() => setSupportType("tech")} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${supportType === 'tech' ? 'bg-[var(--royal-gold)] text-white' : 'text-gray-500 hover:text-black'}`}>🔧 {isRTL ? "دعم تقني" : "Technical"}</button>
              <button onClick={() => setSupportType("security")} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${supportType === 'security' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-black'}`}>🛡️ {isRTL ? "بلاغ أمني" : "Security"}</button>
            </div>

            <div className="space-y-4">
              {supportType === "tech" ? (
                <>
                  <InputBox placeholder={isRTL ? "رقم الهوية / الإقامة *" : "ID Number"} value={ticket.nationalId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicket({ ...ticket, nationalId: e.target.value })} />
                  <select
                    value={ticket.issueType}
                    onChange={e => setTicket({ ...ticket, issueType: e.target.value })}
                    className="w-full p-4 bg-gray-50 rounded-xl text-right font-bold border border-gray-200 focus:border-[#C4B687] outline-none text-gray-800 text-xs appearance-none cursor-pointer"
                  >
                    <option value="" className="text-gray-500">-- {isRTL ? "اختر نوع المشكلة" : "Select Issue Type"} --</option>
                    <option value="تسجيل الدخول">{isRTL ? "مشكلة في تسجيل الدخول" : "Login Issue"}</option>
                    <option value="نسيان كلمة المرور">{isRTL ? "نسيان كلمة المرور" : "Forgot Password"}</option>
                    <option value="بيانات خاطئة">{isRTL ? "خطأ في بياناتي الشخصية" : "Data Error"}</option>
                    <option value="المرفقات">{isRTL ? "مشكلة في رفع المرفقات" : "Upload Error"}</option>
                  </select>
                </>
              ) : (
                <>
                  <InputBox placeholder={isRTL ? "الاسم الكامل *" : "Full Name"} value={ticket.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicket({ ...ticket, name: e.target.value })} />
                  <InputBox placeholder={isRTL ? "الرقم الوظيفي *" : "Employee ID"} value={ticket.empId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicket({ ...ticket, empId: e.target.value })} />
                </>
              )}
              <textarea
                placeholder={isRTL ? "تفاصيل إضافية..." : "Message details..."}
                rows={4}
                value={ticket.message}
                onChange={e => setTicket({ ...ticket, message: e.target.value })}
                className="w-full p-4 bg-gray-50 rounded-xl text-right font-medium border border-gray-200 focus:border-[#C4B687] outline-none resize-none text-gray-800 text-sm"
              />
            </div>

            <button onClick={handleSendSupport} disabled={loading} className={`w-full py-5 mt-8 rounded-2xl font-black text-lg shadow-xl hover:brightness-110 active:scale-95 transition-all ${supportType === 'tech' ? 'bg-[var(--royal-gold)] text-white' : 'bg-red-600 text-white'}`}>
              {loading ? "..." : (isRTL ? "إرسال الطلب" : "Send Request")}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Icons & Helper Components
const IconCar = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[var(--royal-gold)]" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l2-2m0 0l2-2 2 2m-2-2v10m9 4h2a2 2 0 002-2v-3a2 2 0 00-2-2h-3l-2.5-3.5H8.5L6 11H4a2 2 0 00-2 2v3a2 2 0 002 2h2m10 0v-4" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);
const IconCompanyCar = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[var(--royal-gold)]" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 100-4 2 2 0 000 4zm-2-2a2 2 0 100-4 2 2 0 000 4zm0-6a2 2 0 100-4 2 2 0 000 4zm2 2a2 2 0 100-4 2 2 0 000 4zm4-6a2 2 0 100-4 2 2 0 000 4zM7 21a2 2 0 00-2-2V5a2 2 0 002-2h10a2 2 0 002 2v14a2 2 0 00-2 2h-10z" />
  </svg>
);
const IconBadge = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[var(--royal-gold)]" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.56 1.636-1.323 1.995m4.638-1.995a2.002 2.002 0 01-1.323-1.995m0 0h.01M12 12h.01M15 15h.01M9 15h.01M9 12h.01M15 12h.01" />
  </svg>
);
const IconCarPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[var(--royal-gold)]" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[var(--royal-gold)]" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 3h15v13H1z" />
    <circle cx="3.5" cy="18.5" r="2.5" />
    <circle cx="13.5" cy="18.5" r="2.5" />
    <path d="M16 10h4l3 3v3h-7z" />
  </svg>
);
const IconBadgePlus = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[var(--royal-gold)]" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

function InputBox({ type = "text", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type={type}
      className={`w-full p-4 rounded-xl border border-gray-200 text-center font-bold focus:border-[#C4B687] outline-none transition-all bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white`}
      required
    />
  );
}

function MenuCard({ icon, title, desc, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/90 hover:border-[var(--royal-gold)] transition-all`}
    >
      <span className="text-4xl mb-2">{icon}</span>
      <h4 className="font-bold text-[var(--text-main)] text-sm">{title}</h4>
      <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">{desc}</p>
    </div>
  );
}

function ServiceCard({ title, titleAr, icon, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 rounded-2xl cursor-pointer flex items-center gap-4 transition-all group hover:bg-white hover:border-[var(--royal-gold)]`}
    >
      <div className="p-3 rounded-xl bg-[var(--royal-gold)]/5 text-[var(--royal-gold)] group-hover:bg-[var(--royal-gold)] group-hover:text-white transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-sm text-[var(--text-main)] leading-tight">{titleAr}</h4>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-[var(--royal-gold)] transition-colors">{title}</p>
      </div>
    </div>
  );
}