import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Approved Records Archive (v6.0)
 * Logic: Displays finalized data for physical ID printing & Sticker issuance.
 * Features: Multi-collection toggling & attachment inspection.
 */

import type { ApprovedRecord } from "../../types";

export default function WorkCards() {
  const { theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const [cards, setCards] = useState<ApprovedRecord[]>([]);
  const [view, setView] = useState<"ID" | "VEHICLE">("ID");

  useEffect(() => {
    // تحديد المجموعة المستهدفة بناءً على نوع الأرشيف المختار
    const collectionName = view === "ID" ? "work_id_cards" : "vehicle_permits";

    const q = query(
      collection(db, collectionName),
      where("status", "==", "Approved"),
      orderBy("approvedAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setCards(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApprovedRecord)));
    });
    return () => unsub();
  }, [view]);

  return (
    <div className="animate-view p-6 space-y-8 font-['Cairo'] relative z-10">

      {/* هيدر الأرشيف والتحكم بنوع السجلات */}
      <div className={`p-8 rounded-[2.5rem] shadow-2xl border-t-4 border-t-[#C4B687] backdrop-blur-xl ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-200 shadow-zinc-200'}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className={isRTL ? "text-right" : "text-left"}>
            <h3 className="text-2xl font-black text-[#C4B687] uppercase tracking-tight">
              {isRTL ? "أرشيف البيانات والاعتمادات" : "Approved Data Archive"}
            </h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isDark ? 'opacity-40' : 'opacity-60 text-zinc-500'}`}>
              Finalized Records for Issuance & Delivery
            </p>
          </div>
          <div className="flex gap-4 p-2 rounded-2xl bg-black/20 border border-white/5 shadow-inner">
            <button onClick={() => setView("ID")} className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${view === 'ID' ? 'bg-[#C4B687] text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {isRTL ? "سجل بطاقات العمل" : "Work IDs"}
            </button>
            <button onClick={() => setView("VEHICLE")} className={`px-8 py-3 rounded-xl font-black text-[10px] transition-all uppercase ${view === 'VEHICLE' ? 'bg-[#C4B687] text-black shadow-lg scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {isRTL ? "سجل تصاريح المركبات" : "Vehicle Permits"}
            </button>
          </div>
        </div>
      </div>

      {/* عرض السجلات المعتمدة كبطاقات ذكية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cards.map((item) => (
          <div key={item.id} className={`p-6 rounded-[2.5rem] border-2 flex flex-col sm:flex-row gap-8 transition-all hover:scale-[1.01] group ${isDark ? 'bg-black/40 border-white/5 hover:border-[#C4B687]/40 shadow-black' : 'bg-white border-zinc-100 hover:border-[#C4B687] shadow-xl shadow-zinc-200/50'}`}>

            {/* المعاينة البصرية (صورة الموظف أو أيقونة المركبة) */}
            <div className="w-full sm:w-32 h-44 rounded-3xl bg-black/20 border border-white/5 overflow-hidden flex-shrink-0 shadow-inner group-hover:border-[#C4B687]/20 transition-colors">
              {(item.attachments?.["photo"] || item.attachments?.["صورة شخصية حديثة"] || item.attachments?.["Recent Photograph"]) ? (
                <img src={item.attachments["photo"] || item.attachments["صورة شخصية حديثة"] || item.attachments["Recent Photograph"]} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" alt="Profile" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl opacity-10">{view === 'ID' ? '👤' : '🚗'}</div>
              )}
            </div>

            {/* تفاصيل السجل المستخرج من الطلب الأصلي */}
            <div className="flex-1 space-y-5">
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <p className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.fullName}</p>
                  <p className="text-[9px] font-black text-[#C4B687] uppercase tracking-widest opacity-60">{item.jobTitle || item.position}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-[#C4B687] bg-[#C4B687]/10 px-4 py-1.5 rounded-xl border border-[#C4B687]/20 shadow-sm">
                    {view === 'ID' ? (isRTL ? 'S/N: ' : 'S/N: ') : (isRTL ? 'Sticker: ' : 'Sticker: ')}
                    {item.serialNumber}
                  </span>
                  <p className="text-[7px] opacity-30 mt-2 font-black uppercase">{item.approvedAt?.toDate().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                <Info label="ID/IQAMA" value={item.nationalId || item.idNo} isDark={isDark} />
                <Info label="EMP ID" value={item.empNo || item.employeeId} isDark={isDark} />
                <Info label="BLOOD TYPE" value={item.bloodGroup} isDark={isDark} />
                <Info label="DEPT/CORP" value={item.dept || item.companyName} isDark={isDark} />

                {view === 'VEHICLE' && (
                  <>
                    <Info label="PLATE NO" value={item.plateNo} isDark={isDark} />
                    <Info label="VEHICLE INFO" value={`${item.color} ${item.model}`} isDark={isDark} />
                  </>
                )}
              </div>

              {/* روابط المرفقات الرسمية (تفتح في نافذة جديدة للمطابقة) */}
              <div className="flex flex-wrap gap-2 pt-2">
                {item.attachments && Object.entries(item.attachments).map(([name, url]: any) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className={`text-[8px] font-black uppercase border px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/5 hover:bg-[#C4B687] hover:text-black text-zinc-500' : 'bg-zinc-50 border-zinc-200 hover:bg-[#C4B687] text-zinc-600'}`}>
                    <span>📂</span> {name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* حالة عدم وجود سجلات معتمدة */}
      {cards.length === 0 && (
        <div className="py-48 text-center opacity-20 select-none">
          <div className="text-6xl mb-6">📂</div>
          <p className="font-black text-xs uppercase tracking-[0.8em]">No Approved Records Available</p>
        </div>
      )}
    </div>
  );
}

// مكون فرعي لعرض البيانات بشكل منسق
function Info({ label, value, isDark }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
      <p className={`text-[11px] font-black truncate tracking-tighter ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{value || '---'}</p>
    </div>
  );
}