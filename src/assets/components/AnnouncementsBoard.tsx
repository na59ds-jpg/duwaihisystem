import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useApp } from "../../App";

/**
 * AnnouncementsBoard Component
 * Displays a scrollable list of security bulletins and news.
 * Designed for the Login Screen with a glassmorphism look.
 */
export function AnnouncementsBoard() {
    const { language } = useApp();
    const isRTL = language === 'ar';
    const [announcements, setAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        // Subscription to security_announcements collection
        const q = query(collection(db, "security_announcements"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    if (announcements.length === 0) return null;

    return (
        <div className="w-full max-w-sm ml-auto mr-auto lg:mr-0 lg:ml-auto h-[600px] flex flex-col p-6 rounded-[2.5rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-8 duration-700 relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter shadow-black drop-shadow-lg">
                        {isRTL ? "لوحة التنبيهات الأمنية" : "Security Bulletin"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-[#C4B687] animate-pulse"></span>
                        <p className="text-[9px] font-black text-[#C4B687] uppercase tracking-[0.2em] opacity-80">
                            {isRTL ? "تحديثات مباشرة" : "Live Updates"}
                        </p>
                    </div>
                </div>
                <div className="text-2xl opacity-50">📡</div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {announcements.map((item) => (
                    <div key={item.id} className={`p-5 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.02] ${item.priority === 'High' ? 'bg-red-900/10 border-red-500/30' : 'bg-white/5 border-white/5 hover:border-[#C4B687]/30'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${item.priority === 'High' ? 'bg-red-500 text-white' : 'bg-[#C4B687]/20 text-[#C4B687]'}`}>
                                {item.priority === 'High' ? (isRTL ? "عاجل" : "URGENT") : (isRTL ? "تنويه" : "INFO")}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-500">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ""}</span>
                        </div>
                        <h4 className={`text-sm font-black mb-1 ${item.priority === 'High' ? 'text-red-400' : 'text-white'}`}>
                            {item.title}
                        </h4>
                        <p className="text-xs font-medium text-zinc-300 leading-relaxed whitespace-pre-line">
                            {item.content}
                        </p>
                    </div>
                ))}
            </div>

            {/* Footer Fade Effect */}
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
        </div>
    );
}
