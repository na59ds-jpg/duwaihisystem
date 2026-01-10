import { useEffect, useState } from "react";
import { db } from "../../firebase"; 
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  addDoc, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Unified Request & Approval Center (SOC v6.0)
 * FEATURE: Archive Migration (ISD-F-001 & ISD-F-005).
 * FEATURE: Integrated Rejection Feedback Loop (REASON SAVING ENABLED).
 * FIXED: Requests vanish from Audit Center immediately after action.
 */

export function SupportTickets() {
  const { theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';
  
  const [activeTab, setActiveTab] = useState<"personnel" | "contractors">("personnel");
  const [requests, setRequests] = useState<any[]>([]); 
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // جلب الطلبات قيد المراجعة فقط للتدقيق والمطابقة الأمنية
    const q = query(
      collection(db, "employee_requests"), 
      where("status", "==", "قيد المراجعة"),
      orderBy("createdAt", "desc")
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // دالة الاعتماد والترحيل للأرشيف الرقمي المعتمد
  const handleApprove = async (request: any) => {
    const isID = request.type === "طلب بطاقة هوية";
    const promptMsg = isID 
        ? (isRTL ? "أدخل الرقم التسلسلي للبطاقة الذكية:" : "Enter Smart Card Serial:")
        : (isRTL ? "أدخل رقم استكر التصريح المطبوع:" : "Enter Printed Sticker No:");
    
    const serialNum = prompt(promptMsg);
    if (!serialNum) return;

    try {
      const archiveCollection = isID ? "work_id_cards" : "vehicle_permits";
      
      // 1. ترحيل البيانات للأرشيف المعتمد نهائياً (ليظهر في رادار البحث والتدقيق)
      await addDoc(collection(db, archiveCollection), { 
        ...request, 
        serialNumber: serialNum, 
        status: "Approved",
        approvedAt: serverTimestamp(),
        approvedBy: "SOC-Officer",
        idExpiryDate: request.idExpiryDate || request.expiryDate || null 
      });

      // 2. تحديث الطلب الأصلي ليظهر للموظف كطلب "تم الإصدار"
      await updateDoc(doc(db, "employee_requests", request.id), { 
        status: 'Approved',
        serialNumber: serialNum,
        processedAt: serverTimestamp()
      });
      
      alert(isRTL ? "تم ترحيل البيانات للأرشيف وإصدار التصريح بنجاح ✅" : "Data Archived & Permit Issued ✅");
    } catch (err) { 
      console.error(err);
      alert(isRTL ? "حدث خطأ أثناء الاعتماد" : "Error during approval"); 
    }
  };

  // دالة الرفض مع تقديم تغذية راجعة للموظف (فعالة الآن)
  const handleReject = async (id: string) => {
    const reason = prompt(isRTL ? "أدخل سبب الرفض (سيظهر في بوابة الموظف):" : "Enter rejection reason (visible to employee):");
    if (!reason) return;

    try {
      // تحديث الحالة وتخزين السبب لكي يظهر للموظف في بوابته
      await updateDoc(doc(db, "employee_requests", id), { 
        status: "مرفوض",
        rejectionReason: reason, // تخزين السبب هنا
        rejectedAt: serverTimestamp()
      });
      alert(isRTL ? "تم رفض الطلب وإبلاغ الموظف بالسبب ✅" : "Request rejected & reason sent to employee ✅");
    } catch (err) {
      console.error(err);
      alert("Error processing rejection");
    }
  };

  const filteredRequests = requests.filter(r => {
    const isContractor = r.category === "Contractor";
    return activeTab === "contractors" ? isContractor : !isContractor;
  });

  return (
    <div className="p-6 animate-view font-['Cairo'] relative z-10" dir={isRTL ? "rtl" : "ltr"}>
      
      {/* التوجيه والتحكم بالتبويبات */}
      <div className={`flex flex-col md:flex-row justify-between items-center mb-10 p-8 rounded-[2.5rem] shadow-2xl border backdrop-blur-md ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white/80 border-zinc-200'}`}>
        <div className="flex gap-4 p-2 rounded-2xl bg-black/10">
          <TabBtn active={activeTab === 'personnel'} label={isRTL ? "طلبات الموظفين" : "Staff Personnel"} onClick={() => setActiveTab("personnel")} theme={theme} />
          <TabBtn active={activeTab === 'contractors'} label={isRTL ? "طلبات المقاولين" : "Contractors"} onClick={() => setActiveTab("contractors")} theme={theme} />
        </div>
        <div className="text-center md:text-right mt-4 md:mt-0">
            <h2 className="text-xl font-black text-[#C4B687]">{isRTL ? "مركز تدقيق واعتماد الطلبات" : "Request Audit Center"}</h2>
            <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.3em]">Operational Security Command</p>
        </div>
      </div>

      <div className="grid gap-8">
        {filteredRequests.map(r => (
          <div key={r.id} className={`p-8 rounded-[3rem] border-2 shadow-2xl transition-all hover:border-[#C4B687]/50 ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
            <div className="flex flex-col lg:flex-row gap-8">
              
              <div className="w-full lg:w-32 h-40 rounded-3xl overflow-hidden bg-black/20 border-2 border-white/5 flex items-center justify-center shadow-inner">
                 {r.attachments && (r.attachments["صورة شخصية حديثة"] || r.attachments["Recent Photograph"] || r.attachments["photo"]) ? (
                    <img 
                      src={r.attachments["صورة شخصية حديثة"] || r.attachments["Recent Photograph"] || r.attachments["photo"]} 
                      alt="Personal"
                      className="w-full h-full object-cover cursor-zoom-in" 
                      onClick={() => setSelectedImage(r.attachments["صورة شخصية حديثة"] || r.attachments["Recent Photograph"] || r.attachments["photo"])}
                    />
                 ) : (
                    <span className="text-4xl">{r.type?.includes('مركبة') ? '🚗' : '👤'}</span>
                 )}
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="text-2xl font-black uppercase tracking-tight">{r.fullName}</h4>
                      <p className="text-[10px] font-black text-[#C4B687] uppercase tracking-widest">{r.nationality} | {r.jobTitle || r.position}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <span className={`px-4 py-1 rounded-full font-black text-[9px] uppercase ${r.type?.includes('هوية') ? 'bg-blue-600' : 'bg-amber-600'} text-white`}>
                        {r.type}
                      </span>
                      <p className="text-[8px] opacity-30 font-bold">
                        {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : "---"}
                      </p>
                   </div>
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                   <DataField label="Emp ID" value={r.empNo || r.employeeId} theme={theme} />
                   <DataField label="National ID" value={r.nationalId} theme={theme} />
                   <DataField label="Dept/Company" value={r.dept || r.companyName} theme={theme} />
                   <DataField label="Mobile" value={r.mobile || "---"} theme={theme} />
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                   {r.attachments && Object.entries(r.attachments).map(([name, url]: any) => (
                      <a key={name} href={url} target="_blank" rel="noreferrer" className={`px-4 py-2 border rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/10 hover:bg-[#C4B687] hover:text-black' : 'bg-zinc-100 border-zinc-200 hover:bg-[#C4B687]'}`}>
                         <span>📂</span> {name}
                      </a>
                   ))}
                </div>
              </div>

              <div className="flex flex-row lg:flex-col gap-3 justify-center border-l border-white/5 px-6">
                 <button onClick={() => handleApprove(r)} className="w-full lg:w-44 bg-emerald-600 text-white p-5 rounded-2xl font-black text-xs shadow-xl hover:brightness-110 active:scale-95 transition-all uppercase">إصدار واعتماد ✅</button>
                 <button onClick={() => handleReject(r.id)} className="text-red-500 font-black text-[9px] hover:underline uppercase tracking-tighter transition-all">رفض الطلب وإعادته ✕</button>
              </div>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="py-40 text-center opacity-20 font-black text-xl tracking-[1em] uppercase">
            {isRTL ? "لا توجد طلبات معلقة" : "System Clear"}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-10 animate-in fade-in zoom-in duration-300" onClick={() => setSelectedImage(null)}>
           <img src={selectedImage} alt="Preview" className="max-w-full max-h-full rounded-3xl shadow-2xl border-4 border-[#C4B687]/20" />
           <button className="absolute top-10 right-10 text-white text-5xl font-light hover:text-[#C4B687] transition-colors" onClick={() => setSelectedImage(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, label, onClick, theme }: any) {
    const isDark = theme === 'dark';
    return (
        <button 
          onClick={onClick} 
          className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${active ? 'bg-[#C4B687] text-black shadow-lg scale-105' : isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}
        >
          {label}
        </button>
    );
}

function DataField({ label, value, theme }: any) {
    const isDark = theme === 'dark';
    return (
        <div className="space-y-1">
            <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
            <p className={`font-black text-xs ${isDark ? 'text-white' : 'text-zinc-800'}`}>{value || '---'}</p>
        </div>
    );
}