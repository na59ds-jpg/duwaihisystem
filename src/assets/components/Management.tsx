import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { useApp } from "../../App";
import { GatePass } from "./GatePass";
import * as XLSX from 'xlsx';

/**
 * MASAR - Strategic Admin Portal (v6.0)
 * FULL PRODUCTION VERSION - NO SHORTCUTS.
 * FEATURE: Advanced Account Monitoring with Compact Table & Search.
 * FIXED: All Visibility issues in Light Mode (Text-Zinc-900).
 * FIXED: TS6133 Error (All functions connected).
 */

import { StructureItem, GateRecord, User, VisitorLog, Announcement } from "../../types";

// ... (Imports remain same)

export function Management() {
  const { user, theme, navigateTo, activeFilter, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const isSuperAdmin = user?.username === "admin" || user?.role === "Admin";
  const isLeader = user?.role === "Leader" || isSuperAdmin;

  const [activeSystem, setActiveSystem] = useState<any>("main");
  const [activeSubView, setActiveSubView] = useState<string>("list");

  // بيانات الهيكلية والحسابات
  const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
  const [securityGates, setSecurityGates] = useState<GateRecord[]>([]);
  const [portalUsers, setPortalUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); // State for announcements

  // محرك البحث والنماذج
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [gateNameAr, setGateNameAr] = useState("");
  const [gateNameEn, setGateNameEn] = useState("");
  const [staffForm, setStaffForm] = useState({ name: "", empId: "", password: "", gateId: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", priority: "Normal" }); // Announcement Form
  const [auditFilter, setAuditFilter] = useState<"موظف" | "مقاول">("موظف");

  useEffect(() => {
    if (activeFilter === "personnel") setActiveSystem("personnel");
    else if (activeFilter === "contractors") setActiveSystem("contractors");
    else if (activeFilter === "security_control") setActiveSystem("security_control");
    else if (activeFilter === "accounts_audit") setActiveSystem("accounts_audit");
    else if (activeFilter === "communications") setActiveSystem("communications"); // New filter

    else setActiveSystem("main");
    setActiveSubView("list");
  }, [activeFilter]);



  useEffect(() => {
    // 1. جلب الهيكل التنظيمي (أقسام وشركات)
    const unsubStructure = onSnapshot(query(collection(db, "structure"), orderBy("createdAt", "desc")), (snapshot) => {
      setStructureItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StructureItem)));
    });

    // 2. جلب بوابات الأمن
    const unsubGates = onSnapshot(collection(db, "security_gates"), (snapshot) => {
      setSecurityGates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GateRecord)));
    });

    // 3. جلب سجلات الحركات الميدانية
    const unsubLogs = onSnapshot(query(collection(db, "visitor_logs"), orderBy("timestamp", "desc")), (snapshot) => {
      setVisitorLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VisitorLog)));
    });

    // 4. جلب حسابات طاقم SOC (رجال الأمن)
    const unsubStaff = onSnapshot(collection(db, "employees_accounts"), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => u.role === 'Gate'));
    });

    // 5. جلب حسابات مستخدمي البوابة (الرقابة الخارجية)
    const unsubPortal = onSnapshot(collection(db, "portal_users"), (snap) => {
      setPortalUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });

    // 6. جلب التنبيهات الأمنية
    const unsubAnnounce = onSnapshot(query(collection(db, "security_announcements"), orderBy("createdAt", "desc")), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    });

    return () => { unsubStructure(); unsubGates(); unsubLogs(); unsubStaff(); unsubPortal(); unsubAnnounce(); };
  }, []);

  // دالة إعادة تفعيل الحساب
  const handleResetUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "portal_users", userId), { status: 'active', updatedAt: serverTimestamp() });
      alert(isRTL ? "تم إعادة تفعيل الحساب بنجاح ✅" : "Account Reset Successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Error resetting user");
    }
  };

  const handleExportData = () => {
    if (visitorLogs.length === 0) return alert(isRTL ? "لا توجد سجلات لتصديرها" : "No logs available");
    const data = visitorLogs.map(log => ({
      [isRTL ? "الاسم" : "Name"]: log.personName,
      [isRTL ? "النوع" : "Type"]: log.type,
      [isRTL ? "البوابة" : "Gate"]: log.gateId,
      [isRTL ? "التاريخ" : "Date"]: log.timestamp?.toDate().toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security_Logs");
    XLSX.writeFile(wb, `MASAR_Security_Logs_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleCreateNewGate = async () => {
    if (!gateNameAr.trim() || !gateNameEn.trim()) return alert(isRTL ? "يرجى تعبئة أسماء البوابة" : "Fill gate names");
    await addDoc(collection(db, "security_gates"), { nameAr: gateNameAr, nameEn: gateNameEn, createdAt: serverTimestamp() });
    setGateNameAr(""); setGateNameEn("");
    alert(isRTL ? "تم إنشاء البوابة بنجاح ✅" : "Gate Created ✅");
  };

  const handleActivateStaff = async () => {
    if (!staffForm.name || !staffForm.empId || !staffForm.password || !staffForm.gateId) return alert(isRTL ? "يرجى إكمال بيانات الحساب" : "Complete data");
    await addDoc(collection(db, "employees_accounts"), {
      name: staffForm.name, empId: staffForm.empId, pass: staffForm.password,
      gateId: staffForm.gateId, role: "Gate", createdAt: serverTimestamp()
    });
    setStaffForm({ name: "", empId: "", password: "", gateId: "" });
    alert(isRTL ? "تم تفعيل حساب رجل الأمن ✅" : "Gate Staff Activated ✅");
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) return alert(isRTL ? "يرجى تعبئة العنوان والمحتوى" : "Fill title and content");
    await addDoc(collection(db, "security_announcements"), {
      ...announcementForm,
      createdBy: user?.username || "Admin",
      createdAt: serverTimestamp()
    });
    setAnnouncementForm({ title: "", content: "", priority: "Normal" });
    alert(isRTL ? "تم نشر التنبيه بنجاح ✅" : "Announcement Published ✅");
  };

  if (!isLeader) return <div className="p-20 text-center font-[900] text-red-500 text-3xl italic animate-pulse">🚫 {isRTL ? "دخول غير مصرح به للمنطقة الإدارية" : "UNAUTHORIZED STRATEGIC ACCESS"}</div>;

  // منطق البحث والفلترة للحسابات
  const filteredPortalUsers = portalUsers.filter(u =>
    u.userType === auditFilter &&
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.empId?.includes(searchQuery))
  );

  return (
    <div className={`p-6 md:p-10 space-y-10 animate-view font-['Cairo'] relative z-10 ${isDark ? 'text-white' : 'text-zinc-900'}`} dir={isRTL ? "rtl" : "ltr"}>

      {/* هيدر التنقل الإستراتيجي */}
      <div className={`flex justify-between items-center p-8 rounded-[2.5rem] border shadow-2xl backdrop-blur-3xl transition-all ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-200 shadow-xl'}`}>
        <button
          onClick={() => { navigateTo("dashboard"); setActiveSystem("main"); setActiveSubView("list"); }}
          className="group flex items-center gap-4 text-[#C4B687] hover:scale-105 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl border border-[#C4B687]/30 flex items-center justify-center bg-[#C4B687]/5 group-hover:bg-[#C4B687] group-hover:text-black transition-all text-xl shadow-lg shadow-[#C4B687]/10">➔</div>
          <span className="text-[11px] font-[900] uppercase tracking-[0.2em]">{isRTL ? "العودة للرئيسية" : "Main Dashboard"}</span>
        </button>
        <div className={`text-left ${isRTL ? 'border-r-4 pr-8 text-right' : 'border-l-4 pl-8 text-left'} border-[#C4B687]`}>
          <p className="text-2xl font-[900] tracking-tighter">{isRTL ? "بوابة الإدارة الإستراتيجية" : "STRATEGIC COMMAND CENTER"}</p>
          <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.3em]">Operational Authority Level</p>
        </div>
      </div>

      {activeSystem === "main" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 animate-view">
          <AdminCard icon="🏢" title="شؤون الموظفين" desc="Internal Personnel" onClick={() => setActiveSystem('personnel')} theme={theme} />
          <AdminCard icon="🏗️" title="إدارة المقاولين" desc="Vendor Management" onClick={() => setActiveSystem('contractors')} theme={theme} />
          <AdminCard icon="🛡️" title="التحكم الأمني" desc="Gate & Field Control" onClick={() => setActiveSystem('security_control')} theme={theme} />
          <AdminCard icon="📢" title="لوحة التنبيهات" desc="Communication Center" onClick={() => setActiveSystem('communications')} theme={theme} />
          <AdminCard icon="👑" title="رقابة الحسابات" desc="Portal Accounts Audit" onClick={() => setActiveSystem('accounts_audit')} theme={theme} featured />
        </div>
      )}

      {/* 1. رقابة الحسابات (جدول البحث المدمج) */}
      {activeSystem === "accounts_audit" && (
        <div className="space-y-6 animate-view">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-2 p-1.5 bg-black/10 rounded-2xl border border-white/5 shadow-inner">
              <button onClick={() => setAuditFilter("موظف")} className={`px-10 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${auditFilter === 'موظف' ? 'bg-[#C4B687] text-black shadow-lg' : 'text-zinc-500 hover:text-[#C4B687]'}`}>{isRTL ? 'الموظفين' : 'Staff'}</button>
              <button onClick={() => setAuditFilter("مقاول")} className={`px-10 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${auditFilter === 'مقاول' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-500 hover:text-amber-600'}`}>{isRTL ? 'المقاولين' : 'Contractors'}</button>
            </div>

            <div className="relative w-full md:w-96 group">
              <input
                type="text"
                placeholder={isRTL ? "ابحث بالاسم أو الرقم الوظيفي..." : "Search name or ID..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all ${isDark ? 'bg-black/40 border-white/10 focus:border-[#C4B687] text-white' : 'bg-white border-zinc-100 focus:border-[#C4B687] text-zinc-900 shadow-lg'}`}
              />
            </div>
          </div>

          <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir={isRTL ? "rtl" : "ltr"}>
                <thead>
                  <tr className={`${isDark ? 'bg-white/5 text-[#C4B687]' : 'bg-zinc-50 text-zinc-500'} font-black text-[10px] uppercase tracking-widest`}>
                    <th className="p-6">المستخدم</th>
                    <th className="p-6">الرقم الوظيفي</th>
                    <th className="p-6">التبعية</th>
                    <th className="p-6">الحالة</th>
                    <th className="p-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-zinc-100'}`}>
                  {filteredPortalUsers.map(u => (
                    <tr key={u.id} className={`transition-all hover:scale-[0.995] ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#C4B687]/10 text-[#C4B687] flex items-center justify-center font-black shadow-inner">👤</div>
                          <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{u.name || u.fullName}</span>
                        </div>
                      </td>
                      <td className={`p-6 font-bold opacity-70`}>{u.empId}</td>
                      <td className={`p-6 text-[11px] font-black uppercase ${isDark ? 'text-[#C4B687]' : 'text-zinc-600'}`}>{u.affiliation}</td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {u.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Disabled')}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => handleResetUser(u.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all uppercase ${isDark ? 'bg-zinc-800 text-white hover:bg-[#C4B687]' : 'bg-zinc-100 text-zinc-600 hover:bg-[#C4B687] hover:text-black'}`}>إعادة تفعيل</button>
                          <button onClick={async () => { if (confirm(isRTL ? "حذف حساب المستخدم نهائياً؟" : "Delete?")) await deleteDoc(doc(db, "portal_users", u.id)); }} className="w-10 h-10 flex items-center justify-center bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. التحكم الأمني والسجلات */}
      {activeSystem === "security_control" && activeSubView === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-view">
          <AdminCard icon="🏗️" title="إدارة البوابات" desc="Field Gates" onClick={() => setActiveSubView('gates')} theme={theme} />
          <AdminCard icon="🛂" title="حسابات رجال الأمن" desc="SOC Field Staff" onClick={() => setActiveSubView('security_staff')} theme={theme} />
          <AdminCard icon="🎫" title="تصاريح الزوار" desc="Temporary Pass" onClick={() => setActiveSubView('visit_permits')} theme={theme} />
          <AdminCard icon="📊" title="تصدير السجلات" desc="Excel Export" onClick={handleExportData} theme={theme} />
        </div>
      )}

      {/* إدارة البوابات */}
      {activeSubView === "gates" && (
        <div className={`p-10 rounded-[3.5rem] border shadow-2xl animate-view ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-[900] text-[#C4B687] uppercase tracking-tighter">إضافة بوابة جديدة</h3>
              <input value={gateNameAr} onChange={e => setGateNameAr(e.target.value)} className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`} placeholder="اسم البوابة (عربي)" />
              <input value={gateNameEn} onChange={e => setGateNameEn(e.target.value)} className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`} placeholder="Gate Name (EN)" />
              <button onClick={handleCreateNewGate} className="w-full py-5 bg-[#C4B687] text-black rounded-2xl font-[900] shadow-xl hover:brightness-110 active:scale-95 transition-all">اعتماد البوابة +</button>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {securityGates.map(g => (
                <div key={g.id} className="p-6 rounded-2xl border border-white/5 flex justify-between items-center bg-white/5">
                  <span className={`font-[900] text-sm uppercase ${isDark ? 'text-white' : 'text-zinc-900'}`}>{g.nameAr}</span>
                  <button onClick={() => deleteDoc(doc(db, "security_gates", g.id))} className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center font-black">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* حسابات رجال الأمن */}
      {activeSubView === "security_staff" && (
        <div className={`p-10 rounded-[3.5rem] border shadow-2xl animate-view ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className={`space-y-5 p-10 rounded-[2.5rem] border-2 ${isDark ? 'bg-black/20 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
              <h3 className="text-xl font-[900] text-[#C4B687]">تفعيل حساب رجل أمن</h3>
              <input value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`} placeholder="الاسم الرباعي" />
              <input value={staffForm.empId} onChange={e => setStaffForm({ ...staffForm, empId: e.target.value })} className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`} placeholder="الرقم الوظيفي" />
              <input type="password" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`} placeholder="كلمة المرور" />
              <select value={staffForm.gateId} onChange={e => setStaffForm({ ...staffForm, gateId: e.target.value })} className={`w-full p-5 rounded-2xl border-2 outline-none font-[900] ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-100 text-zinc-900'}`}>
                <option value="">-- حدد البوابة --</option>
                {securityGates.map(g => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
              </select>
              <button onClick={handleActivateStaff} className="w-full py-5 bg-[#C4B687] text-black rounded-2xl font-[900] shadow-xl hover:brightness-110 active:scale-95 transition-all">تفعيل الحساب SOC ✅</button>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[500px]">
              {staff.map(u => (
                <div key={u.id} className="p-5 rounded-2xl border border-white/5 flex justify-between items-center bg-white/5">
                  <span className={`font-[900] text-sm uppercase ${isDark ? 'text-white' : 'text-zinc-900'}`}>{u.name} ({u.empId})</span>
                  <button onClick={async () => { if (confirm("Confirm?")) await deleteDoc(doc(db, "employees_accounts", u.id)); }} className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center font-black">✕</button>
                </div>
              ))}
            </div>



          </div>
        </div>
      )}

      {/* 3. هيكلة الأقسام والشركات (تصحيح النص الأبيض تماماً) */}
      {(activeSystem === "personnel" || activeSystem === "contractors") && activeSubView === "list" && (
        <div className={`p-10 rounded-[3.5rem] border shadow-2xl animate-view ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h3 className="text-xl font-[900] text-[#C4B687] uppercase tracking-tighter">إضافة للهيكل التنظيمي</h3>
              <input value={inputValue} onChange={e => setInputValue(e.target.value)} className={`w-full p-6 rounded-2xl border-2 text-center font-[900] text-lg outline-none transition-all ${isDark ? 'bg-black border-white/10 text-white focus:border-[#C4B687]' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#C4B687] shadow-inner'}`} placeholder="..." />
              <button onClick={async () => {
                if (!inputValue.trim()) return;
                const entryType = activeSystem === "personnel" ? "dept" : "comp";
                await addDoc(collection(db, "structure"), { name: inputValue.trim(), type: entryType, createdAt: serverTimestamp() });
                setInputValue("");
              }} className="w-full py-6 bg-[#C4B687] text-black rounded-[1.5rem] font-[900] text-xl shadow-xl hover:scale-105 active:scale-95 transition-all">إضافة +</button>
            </div>
            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.4em] mb-4">Official Units</p>
              {structureItems.filter(i => i.type === (activeSystem === "personnel" ? "dept" : "comp")).map(i => (
                <div key={i.id} className={`p-6 rounded-[2rem] border transition-all ${isDark ? 'bg-white/5 border-white/5 hover:border-[#C4B687]/40' : 'bg-zinc-50 border-zinc-200 shadow-sm hover:border-[#C4B687]'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${activeSystem === 'personnel' ? 'bg-blue-500' : 'bg-amber-600'} animate-pulse shadow-sm`}></div>
                      {/* تم تصحيح اللون هنا باستخدام متغير isDark لضمان الظهور باللون الأسود في الوضع الفاتح */}
                      <span className={`font-[900] text-sm uppercase tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>{i.name}</span>
                    </div>
                    <button onClick={() => { if (confirm("Confirm Delete?")) deleteDoc(doc(db, "structure", i.id)); }} className="text-red-500/40 hover:text-red-500 transition-colors font-black">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* 4. مركز التنبيهات والتعاميم */}
      {activeSystem === "communications" && (
        <div className={`p-10 rounded-[3.5rem] border shadow-2xl animate-view ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-[900] text-[#C4B687] uppercase tracking-tighter">إضافة تنبيه أمني</h3>
              <input
                value={announcementForm.title}
                onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`}
                placeholder="عنوان التنبيه"
              />
              <textarea
                value={announcementForm.content}
                onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                className={`w-full p-5 h-32 rounded-2xl border-2 outline-none font-bold resize-none ${isDark ? 'bg-black border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`}
                placeholder="نص التنبيه..."
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setAnnouncementForm({ ...announcementForm, priority: "Normal" })} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${announcementForm.priority === 'Normal' ? 'bg-[#C4B687] text-black' : 'bg-white/5 text-zinc-500'}`}>Normal</button>
                <button type="button" onClick={() => setAnnouncementForm({ ...announcementForm, priority: "High" })} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${announcementForm.priority === 'High' ? 'bg-red-600 text-white' : 'bg-white/5 text-zinc-500'}`}>URGENT ⚠️</button>
              </div>
              <button onClick={handleCreateAnnouncement} className="w-full py-5 bg-[#C4B687] text-black rounded-2xl font-[900] shadow-xl hover:brightness-110 active:scale-95 transition-all">نشر التنبيه 📢</button>
            </div>

            <div className="md:col-span-2 space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
              {announcements.map(a => (
                <div key={a.id} className={`p-6 rounded-[2rem] border relative group ${a.priority === 'High' ? 'bg-red-900/10 border-red-500/30' : (isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200')}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${a.priority === 'High' ? 'bg-red-500 text-white' : 'bg-[#C4B687]/20 text-[#C4B687]'}`}>
                      {a.priority === 'High' ? "URGENT" : "INFO"}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] opacity-40 font-bold">{a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : "---"}</span>
                      <button onClick={() => deleteDoc(doc(db, "security_announcements", a.id))} className="text-red-500/50 hover:text-red-500 transition-colors font-black text-lg">✕</button>
                    </div>
                  </div>
                  <h4 className={`text-lg font-black mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{a.title}</h4>
                  <p className={`text-xs font-medium leading-relaxed opacity-70 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{a.content}</p>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-center opacity-30 py-20 font-black">No Active Announcements</p>}
            </div>
          </div>
        </div>
      )}

      {activeSubView === "visit_permits" && <GatePass onBack={() => setActiveSubView('list')} />}
    </div>
  );
}

function AdminCard({ icon, title, desc, onClick, theme, featured = false }: any) {
  const isDark = theme === 'dark';
  return (
    <div onClick={onClick} className={`p-12 rounded-[3.5rem] border-2 cursor-pointer transition-all hover:scale-[1.05] shadow-2xl flex flex-col items-center text-center group relative overflow-hidden ${featured ? 'border-[#C4B687] bg-[#C4B687]/5 shadow-[#C4B687]/10' : (isDark ? 'bg-black/40 border-white/5 hover:border-[#C4B687]/50 shadow-black' : 'bg-white border-zinc-100 hover:border-[#C4B687] shadow-zinc-200 shadow-xl')}`}>
      {featured && <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#C4B687] to-transparent animate-pulse"></div>}
      <div className="text-7xl mb-8 group-hover:rotate-12 transition-transform duration-500 filter drop-shadow-2xl">{icon}</div>
      <h3 className={`text-xl font-[900] ${featured ? 'text-[#C4B687]' : (isDark ? 'text-zinc-200' : 'text-zinc-900')} uppercase mb-3 tracking-tighter`}>{title}</h3>
      <p className={`text-[10px] font-black opacity-40 uppercase tracking-[0.3em] leading-relaxed px-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{desc}</p>
    </div>
  );
}