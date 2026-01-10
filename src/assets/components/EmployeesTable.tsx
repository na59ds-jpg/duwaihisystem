import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where, addDoc, orderBy, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Manpower Inventory (Staff)
 * FEATURE: Clean Nomenclature & Official Enrollment by Department.
 * NO SHORTCUTS: Full Nationalities & Blood Groups.
 */

const nationalities = [
  "السعودية", "مصر", "باكستان", "الهند", "بنغلاديش", "الفلبين", "نيبال", "سريلانكا",
  "اليمن", "السودان", "الأردن", "سوريا", "لبنان", "فلسطين", "الإمارات", "قطر", "الكويت",
  "البحرين", "عُمان", "العراق", "المغرب", "تونس", "الجزائر", "ليبيا", "موريتانيا",
  "الصومال", "جيبوتي", "جزر القمر", "أفغانستان", "فيتنام", "تايلاند", "تركيا", "إثيوبيا",
  "نيجيريا", "كينيا", "أوغندا", "إريتريا", "غانا", "جنوب أفريقيا", "الصين", "كوريا الجنوبية",
  "اليابان", "بريطانيا", "فرنسا", "ألمانيا", "إيطاليا", "إسبانيا", "روسيا", "أمريكا",
  "كندا", "أستراليا", "البرازيل", "المكسيك", "أندونيسيا", "ماليزيا"
].sort();

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function EmployeesTable({ filterDeptId }: { filterDeptId?: string | null }) {
  const { user, navigateTo, theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  // صلاحية الحصر للمدير والقادة فقط
  const canManage = user?.username === "admin" || user?.role === "Admin" || user?.role === "Leader";

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(filterDeptId || null);
  const [openForm, setOpenForm] = useState(false);

  // حقول الحصر الرسمية
  const [form, setForm] = useState({
    fullName: "", jobTitle: "", empNo: "", grade: "",
    nationality: "السعودية", birthDate: "", birthPlace: "",
    idNo: "", idPlace: "", idIssueDate: "", idExpiry: "",
    section: "", mobile: "", bloodGroup: ""
  });

  const inputStyle = `w-full p-4 border rounded-2xl outline-none focus:border-[#C4B687] font-black transition-all text-sm ${isDark ? 'bg-black/60 border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'}`;

  useEffect(() => {
    // جلب هيكلة الأقسام لربط الموظفين بها
    const unsubDepts = onSnapshot(query(collection(db, "structure"), where("type", "==", "dept"), orderBy("name", "asc")), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // جلب قائمة الموظفين حسب القسم المختار (نظام المجلدات)
    const q = selectedDeptId
      ? query(collection(db, "employees"), where("deptId", "==", selectedDeptId))
      : query(collection(db, "employees"), orderBy("createdAt", "desc"));

    const unsubEmployees = onSnapshot(q, (s) => setEmployees(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubDepts(); unsubEmployees(); };
  }, [selectedDeptId]);

  const saveToInventory = async () => {
    if (!selectedDeptId) return alert(isRTL ? "⚠️ يجب اختيار القسم أولاً" : "⚠️ Select Dept First");
    if (!form.fullName || !form.empNo || !form.idNo) return alert(isRTL ? "⚠️ يرجى إكمال الحقول الأساسية" : "⚠️ Complete missing fields");

    try {
      const deptName = departments.find(d => d.id === selectedDeptId)?.name || "";
      await addDoc(collection(db, "employees"), {
        ...form,
        deptId: selectedDeptId,
        deptName: deptName,
        createdAt: serverTimestamp(),
        inventoryStatus: "Registered"
      });
      setOpenForm(false);
      alert(isRTL ? "تم حصر الموظف بنجاح ✅" : "Staff added to registry ✅");
    } catch { alert("Database Error"); }
  };

  return (
    <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'} animate-in fade-in duration-500 font-['Cairo'] relative z-10`} dir={isRTL ? "rtl" : "ltr"}>

      {/* هيدر شاشة الحصر - مسميات نظيفة */}
      <div className={`flex flex-col md:flex-row justify-between items-center mb-10 p-8 rounded-[2.5rem] border shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white/80 border-zinc-200'}`}>
        <div className={`${isRTL ? 'border-r-8' : 'border-l-8'} border-[#C4B687] ${isRTL ? 'pr-6' : 'pl-6'}`}>
          <h2 className={`text-2xl font-[900] ${isDark ? 'text-white' : 'text-zinc-900'}`}>{isRTL ? "شؤون الموظفين" : "Personnel Affairs"}</h2>
          <p className="text-[#C4B687] font-black text-[9px] uppercase tracking-widest opacity-70">Unified Security Operations Command</p>
        </div>
        <button onClick={() => navigateTo("dashboard")} className="w-11 h-11 rounded-xl bg-[#C4B687]/10 flex items-center justify-center border border-[#C4B687]/30 text-[#C4B687] hover:scale-110">
          <svg className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
      </div>

      {/* شريط اختيار القسم - نظام المجلدات */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
        <div onClick={() => setSelectedDeptId(null)} className={`p-4 rounded-2xl border-2 cursor-pointer text-center transition-all ${!selectedDeptId ? 'border-[#C4B687] bg-[#C4B687]/10 scale-105' : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-100')}`}>
          <span className="font-black text-[10px] uppercase">{isRTL ? "كافة الأقسام" : "All Depts"}</span>
        </div>
        {departments.map(dept => (
          <div key={dept.id} onClick={() => setSelectedDeptId(dept.id)} className={`p-4 rounded-2xl border-2 cursor-pointer text-center transition-all ${selectedDeptId === dept.id ? 'border-[#C4B687] bg-[#C4B687]/10 scale-105' : (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-100')}`}>
            <span className="font-black text-[10px] uppercase">{dept.name}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {canManage && selectedDeptId && (
          <button onClick={() => setOpenForm(true)} className="bg-[#C4B687] text-black p-5 px-12 rounded-2xl font-[900] text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all">+ إضافة موظف داخل القسم</button>
        )}

        <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden backdrop-blur-xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
          <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className={`text-[#C4B687] text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'bg-black/60' : 'bg-zinc-900'}`}>
                <th className="p-6">بيانات الموظف</th>
                <th className="p-6 text-center">الرقم الوظيفي</th>
                <th className="p-6 text-center">رقم الهوية / الإقامة</th>
                <th className="p-6 text-left">الإجراء</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-zinc-100'}`}>
              {employees.length > 0 ? employees.map(e => (
                <tr key={e.id} className="hover:bg-white/5 transition-all group">
                  <td className="p-6">
                    <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{e.fullName}</div>
                    <div className="text-[9px] text-[#C4B687] font-bold uppercase">{e.jobTitle} | {e.deptName}</div>
                  </td>
                  <td className="p-6 text-center font-black italic text-[#C4B687]">{e.empNo}</td>
                  <td className="p-6 text-center font-mono text-xs opacity-60">{e.idNo}</td>
                  <td className="p-6 text-left">
                    {canManage && <button onClick={() => { if (window.confirm(isRTL ? "شطب من الحصر؟" : "Delete?")) deleteDoc(doc(db, "employees", e.id)) }} className="text-red-500/50 hover:text-red-500 transition-colors">✕</button>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-10 text-center opacity-30 font-black uppercase tracking-widest text-xs">
                    {isRTL ? "لا يوجد موظفون محصورون في هذا القسم" : "No staff enrolled in this department"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة الحصر اليدوي */}
      {openForm && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 z-[999] animate-in zoom-in duration-300">
          <div className={`p-10 rounded-[3.5rem] w-full max-w-5xl border-t-[12px] border-[#C4B687] shadow-2xl relative ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
            <h3 className="text-2xl font-black mb-10 text-[#C4B687] uppercase border-b border-[#C4B687]/10 pb-5">
              {isRTL ? "تسجيل موظف جديد" : "Enroll New Staff"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <Input label="الاسم الرباعي" value={form.fullName} onChange={(v: any) => setForm({ ...form, fullName: v })} style={inputStyle} />
              <Input label="المسمى الوظيفي" value={form.jobTitle} onChange={(v: any) => setForm({ ...form, jobTitle: v })} style={inputStyle} />
              <Input label="الرقم الوظيفي" value={form.empNo} onChange={(v: any) => setForm({ ...form, empNo: v })} style={inputStyle} />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase pr-1">الجنسية</label>
                <select value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} className={inputStyle}>
                  {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <Input label="رقم الهوية / الإقامة" value={form.idNo} onChange={(v: any) => setForm({ ...form, idNo: v })} style={inputStyle} />
              <Input label="تاريخ انتهاء الهوية" type="date" value={form.idExpiry} onChange={(v: any) => setForm({ ...form, idExpiry: v })} style={inputStyle} />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase pr-1">فصيلة الدم</label>
                <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} className={inputStyle}>
                  <option value="">--</option>
                  {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <Input label="رقم الجوال" value={form.mobile} onChange={(v: any) => setForm({ ...form, mobile: v })} style={inputStyle} />
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={saveToInventory} className="flex-1 bg-[#C4B687] text-black py-5 rounded-2xl font-[900] text-lg hover:brightness-110 shadow-2xl transition-all">اعتماد الحصر ✅</button>
              <button onClick={() => setOpenForm(false)} className="px-12 py-5 bg-white/5 text-zinc-500 rounded-2xl font-black hover:bg-red-500/10 hover:text-red-500 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, style, type = "text" }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-zinc-500 uppercase pr-2">{label}</label>
      <input type={type} autoComplete="off" value={value} onChange={e => onChange(e.target.value)} className={style} />
    </div>
  );
}