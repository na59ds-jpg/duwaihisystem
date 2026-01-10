import { useState, useEffect } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, where } from "firebase/firestore";
import { uploadToCloudinary } from "../../utils/cloudinary";

/**
 * Maaden Duwaihi Mine - Official Strategic Employee Portal (v6.0)
 * ALIGNED WITH: ISD-F-001 & ISD-F-005 Official Documents
 * FEATURE: Strict Validation & Rejection Feedback Display.
 */

const nationalities = [
  "السعودية", "مصر", "باكستان", "الهند", "بنغلاديش", "الفلبين", "نيبال", "سريلانكا",
  "اليمن", "السودان", "الأردن", "سوريا", "لبنان", "فلسطين", "الإمارات", "قطر", "الكويت",
  "البحرين", "عُمان", "العراق", "المغرب", "تونس", "الجزائر", "ليبيا", "موريتانيا",
  "الصومال", "جيبوتي", "جزر القمر", "أفغانستان", "فيتنام", "تايلاند", "تركيا", "إثيوبيا",
  "نيجيريا", "كينيا", "أوغندا", "إريتريا", "غانا", "جنوب أفريقيا", "الصين", "كوريا الجنوبية",
  "اليابان", "بريطانيا", "فرنسا", "ألمانيا", "إيطاليا", "إسبانيا", "روسيا", "أمريكا",
  "كندا", "أستراليا", "البرازيل", "المكسيك", "أندونيسيا", "ماليزيا", "أوزبكستان", "كازاخستان"
].sort((a, b) => a.localeCompare(b, 'ar'));

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

import type { StructureItem, RequestData, FormState } from "../../types";

export function EmployeePortal() {
  const { user, setUser, theme, language } = useApp();
  const isRTL = language === 'ar';
  const isDark = theme === 'dark';

  const [view, setView] = useState<"menu" | "form" | "history">("menu");
  const [activeService, setActiveService] = useState<"none" | "id_card" | "vehicle">("none");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [safetyAgreed, setSafetyAgreed] = useState(false);
  const [myRequests, setMyRequests] = useState<RequestData[]>([]);

  const [departments, setDepartments] = useState<StructureItem[]>([]);
  const [companies, setCompanies] = useState<StructureItem[]>([]);

  const [form, setForm] = useState<FormState>({
    category: "", requestType: "New", fullName: user?.name || "", jobTitle: "",
    empNo: "", grade: "", nationality: "السعودية", dateOfBirth: "", placeOfBirth: "",
    nationalId: "", idIssuePlace: "", idIssueDate: "", idExpiryDate: "",
    dept: "", section: "", companyName: "", mobile: "", bloodGroup: "",
    licenseType: "", licenseNo: "", licenseExpiry: "",
    plateNo: "", color: "", model: "", vehicleType: "Private", permitArea: "All Area"
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({});

  useEffect(() => {
    const qStructure = query(collection(db, "structure"));
    const unsubStructure = onSnapshot(qStructure, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as StructureItem));
      setDepartments(data.filter((i) => i.type === "dept"));
      setCompanies(data.filter((i) => i.type === "comp"));
    });

    const qReqs = query(collection(db, "employee_requests"), where("empNo", "==", user?.empId || user?.username || ""));
    const unsubReqs = onSnapshot(qReqs, (snap) => {
      setMyRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as RequestData)));
    });

    return () => { unsubStructure(); unsubReqs(); };
  }, [user]);

  const validateStep = () => {
    if (step === 1) {
      if (!form.requestType || !form.category) {
        alert(isRTL ? "يرجى اختيار نوع الطلب وتصنيف مقدم الطلب" : "Please select request type and category");
        return false;
      }
      if (form.category === "Employee" && !form.dept) {
        alert(isRTL ? "يرجى اختيار الإدارة التابعة لها" : "Please select your department");
        return false;
      }
      if (form.category === "Contractor" && !form.companyName) {
        alert(isRTL ? "يرجى اختيار اسم الشركة المتعاقدة" : "Please select company name");
        return false;
      }
    }

    if (step === 2) {
      const requiredFields = ["fullName", "empNo", "grade", "jobTitle", "nationalId", "dateOfBirth", "placeOfBirth", "bloodGroup", "mobile"];
      for (const field of requiredFields) {
        if (!form[field as keyof typeof form]) {
          alert(isRTL ? "جميع الحقول في هذه الخطوة إلزامية" : "All fields in this step are required");
          return false;
        }
      }

      if (form.nationalId.length !== 10) {
        alert(isRTL ? "رقم الهوية/الإقامة يجب أن يتكون من 10 أرقام" : "National ID must be exactly 10 digits");
        return false;
      }
      if (form.mobile.length !== 10) {
        alert(isRTL ? "رقم الجوال يجب أن يتكون من 10 أرقام (مثال: 05XXXXXXXX)" : "Mobile number must be exactly 10 digits");
        return false;
      }
    }

    if (step === 3 && activeService === "vehicle") {
      const vehicleFields = ["plateNo", "licenseNo", "model", "color"];
      for (const field of vehicleFields) {
        if (!form[field as keyof typeof form]) {
          alert(isRTL ? "يرجى إكمال بيانات المركبة" : "Please complete vehicle details");
          return false;
        }
      }
    }
    return true;
  };

  const getRequiredFiles = () => {
    if (activeService === "id_card") return [
      { id: "photo", label: isRTL ? "صورة شخصية حديثة" : "Recent Photograph" },
      { id: "id_copy", label: isRTL ? "صورة الهوية / الإقامة" : "Copy of National ID/Iqama" }
    ];
    if (activeService === "vehicle") return [
      { id: "v_lic", label: isRTL ? "نسخة من رخصة القيادة" : "Driving License" },
      { id: "v_reg", label: isRTL ? "نسخة من إستمارة المركبة" : "Vehicle Registration" },
      { id: "v_ins", label: isRTL ? "نسخة من تأمين المركبة" : "Vehicle Insurance" },
      { id: "m_id", label: isRTL ? "صورة من بطاقة معادن" : "Maaden ID Copy" }
    ];
    return [];
  };

  // Import the helper at the top (I will add the import in a separate block or assume it's added)
  // Replacing the inline function with a call to the helper
  // But first I need to add the import. 
  // Since replace_file_content replaces a block, I will replace the function definition with nothing (delete it) 
  // and add the import at the top.


  const handleSubmit = async () => {
    for (const field of getRequiredFiles()) {
      if (!files[field.id]) {
        alert(`${isRTL ? "يرجى رفع:" : "Please upload:"} ${field.label}`);
        return;
      }
    }

    if (!safetyAgreed) {
      alert(isRTL ? "يجب الموافقة على التعهد أولاً" : "Please agree to the declaration first");
      return;
    }

    setLoading(true);
    try {
      const urls: { [key: string]: string } = {};
      for (const field of getRequiredFiles()) {
        if (files[field.id]) {
          urls[field.label] = await uploadToCloudinary(files[field.id]!);
        }
      }

      await addDoc(collection(db, "employee_requests"), {
        ...form,
        type: activeService === "id_card" ? "طلب بطاقة هوية" : "طلب تصريح مركبة",
        attachments: urls,
        status: "قيد المراجعة",
        createdAt: serverTimestamp(),
      });

      alert(isRTL ? "تم إرسال طلبك بنجاح ✅" : "Request sent successfully ✅");
      setView("menu"); setStep(1); setSafetyAgreed(false);
      setForm({ ...form, fullName: user?.name || "", category: "", nationalId: "", mobile: "", empNo: "", jobTitle: "" });
    } catch (err) { alert("Error submitting request"); }
    finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen p-4 md:p-10 font-['Cairo'] relative z-10 ${isDark ? 'text-white' : 'text-zinc-900'}`} dir={isRTL ? "rtl" : "ltr"}>

      {/* Header Section */}
      <header className={`max-w-5xl mx-auto flex justify-between items-center mb-10 p-6 rounded-[2.5rem] border shadow-2xl backdrop-blur-xl ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white/80 border-zinc-200'}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl p-2 shadow-inner"><img src="/logo.png" className="w-full h-full object-contain" alt="Maaden" /></div>
          <div>
            <h1 className="text-xl font-black">{user?.name}</h1>
            <p className="text-[#C4B687] text-[10px] font-black uppercase tracking-widest opacity-60">Maaden Duwaihi Site Access Requests</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setView("history")} className="px-6 py-2 border border-[#C4B687] text-[#C4B687] rounded-xl font-black text-[10px] uppercase transition-all hover:bg-[#C4B687]/10">🔔 {isRTL ? 'طلباتي' : 'My Requests'}</button>
          <button onClick={() => setUser(null)} className="p-3 px-8 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 font-black text-[10px] uppercase transition-all hover:bg-red-500 hover:text-white">{isRTL ? 'خروج' : 'Logout'}</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pb-20">
        {view === "menu" && (
          <div className="grid md:grid-cols-2 gap-8 animate-view">
            <ServiceCard icon="🪪" title={isRTL ? "طلب بطاقة هوية" : "ID Card Request"} desc={isRTL ? "إصدار وتجديد بطاقة التعريف الشخصية" : "New/Renewal ID Request"} onClick={() => { setActiveService("id_card"); setView("form"); }} theme={theme} />
            <ServiceCard icon="🚗" title={isRTL ? "طلب تصريح مركبة" : "Vehicle Permit"} desc={isRTL ? "تصريح دخول المركبات للمنجم" : "Vehicle Entry Sticker"} onClick={() => { setActiveService("vehicle"); setView("form"); }} theme={theme} />
          </div>
        )}

        {view === "history" && (
          <div className="space-y-4 animate-view">
            <button onClick={() => setView("menu")} className="text-[#C4B687] font-black text-xs mb-4 flex items-center gap-2">➔ {isRTL ? 'الرجوع للقائمة' : 'Back to Menu'}</button>
            {myRequests.length > 0 ? myRequests.map(req => (
              <div key={req.id} className={`p-6 rounded-3xl border flex flex-col gap-4 ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-200 shadow-sm'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-sm uppercase">{req.type}</h4>
                    <p className="text-[10px] opacity-50">{req.createdAt?.toDate ? new Date(req.createdAt.toDate()).toLocaleDateString() : "---"}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${req.status === 'مرفوض' ? 'bg-red-500 text-white' : req.status === 'Approved' || req.status === 'Issued' ? 'bg-emerald-500 text-white' : 'bg-[#C4B687] text-black'}`}>
                      {req.status === 'Approved' || req.status === 'Issued' ? (isRTL ? 'مكتمل' : 'Completed') : req.status}
                    </span>
                  </div>
                </div>

                {/* قسم سبب الرفض - يظهر فقط إذا كان الطلب مرفوضاً */}
                {req.status === 'مرفوض' && req.rejectionReason && (
                  <div className="p-4 bg-error/10 border border-error/20 rounded-2xl animate-pulse">
                    <p className="text-[10px] font-black text-error mb-1 flex items-center gap-2">
                      <span>⚠️</span> {isRTL ? "سبب الرفض من الإدارة:" : "Rejection Reason from SOC:"}
                    </p>
                    <p className="text-sm font-bold text-error leading-relaxed">
                      {req.rejectionReason}
                    </p>
                    <button onClick={() => { setActiveService(req.type.includes('هوية') ? 'id_card' : 'vehicle'); setView('form'); setStep(1); }} className="mt-3 text-[10px] font-black underline text-[#C4B687] uppercase">
                      {isRTL ? "تحديث وإعادة إرسال الطلب" : "Update & Resubmit"}
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-20 text-center">
                <p className="opacity-20 font-black italic text-xl tracking-widest">{isRTL ? "لا توجد سجلات سابقة" : "NO HISTORY FOUND"}</p>
              </div>
            )}
          </div>
        )}

        {view === "form" && (
          <div className={`p-8 md:p-12 rounded-[3rem] shadow-2xl border-t-[12px] border-[#C4B687] ${isDark ? 'bg-black/60 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
            <button onClick={() => { if (step > 1) setStep(step - 1); else setView("menu"); }} className="text-[#C4B687] font-black text-xs mb-8 flex items-center gap-2 group">
              ➔ {isRTL ? 'الرجوع' : 'Back'}
            </button>

            {step === 1 && (
              <div className="space-y-10 animate-view">
                <h2 className="text-2xl font-black">{isRTL ? 'معلومات الطلب' : 'Request Info'}</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <SelectionBox label={isRTL ? 'نوع الطلب *' : 'Request Type *'} options={[{ val: "New", lab: isRTL ? 'جديد' : 'New' }, { val: "Renewal", lab: isRTL ? 'تجديد' : 'Renewal' }, { val: "Lost", lab: isRTL ? 'بدل فاقد' : 'Lost' }]} current={form.requestType} onSelect={(v: any) => setForm({ ...form, requestType: v })} isDark={isDark} />
                  <SelectionBox label={isRTL ? 'تصنيف مقدم الطلب *' : 'Applicant Type *'} options={[{ val: "Employee", lab: isRTL ? 'موظف معادن' : 'Maaden Staff' }, { val: "Contractor", lab: isRTL ? 'موظف مقاول' : 'Contractor' }]} current={form.category} onSelect={(v: any) => setForm({ ...form, category: v })} isDark={isDark} />
                </div>
                {form.category && (
                  <div className="animate-view">
                    <label className="text-[10px] font-black text-zinc-500 mb-3 block uppercase tracking-widest">{form.category === "Employee" ? (isRTL ? 'الإدارة التابعة لها *' : 'Department *') : (isRTL ? 'اسم الشركة المتعاقدة *' : 'Company Name *')}</label>
                    <select value={form.dept || form.companyName} onChange={(e) => setForm({ ...form, dept: e.target.value, companyName: e.target.value })} className={`w-full p-5 rounded-2xl font-black text-sm outline-none border-2 transition-all ${isDark ? 'bg-black border-white/5 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'}`}>
                      <option value="">-- {isRTL ? 'اختر من القائمة المعتمدة' : 'Select'} --</option>
                      {form.category === "Employee" ? departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>) : companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid md:grid-cols-3 gap-6 animate-view">
                <Input label={isRTL ? "الاسم الكامل (حسب الهوية) *" : "Full Name *"} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} isDark={isDark} />
                <Input label={isRTL ? "الرقم الوظيفي *" : "Employee No. *"} value={form.empNo} onChange={(v) => setForm({ ...form, empNo: v })} isDark={isDark} />
                <Input label={isRTL ? "الدرجة الوظيفية *" : "Grade *"} value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} isDark={isDark} />
                <Input label={isRTL ? "المسمى الوظيفي *" : "Job Title *"} value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} isDark={isDark} />
                <Input label={isRTL ? "رقم الهوية / الإقامة (10 أرقام) *" : "ID / Iqama No. (10 digits) *"} value={form.nationalId} onChange={(v) => setForm({ ...form, nationalId: v })} isDark={isDark} type="number" />
                <Input label={isRTL ? "رقم الجوال (10 أرقام) *" : "Mobile No. (10 digits) *"} value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} isDark={isDark} type="number" />
                <Input label={isRTL ? "تاريخ الميلاد *" : "Date of Birth *"} value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} isDark={isDark} type="date" />
                <Input label={isRTL ? "مكان الميلاد *" : "Place of Birth *"} value={form.placeOfBirth} onChange={(v) => setForm({ ...form, placeOfBirth: v })} isDark={isDark} />
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">{isRTL ? "الجنسية *" : "Nationality *"}</label>
                  <select value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} className={`w-full p-4 rounded-xl font-black text-sm border-2 ${isDark ? 'bg-black text-white border-white/10' : 'bg-zinc-50 border-zinc-100 text-zinc-900'}`}>
                    {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-red-500 uppercase">{isRTL ? "فصيلة الدم *" : "Blood Group *"}</label>
                  <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} className={`w-full p-4 rounded-xl font-black text-sm border-2 ${isDark ? 'bg-black border-white/10 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'}`}>
                    <option value="">--</option>
                    {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 3 && activeService === "vehicle" && (
              <div className="grid md:grid-cols-3 gap-6 animate-view">
                <Input label={isRTL ? "رقم اللوحة *" : "Plate No. *"} value={form.plateNo} onChange={(v) => setForm({ ...form, plateNo: v })} isDark={isDark} />
                <Input label={isRTL ? "رقم الرخصة *" : "License No. *"} value={form.licenseNo} onChange={(v) => setForm({ ...form, licenseNo: v })} isDark={isDark} />
                <Input label={isRTL ? "الموديل (سنة الصنع) *" : "Model *"} value={form.model} onChange={(v) => setForm({ ...form, model: v })} isDark={isDark} />
                <Input label={isRTL ? "اللون *" : "Color *"} value={form.color} onChange={(v) => setForm({ ...form, color: v })} isDark={isDark} />
              </div>
            )}

            <div className="mt-12 space-y-8">
              {step < (activeService === "vehicle" ? 3 : 2) ? (
                <button onClick={() => { if (validateStep()) setStep(step + 1); }} className="w-full py-5 bg-[#C4B687] text-black rounded-2xl font-[900] text-lg shadow-xl shadow-[#C4B687]/10 transition-all active:scale-95">متابعة ➔</button>
              ) : (
                <div className="space-y-8 animate-view">
                  <div className="grid grid-cols-2 gap-6">
                    {getRequiredFiles().map(f => (
                      <div key={f.id} className="relative h-44 rounded-[2.5rem] border-2 border-dashed border-[#C4B687]/30 flex flex-col items-center justify-center bg-[#C4B687]/5 hover:bg-[#C4B687]/10 transition-all shadow-inner">
                        <span className="text-4xl">{files[f.id] ? "✅" : "📤"}</span>
                        <p className="text-[10px] font-[900] uppercase mt-3 text-center px-4 opacity-70">{f.label}</p>
                        <input type="file" accept=".jpg,.png,.pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setFiles({ ...files, [f.id]: e.target.files[0] })} />
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-red-600/5 rounded-3xl border border-red-600/20 shadow-inner">
                    <h4 className="font-black text-red-600 text-sm mb-3 flex items-center gap-2"><span>🚨</span> {isRTL ? 'التعهد القانوني والجزاءات' : 'Legal Agreement & Penalties'}</h4>
                    <p className="text-[9px] font-[900] text-red-500/80 leading-relaxed mb-4">
                      {isRTL ? 'أتعهد بالمحافظة على بطاقة الشركة وأتحمل المسؤولية القانونية عند فقدانها. أقر باطلاعي على جزاءات فقدان البطاقة التي تشمل حسم أجر يومين للموظفين أو غرامة 500 ريال للمقاولين.' : 'I agree to maintain safe possession of this card. I understand that loss due to neglect results in 2 days pay deduction for employees or 500 SR fine for contractors.'}
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={safetyAgreed} onChange={e => setSafetyAgreed(e.target.checked)} className="w-6 h-6 accent-red-600 rounded-lg" />
                      <span className="text-[10px] font-black uppercase group-hover:text-red-500 transition-colors">{isRTL ? 'أوافق وأقر بجميع الشروط والجزاءات المذكورة' : 'I accept all terms and conditions'}</span>
                    </label>
                  </div>

                  <button onClick={() => { if (validateStep()) handleSubmit(); }} disabled={!safetyAgreed || loading} className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                    {loading ? "..." : (isRTL ? 'إرسال الطلب رسمياً ✅' : 'Official Submission ✅')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Helpers
interface ServiceCardProps {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
  theme: string;
}

function ServiceCard({ icon, title, desc, onClick, theme }: ServiceCardProps) {
  const isDark = theme === 'dark';
  return (
    <button onClick={onClick} className={`p-14 rounded-[3.5rem] border transition-all text-center group flex flex-col items-center justify-center gap-6 ${isDark ? 'bg-black/40 border-white/5 hover:border-[#C4B687] shadow-black' : 'bg-white border-zinc-100 shadow-xl hover:border-[#C4B687]'}`}>
      <span className="text-8xl group-hover:scale-110 transition-transform duration-500">{icon}</span>
      <div className="space-y-2">
        <h3 className="text-2xl font-black">{title}</h3>
        <p className="text-[#C4B687] text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{desc}</p>
      </div>
    </button>
  );
}

interface SelectionBoxProps {
  label: string;
  options: { val: string; lab: string }[];
  current: string;
  onSelect: (val: string) => void;
  isDark: boolean;
}

function SelectionBox({ label, options, current, onSelect, isDark }: SelectionBoxProps) {
  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-zinc-500 uppercase block tracking-widest">{label}</label>
      <div className="grid grid-cols-3 gap-4">
        {options.map((opt) => (
          <button key={opt.val} type="button" onClick={() => onSelect(opt.val)} className={`p-5 rounded-2xl font-black text-[10px] border-2 transition-all uppercase shadow-sm ${current === opt.val ? 'border-[#C4B687] bg-[#C4B687]/10 text-[#C4B687] scale-105' : (isDark ? 'border-white/5 bg-white/5 text-zinc-500 hover:bg-white/10' : 'border-zinc-50 bg-zinc-50 text-zinc-400 hover:bg-zinc-100')}`}>{opt.lab}</button>
        ))}
      </div>
    </div>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  isDark: boolean;
  type?: string;
}

function Input({ label, value, onChange, isDark, type = "text" }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
          if (type === "number" && e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10);
        }}
        className={`p-4 border-2 rounded-2xl font-black text-sm outline-none transition-all shadow-inner ${isDark ? 'bg-black border-white/5 text-white focus:border-[#C4B687]' : 'bg-zinc-50 border-zinc-100 text-zinc-900 focus:border-[#C4B687]'}`}
      />
    </div>
  );
}