import { useEffect, useState } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

/**
 * Maaden Ad Duwaihi - Strategic Operations Center Sidebar (v6.0)
 * FEATURE: Real-time Badges for Pending Requests.
 * FEATURE: Fixed Management Access to Portals.
 */

export function Sidebar({ activeTab, navigateTo, activeFilter }: { activeTab: string; navigateTo: (tab: string, filter?: string) => void; activeFilter?: string | null }) {
  const { language, user, theme } = useApp();
  const isRTL = language === 'ar';
  const isDark = theme === 'dark';

  const [requestsCount, setRequestsCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);

  // مصفوفة الصلاحيات
  const isSuperAdmin = user?.username === 'admin' || user?.role === 'Admin';
  const isLeader = user?.role === 'Leader';
  const canManageUsers = isSuperAdmin || isLeader;

  useEffect(() => {
    // مراقبة طلبات البطاقات والتصاريح (ISD Forms) قيد المراجعة
    const requestsQuery = query(collection(db, "employee_requests"), where("status", "==", "قيد المراجعة"));
    const unsubRequests = onSnapshot(requestsQuery, (snap) => setRequestsCount(snap.size));

    // مراقبة البلاغات الفنية والأمنية (Tickets)
    const ticketsQuery = query(collection(db, "tickets"), where("status", "in", ["جديد", "New"]));
    const unsubTickets = onSnapshot(ticketsQuery, (snap) => setTicketsCount(snap.size));

    return () => { unsubRequests(); unsubTickets(); };
  }, []);

  interface NavButtonProps {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
    badge?: number;
    color?: string;
  }

  const NavButton = ({ id, label, icon, onClick, badge = 0, color = "gold" }: NavButtonProps) => {
    const isActive = activeTab === id || activeFilter === id;
    const badgeColor = color === "red" ? "bg-red-600" : "bg-emerald-600";

    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 transition-all duration-500 rounded-2xl font-['Cairo'] font-[900] relative px-6 py-4 mb-2 group ${isActive
          ? "bg-[#C4B687] text-[#0f172a] shadow-2xl scale-[1.03] z-10"
          : isDark
            ? "text-zinc-400 hover:bg-white/5 hover:text-white"
            : "text-zinc-500 hover:bg-zinc-50 hover:text-black border border-transparent shadow-sm"
          }`}
      >
        <span className={`text-xl transition-transform duration-500 group-hover:scale-125 ${isActive ? 'scale-110' : 'opacity-60'}`}>{icon}</span>
        <span className={`flex-1 ${isRTL ? 'text-right' : 'text-left'} text-[11px] uppercase tracking-tight`}>{label}</span>
        {badge > 0 && (
          <span className={`absolute ${isRTL ? 'left-4' : 'right-4'} ${badgeColor} text-white text-[9px] px-2 py-0.5 min-w-[20px] rounded-lg font-black ${color === 'red' ? 'animate-pulse' : 'animate-bounce'} shadow-lg`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className={`w-80 flex flex-col h-full overflow-hidden transition-all duration-500 font-['Cairo'] ${isRTL ? 'border-l' : 'border-r'} backdrop-blur-3xl z-30 ${isDark ? 'bg-black/60 border-white/5' : 'bg-white border-zinc-100 shadow-xl'
      }`} dir={isRTL ? "rtl" : "ltr"}>

      {/* هيدر الهوية المؤسسية */}
      <div className={`p-10 text-center border-b border-[#C4B687]/10 ${isDark ? 'bg-black/20' : 'bg-zinc-50/50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center p-4 shadow-2xl transition-transform hover:scale-110">
            <img src="/logo.png" alt="Maaden" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className={`text-2xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>MAADEN</span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] mt-1 text-[#C4B687]">DUWAIHI MINE</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 space-y-8 pt-6 custom-scrollbar">

        {/* 1. مركز القيادة (Dashboard) */}
        <div className="space-y-2">
          <NavButton id="dashboard" label={isRTL ? "لوحة التحكم الاستراتيجية" : "Command Dashboard"} icon="🛡️" onClick={() => navigateTo("dashboard")} />
        </div>

        {/* 2. بوابات المنظومة (Portals) - تم تعديل التوجيه للمدير هنا */}
        <div className="space-y-2">
          <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-[#C4B687] bg-[#C4B687]/5`}>
            <h3 className="text-[9px] font-black text-[#C4B687] uppercase tracking-widest">{isRTL ? "بوابات الوصول" : "Access Portals"}</h3>
          </div>

          {/* الموظف يفتح نموذج التقديم | المدير يفتح مركز تدقيق الطلبات */}
          <NavButton
            id={isSuperAdmin ? "tickets" : "employee_portal"}
            label={isRTL ? (isSuperAdmin ? "طلبات البطاقات" : "بوابة الموظف (النماذج)") : (isSuperAdmin ? "Card Audit" : "Employee Portal")}
            icon="🪪"
            onClick={() => navigateTo(isSuperAdmin ? "tickets" : "employee_portal")}
            badge={isSuperAdmin ? requestsCount : 0}
          />

          {/* الموظف يفتح واجهة الأمن | المدير يفتح سجل الحركات الميدانية */}
          <NavButton
            id={isSuperAdmin ? "security_control" : "gate_portal"}
            label={isRTL ? (isSuperAdmin ? "سجل الحركات الميدانية" : "بوابة الأمن (الميدانية)") : (isSuperAdmin ? "Field Logs" : "Security Portal")}
            icon="🛂"
            onClick={() => navigateTo(isSuperAdmin ? "security_control" : "gate_portal")}
          />
        </div>

        {/* 3. مديول القوى البشرية */}
        <div className="space-y-2">
          <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-500 bg-blue-500/5`}>
            <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{isRTL ? "القوى البشرية" : "Personnel"}</h3>
          </div>
          <NavButton id="personnel" label={isRTL ? "إدارة الأقسام" : "Department Hub"} icon="🏢" onClick={() => navigateTo("personnel")} />
          <NavButton id="employees" label={isRTL ? "سجلات الموظفين" : "Staff Records"} icon="👥" onClick={() => navigateTo("employees")} />
        </div>

        {/* 4. مديول المقاولين */}
        <div className="space-y-2">
          <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-amber-500 bg-amber-500/5`}>
            <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{isRTL ? "إدارة المقاولين" : "Contractor Hub"}</h3>
          </div>
          <NavButton id="contractors_mgmt" label={isRTL ? "إدارة الشركات" : "Companies Hub"} icon="🏗️" onClick={() => navigateTo("contractors_mgmt")} />
          <NavButton id="contractors" label={isRTL ? "حصر العمالة" : "Labor Records"} icon="👷" onClick={() => navigateTo("contractors")} />
        </div>

        {/* 5. مديول الصلاحيات (Admin Only) */}
        {canManageUsers && (
          <div className="space-y-2">
            <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-zinc-500 bg-zinc-500/5`}>
              <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{isRTL ? "إدارة المنظومة" : "Governance"}</h3>
            </div>
            <NavButton id="users" label={isRTL ? "إدارة طاقم SOC" : "Staff Control"} icon="👑" onClick={() => navigateTo("users")} />
          </div>
        )}
      </nav>

      {/* 6. مركز البلاغات (Footer) */}
      <div className={`p-6 mt-auto border-t transition-all ${isDark ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
        <NavButton id="tickets" label={isRTL ? "البلاغات والطلبات" : "Tickets & SOC Requests"} icon="🚨" badge={requestsCount + ticketsCount} onClick={() => navigateTo("tickets")} color="red" />
        <div className="text-center mt-4">
          <p className="text-[8px] font-black text-[#C4B687] uppercase tracking-[0.4em] opacity-40">MAADEN SOC SYSTEM v6.0</p>
        </div>
      </div>

    </aside>
  );
}