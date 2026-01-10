import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  addDoc,
  serverTimestamp 
} from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Access Control Module (v6.0)
 * Function: Real-time security verification for personnel and vehicles.
 * FEATURES: Double-Archive Search, Site Occupancy Tracking.
 */

export default function AccessControl() {
  const { theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [gates, setGates] = useState<any[]>([]);
  const [selectedGate, setSelectedGate] = useState("");
  const [onSiteCount, setOnSiteCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. جلب بيانات الميدان (البوابات + عداد المتواجدين)
  useEffect(() => {
    const unsubGates = onSnapshot(collection(db, "security_gates"), (snap) => {
      setGates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qOnSite = query(collection(db, "visitor_logs"), where("status", "==", "On-Site"));
    const unsubOnSite = onSnapshot(qOnSite, (snap) => setOnSiteCount(snap.size));

    return () => { unsubGates(); unsubOnSite(); };
  }, []);

  // 2. محرك الفحص الأمني (البحث في أرشيف البطاقات والتصاريح المعتمدة فقط)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setResult(null);
    setLoading(true);

    const qry = searchQuery.trim().toUpperCase();
    
    try {
      // فحص أرشيف الموظفين/المقاولين المعتمد (نموذج ISD-F-001)
      const idSnap = await getDocs(query(
        collection(db, "work_id_cards"), 
        where("serialNumber", "==", qry),
        where("status", "==", "Approved")
      ));

      // فحص أرشيف تصاريح المركبات المعتمد (نموذج ISD-F-005)
      const vehSnap = await getDocs(query(
        collection(db, "vehicle_permits"), 
        where("plateNo", "==", qry),
        where("status", "==", "Approved")
      ));

      if (!idSnap.empty) {
        setResult({ ...idSnap.docs[0].data(), type: 'PERSONNEL', docId: idSnap.docs[0].id });
      } else if (!vehSnap.empty) {
        setResult({ ...vehSnap.docs[0].data(), type: 'VEHICLE', docId: vehSnap.docs[0].id });
      } else {
        setResult("NOT_FOUND");
      }
    } catch (err) {
      console.error("Verification Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. تسجيل الحركات الميدانية (الدخول والخروج)
  const recordMovement = async (moveType: 'In' | 'Out') => {
    if (!selectedGate) {
      alert(isRTL ? "⚠️ يرجى تحديد موقع البوابة أولاً" : "⚠️ Select Gate Location First");
      return;
    }
    if (!result || result === 'NOT_FOUND') return;

    try {
      await addDoc(collection(db, "visitor_logs"), {
        personName: result.fullName || result.ownerName || result.name || "---",
        identifier: searchQuery.toUpperCase(),
        gateId: selectedGate,
        type: moveType,
        category: result.type,
        status: moveType === 'In' ? 'On-Site' : 'Departed',
        timestamp: serverTimestamp()
      });
      
      alert(isRTL ? "تم تحديث السجل الأمني بنجاح ✅" : "Security Log Updated ✅");
      setResult(null);
      setSearchQuery("");
    } catch (err) {
      alert(isRTL ? "فشل في تسجيل الحركة" : "Log failed");
    }
  };

  return (
    <div className="animate-view p-6 space-y-8 font-['Cairo'] relative z-10">
      
      {/* هيدر العمليات الميدانية */}
      <div className={`p-8 rounded-[2.5rem] shadow-2xl border-t-4 border-t-red-600 backdrop-blur-xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200 shadow-zinc-200'}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-3xl bg-red-600/10 flex items-center justify-center text-red-600 border border-red-600/20 shadow-lg animate-pulse">📡</div>
              <div>
                  <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{isRTL ? "مركز التحقق الميداني" : "Field Access Command"}</h3>
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em]">Al-Duwaihi SOC Operations</p>
              </div>
          </div>

          <select 
            value={selectedGate} 
            onChange={(e) => setSelectedGate(e.target.value)}
            className={`p-5 px-10 rounded-2xl border-2 font-black text-xs outline-none transition-all cursor-pointer ${isDark ? 'bg-black border-white/10 text-white focus:border-red-600' : 'bg-zinc-50 border-zinc-200 focus:border-red-600 text-zinc-900 shadow-inner'}`}
          >
            <option value="">{isRTL ? "-- اختر البوابة الحالية --" : "-- Choose Current Gate --"}</option>
            {gates.map(g => (
              <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.nameEn}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-12 rounded-[3.5rem] border-2 shadow-2xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-100'}`}>
            <form onSubmit={handleVerify} className="relative mb-12">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? "ادخل رقم البطاقة أو اللوحة..." : "Input SN or Plate..."}
                className={`w-full p-8 rounded-[2.5rem] border-4 text-4xl font-black text-center outline-none transition-all ${isDark ? 'bg-black/60 border-white/5 text-white focus:border-red-600' : 'bg-zinc-100 border-zinc-200 focus:border-red-600 text-zinc-900 shadow-inner'}`}
              />
              <button type="submit" className="absolute top-5 bottom-5 inset-x-6 w-fit px-10 mr-auto bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all active:scale-95 shadow-xl shadow-red-600/20">
                {loading ? "..." : (isRTL ? "فحص وتحقق" : "VERIFY")}
              </button>
            </form>

            {/* عرض النتيجة - مقبول */}
            {result && result !== 'NOT_FOUND' && (
              <div className="p-10 rounded-[3rem] border-4 bg-emerald-500/5 border-emerald-500/20 animate-in zoom-in duration-300">
                <div className="flex justify-between items-center text-emerald-500 mb-10">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">{result.type === 'PERSONNEL' ? (isRTL ? 'بيانات فرد' : 'Personnel') : (isRTL ? 'بيانات مركبة' : 'Vehicle')}</p>
                    <h4 className="text-4xl font-[900] tracking-tight">{result.fullName || result.ownerName}</h4>
                    <p className="text-sm font-black mt-2 opacity-80 uppercase tracking-tighter">{result.dept || result.companyName || result.plateNo}</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-emerald-500 text-black flex items-center justify-center text-3xl font-black shadow-2xl border-4 border-emerald-500/50">✓</div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <button onClick={() => recordMovement('In')} className="p-6 bg-emerald-600 text-white rounded-3xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl active:scale-95">
                       {isRTL ? "تسجيل دخول (IN)" : "CHECK-IN"}
                    </button>
                    <button onClick={() => recordMovement('Out')} className="p-6 bg-zinc-800 text-white rounded-3xl font-black text-sm hover:bg-zinc-900 transition-all shadow-xl active:scale-95">
                       {isRTL ? "تسجيل خروج (OUT)" : "CHECK-OUT"}
                    </button>
                </div>
              </div>
            )}

            {/* عرض النتيجة - مرفوض أو غير موجود */}
            {result === 'NOT_FOUND' && (
               <div className="p-10 rounded-[3rem] border-4 bg-red-600/5 border-red-600/20 text-center text-red-600 animate-in slide-in-from-top-4 duration-300">
                  <div className="text-6xl mb-4">🚫</div>
                  <p className="font-black text-2xl uppercase tracking-tighter">{isRTL ? "سجل غير مصرح به" : "Unauthorized Entry"}</p>
                  <p className="text-xs font-bold opacity-60 mt-2">{isRTL ? "البطاقة غير موجودة بالأرشيف المعتمد" : "Record not found in Approved Archive"}</p>
               </div>
            )}
          </div>
        </div>

        {/* مؤشر المتواجدين (Site Monitoring) */}
        <div className="lg:col-span-5 h-full">
            <div className={`p-10 rounded-[3.5rem] border text-center h-full flex flex-col justify-center shadow-2xl relative overflow-hidden ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-100 shadow-zinc-200'}`}>
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600 opacity-20"></div>
              <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.5em] mb-6">{isRTL ? "المتواجدون حالياً" : "Current Occupancy"}</p>
              <h2 className="text-[10rem] font-black text-red-600 tracking-tighter tabular-nums leading-none">{onSiteCount}</h2>
              <div className="mt-10 flex justify-center gap-3 items-center">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 animate-ping"></span>
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{isRTL ? "مراقبة البوابات نشطة" : "Live Gate Monitoring"}</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}