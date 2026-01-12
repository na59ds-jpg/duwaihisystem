import { useState, useEffect } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where, getDocs, limit, orderBy } from "firebase/firestore";

/**
 * Maaden Duwaihi Mine - Strategic Operations Center Dashboard (v6.0)
 * FEATURES: Live Manpower Tracking, Security Radar, Expiry Alerts.
 */

export function Dashboard() {
  const { language, theme, navigateTo } = useApp();
  const isRTL = language === 'ar';
  const isDark = theme === 'dark';

  const [stats, setStats] = useState({
    totalManpower: 0,
    activeWorkIDs: 0,
    vehiclePermits: 0,
    onSiteNow: 0
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // 1. حساب إجمالي القوة البشرية (موظفين + مقاولين)
    const calculateManpower = async () => {
      const empSnap = await getDocs(collection(db, "employees"));
      const conSnap = await getDocs(collection(db, "contractors"));
      setStats(p => ({ ...p, totalManpower: empSnap.size + conSnap.size }));
    };
    calculateManpower();

    // 2. عداد المتواجدين الآن في الموقع (On-Site)
    const unsubOnSite = onSnapshot(query(collection(db, "visitor_logs"), where("status", "==", "On-Site")), (s) => {
      setStats(p => ({ ...p, onSiteNow: s.size }));
    });

    // 3. إحصائيات الأرشيف المعتمد (بطاقات هوية وتصاريح مركبات)
    onSnapshot(query(collection(db, "work_id_cards"), where("status", "==", "Approved")), (s) => setStats(p => ({ ...p, activeWorkIDs: s.size })));
    onSnapshot(query(collection(db, "vehicle_permits"), where("status", "==", "Approved")), (s) => setStats(p => ({ ...p, vehiclePermits: s.size })));

    // 4. رادار آخر الحركات الأمنية عند البوابات
    const unsubLogs = onSnapshot(query(collection(db, "visitor_logs"), orderBy("timestamp", "desc"), limit(5)), (s) => {
      setRecentLogs(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 5. مراقبة تواريخ انتهاء الصلاحية (30 يوم إنذار مبكر)
    const unsubAlerts = onSnapshot(collection(db, "work_id_cards"), (s) => {
      const today = new Date();
      const alerts = s.docs.map(d => {
        const p = d.data() as any;
        const expDate = new Date(p.idExpiryDate || p.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 ? { ...p, id: d.id, alertStatus: diffDays < 0 ? 'EXPIRED' : 'SOON' } : null;
      }).filter(a => a !== null);
      setNotifications(alerts.slice(0, 5));
    });

    return () => { clearInterval(timer); unsubOnSite(); unsubLogs(); unsubAlerts(); };
  }, []);

  return (
    <div className="space-y-8 animate-view font-['Cairo'] relative z-10" dir={isRTL ? "rtl" : "ltr"}>

      {/* هيدر القيادة والسيطرة */}
      <div className={`p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center border shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-200'}`}>
        <div className={isRTL ? "text-right" : "text-left"}>
          <h2 className="text-3xl md:text-4xl font-black text-[#C4B687]">{isRTL ? 'مركز القيادة الأمنية بمنجم الدويحي' : 'Security Command Center'}</h2>
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">Ad Duwaihi Mine - Strategic Operations Portal</p>
        </div>
        <div className={`mt-4 md:mt-0 p-4 px-10 rounded-2xl border shadow-inner ${isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
          <span className="text-3xl font-black text-[#C4B687] tabular-nums tracking-widest">
            {currentTime.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-GB')}
          </span>
        </div>
      </div>

      {/* إحصائيات الحالة الحية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-none">
        <StatOnly title={isRTL ? "المتواجدون بالموقع الآن" : "On-Site Now"} value={stats.onSiteNow} icon="📡" theme={theme} color="red" pulse />
        <StatOnly title={isRTL ? "إجمالي القوة البشرية" : "Total Manpower"} value={stats.totalManpower} icon="👥" theme={theme} />
        <StatOnly title={isRTL ? "البطاقات المعتمدة" : "Approved IDs"} value={stats.activeWorkIDs} icon="🪪" theme={theme} />
        <StatOnly title={isRTL ? "تصاريح المركبات" : "Vehicle Permits"} value={stats.vehiclePermits} icon="🚗" theme={theme} />
      </div>

      {/* روابط التحكم الاستراتيجي */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <PathCard title={isRTL ? "إدارة الأقسام" : "Departments"} desc="Staff Structure" icon="🏢" onClick={() => navigateTo("personnel")} theme={theme} />
        <PathCard title={isRTL ? "إدارة الشركات" : "Companies"} desc="Contractor Hub" icon="🏗️" onClick={() => navigateTo("contractors_mgmt")} theme={theme} />
        <PathCard title={isRTL ? "أرشيف التصاريح" : "Records Archive"} desc="Approved Data" icon="📋" onClick={() => navigateTo("permits")} theme={theme} />
        <PathCard title={isRTL ? "التحكم الأمني" : "Security Command"} desc="Gate Controls" icon="🛂" onClick={() => navigateTo("security_control")} theme={theme} />
      </div>

      {/* الرادارات الأمنية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* رصد الحركات الميدانية */}
        <div className={`p-8 rounded-[3rem] border shadow-2xl backdrop-blur-md ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-red-600 tracking-[0.4em] mb-8 flex items-center gap-3">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
            {isRTL ? 'رصد بوابات المنجم اللحظي' : 'Live Gate Movement Tracker'}
          </h3>
          <div className="space-y-4">
            {recentLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#C4B687]/20 transition-all">
                <div className="flex items-center gap-4">
                  <span className={`text-xl ${log.status === 'On-Site' ? 'text-emerald-500' : 'text-red-500'}`}>{log.status === 'On-Site' ? '📥' : '📤'}</span>
                  <div>
                    <p className="text-xs font-black">{log.visitorName || log.personName || log.fullName}</p>
                    <p className="text-[8px] opacity-40 uppercase">{log.timestamp?.toDate().toLocaleTimeString()}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-[#C4B687]">{log.status === 'On-Site' ? (isRTL ? 'دخول' : 'In') : (isRTL ? 'خروج' : 'Out')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* تنبيهات انتهاء الصلاحية */}
        <div className={`p-8 rounded-[3rem] border shadow-2xl backdrop-blur-md ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
          <h3 className="text-[10px] font-black uppercase text-[#C4B687] tracking-[0.5em] mb-8">{isRTL ? 'إنذار انتهاء الصلاحية' : 'Security Expiry Alerts'}</h3>
          <div className="space-y-4">
            {notifications.length > 0 ? notifications.map(note => (
              <div key={note.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#C4B687]/30 transition-all">
                <p className="text-xs font-black uppercase">{note.fullName}</p>
                <span className={`text-[8px] font-black px-3 py-1 rounded-lg ${note.alertStatus === 'EXPIRED' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  {note.alertStatus === 'EXPIRED' ? (isRTL ? 'منتهي' : 'Expired') : (isRTL ? 'قريباً' : 'Soon')}
                </span>
              </div>
            )) : (
              <div className="py-10 text-center">
                <p className="text-[10px] opacity-20 font-black uppercase tracking-widest">No Active Security Alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// المكونات الفرعية للعرض
function StatOnly({ title, value, icon, theme, color = "gold", pulse }: any) {
  const isDark = theme === 'dark';
  return (
    <div className={`p-6 rounded-[2.5rem] border shadow-xl relative backdrop-blur-md overflow-hidden ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100 shadow-zinc-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</p>
        <span className={`text-2xl ${pulse ? 'animate-pulse' : ''}`}>{icon}</span>
      </div>
      <p className={`text-4xl font-black tabular-nums tracking-tighter ${color === 'red' ? 'text-red-600' : 'text-[#C4B687]'}`}>{value}</p>
    </div>
  );
}

function PathCard({ title, desc, icon, onClick, theme }: any) {
  const isDark = theme === 'dark';
  return (
    <div onClick={onClick} className={`p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center group ${isDark ? 'bg-black/40 border-white/5 hover:border-[#C4B687]/50 shadow-black' : 'bg-white border-zinc-100 hover:border-[#C4B687] shadow-xl'}`}>
      <div className="text-5xl mb-6 transition-transform duration-700 group-hover:scale-110 drop-shadow-lg">{icon}</div>
      <h4 className="text-sm font-black mb-2 uppercase">{title}</h4>
      <p className="text-[9px] font-black text-[#C4B687] uppercase opacity-60 group-hover:opacity-100 tracking-tighter">{desc}</p>
    </div>
  );
}