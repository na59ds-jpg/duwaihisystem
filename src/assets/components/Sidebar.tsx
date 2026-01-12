import { useEffect, useState } from "react";
import { useApp } from "../../App";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export function Sidebar({ activeTab, navigateTo, activeFilter }: { activeTab: string; navigateTo: (tab: string, filter?: string) => void; activeFilter?: string | null }) {
  const { language, user, theme } = useApp();
  const isRTL = language === 'ar';
  const isDark = theme === 'dark';

  const [requestsCount, setRequestsCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);

  const isSuperAdmin = user?.username === 'admin' || user?.role === 'Admin';
  const isLeader = user?.role === 'Leader';
  const canManageUsers = isSuperAdmin || isLeader;

  useEffect(() => {
    // مراقبة طلبات الخدمة (البطاقات والتصاريح)
    const requestsQuery = query(collection(db, "security_requests"), where("status", "==", "pending"));
    const unsubRequests = onSnapshot(requestsQuery, (snap) => setRequestsCount(snap.size));

    // مراقبة البلاغات (Tickets)
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
        className={`w-full flex items-center gap-4 transition-all duration-500 rounded-2xl font-bold relative px-6 py-4 mb-2 group ${isActive
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
    <aside className={`w-80 flex flex-col h-full overflow-hidden transition-all duration-500 ${isRTL ? 'border-l' : 'border-r'} backdrop-blur-3xl z-30 ${isDark ? 'bg-black/60 border-white/5' : 'bg-white border-zinc-100 shadow-xl'
      }`} dir={isRTL ? "rtl" : "ltr"}>

      <div className={`p-10 text-center border-b border-[#C4B687]/10 ${isDark ? 'bg-black/20' : 'bg-zinc-50/50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center p-4 shadow-2xl">
            <img src="/logo.png" alt="Maaden" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className={`text-2xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>MASAR</span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] mt-1 text-[#C4B687]">DUWAIHI MINE</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 space-y-8 pt-6 custom-scrollbar">
        {/* مركز القيادة */}
        <div className="space-y-2">
          <NavButton id="dashboard" label={isRTL ? "لوحة التحكم الاستراتيجية" : "Command Dashboard"} icon="🛡️" onClick={() => navigateTo("dashboard")} />
        </div>

        {/* مديول القوى البشرية */}
        <div className="space-y-2">
          <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-blue-500 bg-blue-500/5`}>
            <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{isRTL ? "القوى البشرية" : "Personnel"}</h3>
          </div>
          <NavButton id="personnel" label={isRTL ? "إدارة الأقسام" : "Departments"} icon="🏢" onClick={() => navigateTo("management", "personnel")} />
          <NavButton id="employees" label={isRTL ? "سجلات الموظفين" : "Employees"} icon="👥" onClick={() => navigateTo("employees")} />
        </div>

        {/* مديول المقاولين */}
        <div className="space-y-2">
          <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-amber-500 bg-amber-500/5`}>
            <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{isRTL ? "إدارة المقاولين" : "Contractors"}</h3>
          </div>
          <NavButton id="contractors_mgmt" label={isRTL ? "إدارة الشركات" : "Companies"} icon="🏗️" onClick={() => navigateTo("management", "contractors")} />
          <NavButton id="contractors" label={isRTL ? "حصر العمالة" : "Labor Records"} icon="👷" onClick={() => navigateTo("contractors")} />
        </div>

        {/* إدارة المنظومة */}
        {canManageUsers && (
          <div className="space-y-2">
            <div className={`px-5 py-1 mb-3 ${isRTL ? 'border-r-4' : 'border-l-4'} border-zinc-500 bg-zinc-500/5`}>
              <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{isRTL ? "إدارة النظام" : "System Admin"}</h3>
            </div>
            <NavButton id="users" label={isRTL ? "إدارة المستخدمين" : "User Access"} icon="👑" onClick={() => navigateTo("users")} />
            <NavButton id="accounts_audit" label={isRTL ? "رقابة الحسابات" : "Account Audit"} icon="👑" onClick={() => navigateTo("management", "accounts_audit")} />
          </div>
        )}
      </nav>

      {/* منطقة العمليات (هنا التعديل المطلوب يا نواف) */}
      <div className={`p-6 mt-auto border-t space-y-2 ${isDark ? 'border-white/5 bg-black/40' : 'border-zinc-100 bg-zinc-50'}`}>
        <div className="mb-4 text-center">
          <h3 className="text-[9px] font-black text-[#C4B687] uppercase tracking-widest opacity-50">{isRTL ? "قسم البلاغات والطلبات" : "Requests & SOC"}</h3>
        </div>

        {/* نقل بطاقة طلبات الخدمة لتكون هنا */}
        {isSuperAdmin && (
          <NavButton
            id="service_requests"
            label={isRTL ? "طلبات الخدمة" : "Service Requests"}
            icon="📂"
            onClick={() => navigateTo("management", "service_requests")}
            badge={requestsCount}
            color="emerald"
          />
        )}

        <NavButton
          id="tickets"
          label={isRTL ? "البلاغات الأمنية" : "Security Tickets"}
          icon="🚨"
          badge={ticketsCount}
          onClick={() => navigateTo("tickets")}
          color="red"
        />

        <div className="text-center mt-4">
          <p className="text-[8px] font-black text-[#C4B687] uppercase tracking-[0.4em] opacity-40">MAADEN SOC v6.0</p>
        </div>
      </div>
    </aside>
  );
}