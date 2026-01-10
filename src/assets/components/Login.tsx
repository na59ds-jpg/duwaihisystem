import { useState, useEffect } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase"; 
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, onSnapshot } from "firebase/firestore";

/**
 * MASAR PLATFORM - Al Duwaihi Gold Mine
 * FEATURE: Dynamic Affiliation (Dept/Company) during Registration.
 * FEATURE: Strict Account Separation (Portal Users vs. Staff).
 * FEATURE: Professional Quick Access PIN (Master Login).
 */

export function Login() {
  const { setUser, language, setLanguage, theme, setTheme } = useApp(); 
  const isRTL = language === 'ar';
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'main' | 'employee' | 'gate' | 'admin'>('main');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [targetAccount, setTargetAccount] = useState<any>(null);

  const [empIdLogin, setEmpIdLogin] = useState("");
  const [empPassword, setEmpPassword] = useState("");

  // قوائم الهيكلية المسترجعة من النظام
  const [departments, setDepartments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // بيانات التسجيل المحدثة لتشمل نوع المستخدم والتبعية
  const [regData, setRegData] = useState({ 
    name: "", 
    empId: "", 
    nationalId: "", 
    pass: "", 
    userType: "موظف", // موظف أو مقاول
    affiliation: ""   // القسم أو الشركة
  });

  const [recoveryData, setRecoveryData] = useState({ empId: "", nationalId: "", newPass: "" });
  
  const [showSupport, setShowSupport] = useState(false);
  const [supportType, setSupportType] = useState<"tech" | "security">("tech");
  const [ticket, setTicket] = useState({ name: "", empId: "", nationalId: "", message: "", issueType: "" });

  // جلب الأقسام والشركات ديناميكياً عند فتح شاشة التسجيل
  useEffect(() => {
    if (isRegistering) {
      const unsub = onSnapshot(collection(db, "structure"), (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDepartments(data.filter((i: any) => i.type === "dept"));
        setCompanies(data.filter((i: any) => i.type === "comp"));
      });
      return () => unsub();
    }
  }, [isRegistering]);

  // 1. دخول الإدارة (Admin Login) مع الرمز السريع الاحترافي
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");

    // --- منطق الرمز السريع الخاص بنواف ---
    const MASTER_PIN = "080012";
    if (username === MASTER_PIN) {
      const adminSession = { 
        name: "نواف الجعيد", 
        role: "Admin", 
        username: "deefullahna",
        isPersistent: true 
      };
      // حفظ الجلسة الدائمة (تذكرني)
      localStorage.setItem("maaden_session", JSON.stringify(adminSession));
      setUser(adminSession);
      setLoading(false);
      return;
    }
    // ---------------------------------

    try {
      const q = query(collection(db, "users"), where("username", "==", username.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        if (userData.password === password) {
          const finalUser = { ...userData, id: snap.docs[0].id };
          localStorage.setItem("maaden_session", JSON.stringify(finalUser));
          setUser(finalUser);
        } else { setError(isRTL ? "كلمة المرور غير صحيحة" : "Incorrect Password"); }
      } else if (username === "deefullahna" && password === "Mm123321") {
        const admin = { name: "نواف الجعيد", role: "Admin", username: "deefullahna" };
        localStorage.setItem("maaden_session", JSON.stringify(admin));
        setUser(admin);
      } else { setError(isRTL ? "بيانات الدخول غير مسجلة" : "User Not Found"); }
    } catch { setError(isRTL ? "فشل الاتصال" : "Server Error"); }
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

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const q = query(collection(db, "portal_users"), where("empId", "==", recoveryData.empId.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const acc = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        if (acc.nationalId === recoveryData.nationalId.trim()) {
              setTargetAccount(acc);
              setRecoveryStep(2);
        } else { setError(isRTL ? "رقم الهوية لا يطابق المسجل لدينا" : "National ID Mismatch"); }
      } else { setError(isRTL ? "الرقم الوظيفي غير موجود" : "Employee ID not found"); }
    } catch { setError("Error"); }
    setLoading(false);
  };

  const handleFinalReset = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await updateDoc(doc(db, "portal_users", targetAccount.id), { pass: recoveryData.newPass });
      alert(isRTL ? "تم تحديث كلمة المرور بنجاح ✅" : "Password Updated ✅");
      setIsRecovering(false); setRecoveryStep(1); setRecoveryData({ empId: "", nationalId: "", newPass: "" });
    } catch { alert("Error"); }
    setLoading(false);
  };

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!regData.affiliation) return alert(isRTL ? "يرجى اختيار القسم أو الشركة" : "Select affiliation");
    
    setLoading(true);
    try {
      await addDoc(collection(db, "portal_users"), { 
        ...regData, 
        role: "Employee", 
        status: "active",
        createdAt: serverTimestamp() 
      });
      alert(isRTL ? "تم إنشاء حسابك بنجاح ✅ يمكنك الدخول الآن" : "Account Created Successfully ✅");
      setIsRegistering(false);
    } catch { setError("Error"); }
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
    <div className={`min-h-screen flex flex-col font-['Cairo'] relative transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} bg-transparent`} dir={isRTL ? "rtl" : "ltr"}>
      
      {/* Header */}
      <header className={`backdrop-blur-xl border-b p-6 flex justify-between items-center px-10 md:px-20 z-20 shadow-xl transition-all ${theme === 'dark' ? 'bg-black/60 border-[#C4B687]/20' : 'bg-white/80 border-zinc-200'}`}>
        <div className="flex items-center gap-6">
          <div className="bg-white p-2 rounded-xl shadow-md border border-[#C4B687]"><img src="/logo.png" alt="Logo" className="h-10" /></div>
          <div className={`${isRTL ? 'border-r-4 pr-6' : 'border-l-4 pl-6'} border-[#C4B687] text-right`}>
            <p className="text-[10px] font-black text-[#C4B687] tracking-[0.2em] uppercase opacity-90 leading-tight">
              {isRTL ? 'المنصة الأمنية الموحدة لمنجم الدويحي' : 'Unified Security Platform - Al Duwaihi Mine'}
            </p>
            <h1 className={`text-4xl font-[900] tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-zinc-900'} leading-none mt-1`}>
               مـسـار <span className="text-[#C4B687] mx-1">|</span> MASAR
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSupport(true)} className="px-4 py-2 bg-[#C4B687]/10 text-[#C4B687] border border-[#C4B687]/20 rounded-xl font-black text-[10px] hover:bg-[#C4B687] hover:text-black transition-all">
              🛠️ {isRTL ? "الدعم والبلاغات" : "Support"}
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-3 rounded-xl border transition-all font-bold text-xs ${theme === 'dark' ? 'bg-white/5 border-[#C4B687]/20' : 'bg-black/5 border-zinc-300'}`}>
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          <button onClick={() => setLanguage(isRTL ? 'en' : 'ar')} className="px-6 py-2 border border-[#C4B687] text-[#C4B687] rounded-xl font-bold text-xs hover:bg-[#C4B687] hover:text-black transition-all">
            {isRTL ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center z-10 p-6">
        {view === 'main' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl animate-in fade-in zoom-in duration-700">
            <MenuCard icon="📱" title={isRTL ? "بوابة الموظف" : "Employee Portal"} desc="Portal & Services" onClick={() => setView('employee')} theme={theme} />
            <MenuCard icon="👑" title={isRTL ? "مركز الإدارة" : "Command Center"} desc="System Admin" onClick={() => setView('admin')} featured theme={theme} />
            <MenuCard icon="🛡️" title={isRTL ? "بوابة الأمن" : "Security Gate"} desc="Field Control" onClick={() => setView('gate')} theme={theme} />
          </div>
        ) : (
          <div className={`w-full ${(view === 'employee' || view === 'gate') ? 'max-w-6xl' : 'max-w-md'} backdrop-blur-2xl rounded-3xl shadow-2xl border relative overflow-hidden flex animate-in slide-in-from-bottom-8 ${theme === 'dark' ? 'bg-black/80 border-[#C4B687]/20' : 'bg-white/90 border-zinc-200'}`}>
            
            {(view === 'employee' || view === 'gate') && (
              <div className="hidden lg:block w-[45%] border-e border-white/5">
                <SidebarGuidelines view={view} isRTL={isRTL} />
              </div>
            )}

            <div className={`flex-1 p-12 lg:p-16 flex flex-col justify-center relative`}>
              <button onClick={() => { setIsRegistering(false); setIsRecovering(false); setView('main'); setError(""); }} className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} group flex items-center gap-2 text-[#C4B687] hover:scale-105 transition-all z-50`}>
                <div className="w-10 h-10 rounded-full border border-[#C4B687]/40 flex items-center justify-center bg-[#C4B687]/5 hover:bg-[#C4B687]/20 transition-all shadow-lg">
                    <svg className={`w-5 h-5 ${isRTL ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </div>
              </button>
              
              <div className="max-w-sm mx-auto w-full">
                <h3 className={`text-2xl font-bold text-center mb-10 tracking-tight uppercase ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                  <span className="border-b-4 border-[#C4B687] pb-1 px-2">
                    {isRecovering ? (isRTL ? "استعادة" : "Recover") : (isRegistering ? (isRTL ? "حساب جديد" : "New Account") : (isRTL ? "دخول النظام" : "System Login"))}
                  </span>
                </h3>
                
                <form onSubmit={
                   isRecovering ? (recoveryStep === 1 ? handleVerifyRecovery : handleFinalReset) :
                   (view === 'admin' ? handleLogin : (isRegistering ? handleRegisterEmployee : handleEmployeeLogin))
                } className="space-y-5">
                  {isRecovering ? (
                    <>
                      {recoveryStep === 1 ? (
                        <>
                          <InputBox placeholder={isRTL ? "الرقم الوظيفي" : "Emp ID"} value={recoveryData.empId} onChange={(e:any) => setRecoveryData({...recoveryData, empId: e.target.value})} theme={theme} />
                          <InputBox placeholder={isRTL ? "رقم الهوية" : "National ID"} value={recoveryData.nationalId} onChange={(e:any) => setRecoveryData({...recoveryData, nationalId: e.target.value})} theme={theme} />
                        </>
                      ) : (
                        <InputBox type="password" placeholder={isRTL ? "كلمة المرور الجديدة" : "New Password"} value={recoveryData.newPass} onChange={(e:any) => setRecoveryData({...recoveryData, newPass: e.target.value})} theme={theme} />
                      )}
                    </>
                  ) : isRegistering ? (
                    <>
                      <div className="flex gap-2 mb-4 bg-black/20 p-1.5 rounded-2xl">
                        <button type="button" onClick={() => setRegData({...regData, userType: "موظف", affiliation: ""})} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${regData.userType === 'موظف' ? 'bg-[#C4B687] text-black' : 'text-zinc-500'}`}>{isRTL ? "موظف معادن" : "Maaden Staff"}</button>
                        <button type="button" onClick={() => setRegData({...regData, userType: "مقاول", affiliation: ""})} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${regData.userType === 'مقاول' ? 'bg-amber-600 text-white' : 'text-zinc-500'}`}>{isRTL ? "موظف مقاول" : "Contractor"}</button>
                      </div>

                      <select 
                        required
                        value={regData.affiliation}
                        onChange={(e) => setRegData({...regData, affiliation: e.target.value})}
                        className={`w-full p-4 rounded-xl font-black text-xs border outline-none transition-all mb-2 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-zinc-200 text-zinc-900'}`}
                      >
                        <option value="">-- {regData.userType === 'موظف' ? (isRTL ? "حدد القسم التابع له" : "Select Dept") : (isRTL ? "حدد شركة المقاولات" : "Select Company")} --</option>
                        {regData.userType === 'موظف' 
                          ? departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)
                          : companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                        }
                      </select>

                      <InputBox placeholder={isRTL ? "الاسم الكامل (كما في الهوية)" : "Full Name"} onChange={(e:any) => setRegData({...regData, name: e.target.value})} theme={theme} />
                      <InputBox placeholder={isRTL ? "الرقم الوظيفي" : "Employee ID"} onChange={(e:any) => setRegData({...regData, empId: e.target.value})} theme={theme} />
                      <InputBox placeholder={isRTL ? "رقم الهوية / الإقامة" : "National ID"} onChange={(e:any) => setRegData({...regData, nationalId: e.target.value})} theme={theme} />
                      <InputBox type="password" placeholder={isRTL ? "إنشاء كلمة المرور" : "Create Password"} onChange={(e:any) => setRegData({...regData, pass: e.target.value})} theme={theme} />
                    </>
                  ) : (
                    <>
                      <InputBox 
                        placeholder={view === 'admin' ? (isRTL ? "اسم المستخدم أو الرمز السريع" : "Username or Quick PIN") : (isRTL ? "الرقم الوظيفي" : "Emp ID")} 
                        value={view === 'admin' ? username : empIdLogin} 
                        onChange={(e:any) => view === 'admin' ? setUsername(e.target.value) : setEmpIdLogin(e.target.value)} 
                        theme={theme}
                      />
                      {/* عرض كلمة المرور فقط إذا لم يكن المستخدم يكتب الرمز السريع نواف */}
                      {!(view === 'admin' && username === "080012") && (
                        <InputBox 
                          type="password" 
                          placeholder={isRTL ? "كلمة المرور" : "Password"} 
                          value={view === 'admin' ? password : empPassword} 
                          onChange={(e:any) => view === 'admin' ? setPassword(e.target.value) : setEmpPassword(e.target.value)} 
                          theme={theme}
                        />
                      )}
                    </>
                  )}
                  {error && <p className="text-red-500 text-center text-xs font-bold animate-pulse">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full py-4 bg-[#C4B687] text-black rounded-xl font-bold text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all mt-4">
                    {loading ? "..." : (isRTL ? "تأكيد الدخول" : "Confirm Login")}
                  </button>
                  {!isRegistering && !isRecovering && view === 'employee' && (
                    <div className="flex flex-col gap-3 mt-8 text-center border-t border-white/5 pt-6">
                      <button type="button" onClick={() => setIsRegistering(true)} className={`text-xs font-medium hover:text-[#C4B687] transition-colors ${theme === 'dark' ? 'text-white/50' : 'text-zinc-500'}`}>{isRTL ? "موظف جديد؟ سجل الآن" : "New Employee? Register"}</button>
                      <button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors italic">{isRTL ? "نسيت كلمة المرور؟" : "Forgot Password?"}</button>
                    </div>
                  )}
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
                    <InputBox placeholder={isRTL ? "رقم الهوية / الإقامة *" : "ID Number"} value={ticket.nationalId} onChange={(e:any) => setTicket({...ticket, nationalId: e.target.value})} theme="dark" />
                    <select 
                      value={ticket.issueType}
                      onChange={e => setTicket({...ticket, issueType: e.target.value})} 
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
                    <InputBox placeholder={isRTL ? "الاسم الكامل *" : "Full Name"} value={ticket.name} onChange={(e:any) => setTicket({...ticket, name: e.target.value})} theme="dark" />
                    <InputBox placeholder={isRTL ? "الرقم الوظيفي *" : "Employee ID"} value={ticket.empId} onChange={(e:any) => setTicket({...ticket, empId: e.target.value})} theme="dark" />
                  </>
                )}
                <textarea 
                   placeholder={isRTL ? "تفاصيل إضافية..." : "Message details..."} 
                   rows={4} 
                   value={ticket.message}
                   onChange={e => setTicket({...ticket, message: e.target.value})} 
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

function InputBox({ type = "text", theme, ...props }: any) {
    return (
        <input 
            {...props} 
            type={type}
            className={`
                w-full p-4 rounded-xl border
                text-center font-bold focus:border-[#C4B687] 
                outline-none transition-all
                ${theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/[0.08]' 
                  : 'bg-black/5 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-black/[0.02]'
                }
                ${type === 'password' ? 'text-2xl tracking-[0.3em]' : 'text-base'}
            `} 
            required 
        />
    );
}

function SidebarGuidelines({ view, isRTL }: any) {
    const isGate = view === 'gate';
    return (
      <div className={`flex flex-col w-full h-full p-12 bg-black/40 backdrop-blur-md animate-in fade-in duration-1000`}>
        <p className="text-[#C4B687] font-bold text-[10px] uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
          <span className="w-10 h-[1px] bg-[#C4B687]"></span>
          {isGate ? (isRTL ? "بروتوكول الضبط الأمني" : "Security Protocol") : (isRTL ? "دليل استخدام البوابة" : "Portal Guidelines")}
        </p>
        <div className="space-y-8">
          {isGate ? (
            <>
              <GuidelineItem num="01" title={isRTL ? "مطابقة الهوية والأصول" : "ID & Document Verification"} desc={isRTL ? "يجب مطابقة الهوية الأصلية مع صور الهويات والتصاريح المرفقة إلكترونياً." : "Verify original IDs against digital attachments provided in the pass."} />
              <GuidelineItem num="02" title={isRTL ? "الفحص البصري للمركبة" : "Visual Vehicle Check"} desc={isRTL ? "التأكد من مطابقة رقم اللوحة ونوع المركبة لما هو مسجل في التصريح الرقمي." : "Ensure the license plate and vehicle type match the digital entry."} />
              <GuidelineItem num="03" title={isRTL ? "تفعيل الدخول (Activation)" : "Entry Activation"} desc={isRTL ? "الضغط على زر تفعيل الدخول فور عبور الزائر للحاجز الأمني لبدء الاحتساب." : "Click activate as soon as the visitor crosses the gate to start logging."} />
            </>
          ) : (
            <>
              <GuidelineItem num="01" title={isRTL ? "تطابق الهوية الرقمية" : "Identity Alignment"} desc={isRTL ? "يجب أن تتطابق البيانات مع الوثائق الرسمية؛ أي تباين سيؤدي لرفض الطلب." : "Data must match official documents; discrepancies result in rejection."} />
              <GuidelineItem num="02" title={isRTL ? "بروتوكول المرفقات" : "Attachment Standards"} desc={isRTL ? "يُشترط وضوح الصور الشخصية ووثائق المركبات لضمان معالجة الطلب." : "Photos and vehicle documents must be legible for processing."} />
              <GuidelineItem num="03" title={isRTL ? "المسؤولية القانونية" : "Legal Accountability"} desc={isRTL ? "الحساب شخصي وسري؛ المستخدم مسؤول عن كافة العمليات المنفذة." : "Accounts are confidential; users are responsible for all activities."} />
            </>
          )}
        </div>
      </div>
    );
}

function GuidelineItem({ num, title, desc }: any) {
  return (
    <div className="flex gap-6 items-start">
      <span className="text-[#C4B687] font-bold text-xl italic opacity-20">{num}</span>
      <div>
        <h4 className="font-bold text-base text-white mb-1 tracking-tight">{title}</h4>
        <p className="text-[10px] font-medium text-white/40 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function MenuCard({ icon, title, desc, onClick, featured = false, theme }: any) {
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