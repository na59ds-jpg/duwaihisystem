import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy 
} from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Contractor Management Module (v6.0)
 * Function: Management of vendor companies and their enrolled labor.
 */

export default function CompanyManager() {
  const { theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [newCompName, setNewCompName] = useState("");

  // 1. جلب شركات المقاولات من الهيكل التنظيمي (النوع: comp)
  useEffect(() => {
    const q = query(
      collection(db, "structure"), 
      where("type", "==", "comp"), 
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب العمالة بناءً على معرف الشركة المختار
  useEffect(() => {
    if (selectedCompId) {
      const q = query(
        collection(db, "contractors"), 
        where("companyId", "==", selectedCompId)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setContractors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    } else {
      setContractors([]);
    }
  }, [selectedCompId]);

  // إضافة شركة جديدة
  const addCompany = async () => {
    if (!newCompName.trim()) return;
    try {
      await addDoc(collection(db, "structure"), { 
        name: newCompName.trim(), 
        type: "comp", 
        createdAt: serverTimestamp() 
      });
      setNewCompName(""); // تصفير الحقل مباشرة
    } catch (error) {
      console.error("Error adding company:", error);
    }
  };

  return (
    <div className="animate-view p-4 space-y-6 font-['Cairo'] relative z-10">
      
      {/* قسم إدارة الشركات */}
      <div className={`p-8 rounded-[2.5rem] border-t-4 border-t-amber-500 shadow-2xl transition-all ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
        <div className="flex justify-between items-center mb-8">
           <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest">
             {isRTL ? "إدارة شركات المقاولات" : "Contractor Companies"}
           </h3>
           <span className={`text-[10px] font-black opacity-40 tracking-[0.3em] uppercase ${isDark ? 'text-white' : 'text-zinc-900'}`}>Vendor Command Hub</span>
        </div>

        {/* نموذج الإضافة السريع */}
        <div className="flex gap-4 mb-8">
          <input 
            value={newCompName} 
            onChange={(e) => setNewCompName(e.target.value)} 
            placeholder={isRTL ? "أدخل اسم الشركة الجديدة..." : "Enter New Company Name..."} 
            className={`flex-1 p-5 rounded-2xl border outline-none font-black text-sm text-center transition-all ${isDark ? 'bg-black/60 border-white/10 text-white focus:border-amber-500' : 'bg-zinc-50 border-zinc-200 focus:border-amber-500 text-zinc-900'}`} 
          />
          <button 
            onClick={addCompany} 
            className="bg-amber-500 text-black px-12 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-amber-500/20 hover:brightness-110"
          > 
            {isRTL ? "إضافة +" : "Add +"} 
          </button>
        </div>
        
        {/* عرض الشركات كبطاقات ذكية */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {companies.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCompId(c.id)} 
              className={`p-5 rounded-2xl border cursor-pointer text-center transition-all duration-300 ${
                selectedCompId === c.id 
                ? 'border-amber-500 bg-amber-500/20 scale-105 shadow-xl text-amber-500' 
                : (isDark ? 'bg-white/5 border-white/5 hover:border-amber-500/40 text-white' : 'bg-zinc-50 border-zinc-100 hover:border-amber-500 text-zinc-700 shadow-sm')
              }`}
            >
              <span className="font-black text-[10px] uppercase tracking-tighter block truncate">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* عرض سجلات العمالة للشركة المختارة */}
      {selectedCompId && (
        <div className={`rounded-[2.5rem] overflow-hidden animate-view shadow-2xl border-2 transition-all ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-100'}`}>
          <div className="p-6 bg-amber-500/5 border-b border-white/5 flex justify-between items-center">
              <p className="font-black text-xs text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                {isRTL ? "كشف العمالة المسجلة" : "Enrolled Labor Records"}
              </p>
              <button 
                onClick={() => {
                  if(window.confirm(isRTL ? "هل أنت متأكد من حذف الشركة؟ (ملاحظة: هذا لن يمسح سجلات العمالة بشكل نهائي)" : "Confirm company deletion?")) {
                    deleteDoc(doc(db, "structure", selectedCompId));
                    setSelectedCompId(null);
                  }
                }}
                className="text-red-500 text-[9px] font-black underline uppercase hover:text-red-400 transition-colors"
              >
                {isRTL ? "حذف الشركة" : "Delete Company"}
              </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className={`text-amber-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5 ${isDark ? 'bg-black/40' : 'bg-zinc-900 text-white'}`}>
                <tr>
                  <th className="p-6">{isRTL ? 'بيانات العامل المهنية' : 'Staff Bio & Job'}</th>
                  <th className="p-6">{isRTL ? 'رقم الإقامة/الهوية' : 'Iqama / National ID'}</th>
                  <th className="p-6">{isRTL ? 'تحكم' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5 text-white' : 'divide-zinc-100 text-zinc-800'}`}>
                {contractors.length > 0 ? contractors.map(it => (
                  <tr key={it.id} className="hover:bg-amber-500/5 transition-all group">
                    <td className="p-6 text-right px-10">
                        <p className="font-black text-sm">{it.fullName}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">{it.jobTitle} | {it.nationality}</p>
                    </td>
                    <td className="p-6 font-black text-amber-500 italic tracking-[0.2em] font-mono text-xs">{it.idNo || it.nationalId}</td>
                    <td className="p-6">
                      <button 
                        onClick={() => {
                          if(window.confirm(isRTL ? "إلغاء سجل هذا العامل؟" : "Delete this worker record?")) {
                            deleteDoc(doc(db, "contractors", it.id));
                          }
                        }} 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all mx-auto"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-20 opacity-20 font-black text-[11px] uppercase tracking-[0.6em]">
                      {isRTL ? "لا يوجد عمالة مرتبطة" : "Empty Registry"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}