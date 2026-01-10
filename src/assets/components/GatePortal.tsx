import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Field Security Gate Portal (v6.0)
 * FEATURE: Smart License Plate Input (3 Letters, 4 Numbers).
 * FEATURE: Auto-Tab & Arabic Character Normalisation (Ignoring Hamza).
 */

export function GatePortal() {
  const { theme, user, setUser, language } = useApp(); 
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const [activeTab, setActiveTab] = useState<"visitors" | "vehicle_check" | "id_check">("visitors");
  const [dbGates, setDbGates] = useState<any[]>([]); 
  const [selectedGate, setSelectedGate] = useState(""); 
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);

  // حالات خاصة بإدخال اللوحة الذكية
  const [plateChars, setPlateChars] = useState(["", "", ""]);
  const [plateNums, setPlateNums] = useState(["", "", "", ""]);
  const charRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const numRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [onSiteVisitors, setOnSiteVisitors] = useState<any[]>([]);
  const [scheduledVisits, setScheduledVisits] = useState<any[]>([]);

  // توحيد الحروف العربية (تجاهل الهمزات)
  const normaliseArabic = (text: string) => {
    return text
      .replace(/[أإآ]/g, "ا")
      .replace(/\s/g, "")
      .toUpperCase();
  };

  useEffect(() => {
    onSnapshot(collection(db, "security_gates"), (snap) => {
      setDbGates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const qOnSite = query(
      collection(db, "visitor_logs"), 
      where("status", "==", "On-Site"), 
      orderBy("timestamp", "desc")
    );
    onSnapshot(qOnSite, (snap) => setOnSiteVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    if (selectedGate) {
        const qSched = query(
          collection(db, "visitor_logs"), 
          where("status", "==", "بانتظار وصول الزائر"), 
          where("targetGateId", "==", selectedGate)
        );
        onSnapshot(qSched, (snap) => setScheduledVisits(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, [selectedGate]);

  // دالة فحص البطاقات والمركبات
  const handleVerifySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchResult(null);

    try {
      if (activeTab === "vehicle_check") {
        // تجميع اللوحة من الخانات السبع وتوحيدها
        const fullPlate = normaliseArabic(plateChars.join("") + plateNums.join(""));
        if (fullPlate.length < 2) return;

        const q = query(collection(db, "vehicle_permits"));
        const snap = await getDocs(q);
        
        // فحص اللوحة مع تجاهل الهمزات والمسافات في قاعدة البيانات أيضاً
        const found = snap.docs.find(d => normaliseArabic(d.data().plateNo) === fullPlate);
        
        if (found) setSearchResult({ ...found.data(), category: isRTL ? "مركبة مصرحة" : "AUTHORIZED VEHICLE" });
        else setSearchResult("NOT_FOUND");

      } else {
        const cleanQuery = searchQuery.trim().toUpperCase();
        if (!cleanQuery) return;
        const qId = query(collection(db, "work_id_cards"), where("serialNumber", "==", cleanQuery));
        const snap = await getDocs(qId);
        if (!snap.empty) setSearchResult({ ...snap.docs[0].data(), category: isRTL ? "بطاقة نشطة" : "ACTIVE ID CARD" });
        else setSearchResult("NOT_FOUND");
      }
    } catch (err) { 
      console.error(err);
      setSearchResult(null); 
    } 
  };

  // التحكم في مربعات إدخال اللوحة
  const handlePlateCharChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const newChars = [...plateChars];
    newChars[index] = val;
    setPlateChars(newChars);
    if (val && index < 2) charRefs[index + 1].current?.focus();
    else if (val && index === 2) numRefs[0].current?.focus();
  };

  const handlePlateNumChange = (index: number, val: string) => {
    if (val.length > 1) return;
    const newNums = [...plateNums];
    newNums[index] = val;
    setPlateNums(newNums);
    if (val && index < 3) numRefs[index + 1].current?.focus();
  };

  return (
    <div className={`min-h-screen font-['Cairo'] flex flex-col relative z-10 ${isDark ? 'text-white' : 'text-zinc-900'}`} dir={isRTL ? "rtl" : "ltr"}>
      
      {/* Header */}
      <header className={`h-20 px-8 flex justify-between items-center border-b sticky top-0 z-30 backdrop-blur-xl ${isDark ? 'bg-black/60 border-white/5' : 'bg-white/80 border-zinc-200'}`}>
        <button onClick={() => setUser(null)} className="px-6 py-2 rounded-xl bg-red-500/10 text-red-500 font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">{isRTL ? "خروج" : "Logout"}</button>
        <div className="flex items-center gap-4">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{isRTL ? "مركز التحقق الميداني" : "Field Verification"}</p>
            <div className="bg-white p-1 rounded shadow-sm"><img src="/logo.png" alt="Maaden" className="h-6" /></div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 relative">
        {/* اختيار البوابة */}
        <div className="max-w-4xl mx-auto mb-10">
            <select 
              value={selectedGate} 
              onChange={(e) => setSelectedGate(e.target.value)} 
              className={`w-full p-5 rounded-2xl border-2 font-black text-xs outline-none transition-all ${isDark ? 'bg-black border-[#C4B687]/30 text-white focus:border-[#C4B687]' : 'bg-white border-zinc-100 text-zinc-900 focus:border-[#C4B687]'}`}
            >
                <option value="">{isRTL ? "⚠️ يرجى تحديد موقع البوابة الميدانية" : "⚠️ PLEASE SELECT GATE LOCATION"}</option>
                {dbGates.map(gate => <option key={gate.id} value={gate.id}>{isRTL ? gate.nameAr : gate.nameEn}</option>)}
            </select>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className={`flex gap-1 p-1.5 rounded-2xl self-center border ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>
            <TabButton active={activeTab === 'visitors'} onClick={() => setActiveTab("visitors")} label={isRTL ? "جدولة الزوار" : "VISITORS"} />
            <TabButton active={activeTab === 'vehicle_check'} onClick={() => { setActiveTab("vehicle_check"); setSearchResult(null); }} label={isRTL ? "فحص المركبات" : "VEHICLES"} />
            <TabButton active={activeTab === 'id_check'} onClick={() => { setActiveTab("id_check"); setSearchResult(null); }} label={isRTL ? "فحص البطاقات" : "ID CHECK"} />
          </div>

          {activeTab === "visitors" && (
            <div className="grid lg:grid-cols-3 gap-8 animate-view">
              <div className="lg:col-span-2 space-y-6">
                {scheduledVisits.length > 0 ? scheduledVisits.map(visit => (
                  <div key={visit.id} className={`p-8 rounded-[2.5rem] border-2 shadow-2xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-100'}`}>
                    <div className="flex justify-between items-start mb-6">
                       <div>
                          <p className="text-[10px] font-black text-[#C4B687] uppercase tracking-widest mb-1">{isRTL ? "زائر متوقع" : "EXPECTED VISITOR"}</p>
                          <h3 className="text-2xl font-black">{visit.visitorName}</h3>
                          <p className="text-sm font-bold opacity-60">{visit.company}</p>
                       </div>
                       <span className="bg-[#C4B687]/10 text-[#C4B687] px-4 py-1 rounded-lg text-[10px] font-black uppercase">{visit.visitType}</span>
                    </div>
                    <button onClick={() => updateDoc(doc(db, "visitor_logs", visit.id), { status: "On-Site", entryTime: serverTimestamp(), gateId: selectedGate, activatedBy: user?.name })} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all">
                      {isRTL ? "تفعيل الدخول للمنجم ✅" : "ACTIVATE ENTRY ✅"}
                    </button>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-20 font-black text-sm uppercase tracking-widest">{isRTL ? "لا توجد زيارات مجدولة لهذه البوابة" : "NO SCHEDULED VISITS"}</div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest px-4">{isRTL ? "المتواجدون في الموقع الآن" : "ON-SITE PERSONNEL"}</p>
                <div className={`p-6 rounded-[2.5rem] border min-h-[300px] shadow-inner ${isDark ? 'bg-black/40 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                  {onSiteVisitors.map(v => (
                    <div key={v.id} className="p-4 mb-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center group">
                       <div className="overflow-hidden">
                          <p className="text-xs font-black truncate">{v.visitorName || v.fullName}</p>
                          <p className="text-[8px] opacity-40 uppercase">{v.category || "Visitor"}</p>
                       </div>
                       <button onClick={() => updateDoc(doc(db, "visitor_logs", v.id), { status: "Departed", exitTime: serverTimestamp() })} className="bg-red-500/10 text-red-500 p-2 px-4 rounded-lg text-[9px] font-black hover:bg-red-500 hover:text-white transition-all uppercase">{isRTL ? "خروج" : "EXIT"}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "vehicle_check" && (
            <div className="max-w-4xl mx-auto w-full space-y-10 animate-view">
              <div className={`p-10 rounded-[3.5rem] border-4 shadow-2xl ${isDark ? 'bg-black/60 border-white/5' : 'bg-white border-zinc-100'}`}>
                <p className="text-center font-black text-[#C4B687] text-[10px] uppercase tracking-[0.4em] mb-8">{isRTL ? "نظام إدخال لوحات المركبات" : "SMART LICENSE PLATE ENTRY"}</p>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-10">
                   {/* قسم الحروف */}
                   <div className="flex gap-3">
                      {plateChars.map((char, i) => (
                        <input 
                          key={`char-${i}`}
                          ref={charRefs[i]}
                          type="text"
                          maxLength={1}
                          value={char}
                          onChange={(e) => handlePlateCharChange(i, e.target.value)}
                          className={`w-20 h-24 rounded-2xl border-4 text-center text-4xl font-black outline-none transition-all ${isDark ? 'bg-zinc-900 border-white/10 text-white focus:border-[#C4B687]' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`}
                          placeholder="أ"
                        />
                      ))}
                   </div>
                   
                   <div className="w-1 h-20 bg-[#C4B687]/20 hidden md:block"></div>

                   {/* قسم الأرقام */}
                   <div className="flex gap-3" dir="ltr">
                      {plateNums.map((num, i) => (
                        <input 
                          key={`num-${i}`}
                          ref={numRefs[i]}
                          type="number"
                          maxLength={1}
                          value={num}
                          onChange={(e) => handlePlateNumChange(i, e.target.value)}
                          className={`w-16 h-24 rounded-2xl border-4 text-center text-4xl font-black outline-none transition-all ${isDark ? 'bg-zinc-900 border-white/10 text-white focus:border-[#C4B687]' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`}
                          placeholder="0"
                        />
                      ))}
                   </div>
                </div>

                <button 
                  onClick={() => handleVerifySearch()} 
                  className="w-full py-6 bg-[#C4B687] text-black rounded-[2rem] font-black text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isRTL ? "بدء فحص تصريح المركبة 🚗" : "START VEHICLE CHECK 🚗"}
                </button>
              </div>

              {searchResult && (
                <div className={`p-10 rounded-[3rem] border-4 animate-view shadow-2xl ${searchResult === 'NOT_FOUND' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                    {searchResult === 'NOT_FOUND' ? (
                      <div className="text-center space-y-2">
                        <p className="text-5xl">⚠️</p>
                        <p className="text-xl font-black uppercase tracking-tight">{isRTL ? "تنبيه: هذه المركبة غير مصرح لها بالدخول!" : "UNAUTHORIZED VEHICLE ACCESS!"}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="text-center sm:text-right">
                          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-1">{searchResult.category}</p>
                          <p className="text-3xl font-black uppercase">{searchResult.fullName || searchResult.ownerName}</p>
                          <p className="text-sm font-bold opacity-70 mt-1">{searchResult.plateNo} | {searchResult.companyName || searchResult.dept}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           <div className="w-20 h-20 rounded-full bg-emerald-500 text-black flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-500/20">✓</div>
                           <span className="text-[10px] font-black uppercase tracking-widest">{isRTL ? "تصريح فعال" : "VALID PERMIT"}</span>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {activeTab === "id_check" && (
            <div className="max-w-2xl mx-auto w-full space-y-10 animate-view">
              <form onSubmit={handleVerifySearch} className="relative group">
                <input 
                  type="text" 
                  className={`w-full p-8 rounded-3xl border-4 text-4xl font-black text-center outline-none shadow-2xl transition-all ${isDark ? 'bg-black border-white/5 text-white focus:border-[#C4B687]' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`} 
                  placeholder={isRTL ? "مرر البطاقة أو ادخل الرقم" : "SCAN OR ENTRY SN"}
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <button type="submit" className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-4 bottom-4 px-10 bg-[#C4B687] text-black rounded-2xl font-black text-xs shadow-lg hover:scale-95 transition-all uppercase`}>{isRTL ? "فحص" : "CHECK"}</button>
              </form>

              {searchResult && (
                <div className={`p-10 rounded-[3rem] border-4 animate-view shadow-2xl ${searchResult === 'NOT_FOUND' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                    {searchResult === 'NOT_FOUND' ? (
                      <div className="text-center space-y-2">
                        <p className="text-5xl">⚠️</p>
                        <p className="text-xl font-black uppercase tracking-tight">{isRTL ? "تنبيه: سجل غير معتمد!" : "UNAUTHORIZED ACCESS!"}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="text-center sm:text-right">
                          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mb-1">{searchResult.category}</p>
                          <p className="text-3xl font-black uppercase">{searchResult.fullName || searchResult.name}</p>
                          <p className="text-sm font-bold opacity-70 mt-1">{searchResult.dept || searchResult.companyName || searchResult.serialNumber}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           <div className="w-20 h-20 rounded-full bg-emerald-500 text-black flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-500/20">✓</div>
                           <span className="text-[10px] font-black uppercase tracking-widest">{isRTL ? "تصريح فعال" : "VALID PERMIT"}</span>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`px-10 py-3 rounded-xl font-black text-[10px] uppercase transition-all duration-300 ${active ? 'bg-[#C4B687] text-black shadow-xl scale-105' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {label}
    </button>
  );
}