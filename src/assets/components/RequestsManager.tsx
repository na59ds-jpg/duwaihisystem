import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useApp } from "../../App";

export function RequestsManager({ onBack }: { onBack: () => void }) {
    const [requests, setRequests] = useState<any[]>([]);
    const { theme, language } = useApp();
    const isDark = theme === 'dark';
    const isRTL = language === 'ar';

    useEffect(() => {
        // Fetching from security_requests
        const q = query(collection(db, "security_requests"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    const handleStatusChange = async (reqId: string, newStatus: string) => {
        if (confirm(isRTL ? "هل أنت متأكد من تغيير الحالة؟" : "Confirm status change?")) {
            await updateDoc(doc(db, "security_requests", reqId), { status: newStatus });
        }
    };

    const handleDelete = async (reqId: string) => {
        if (confirm(isRTL ? "حذف الطلب نهائياً؟" : "Delete permanently?")) {
            await deleteDoc(doc(db, "security_requests", reqId));
        }
    }

    return (
        <div className={`p-10 rounded-[3.5rem] border shadow-2xl animate-view ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'} font-['Cairo']`} dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-2xl font-[900] text-[#C4B687] uppercase tracking-tighter">{isRTL ? "إدارة طلبات الخدمة" : "Service Requests Management"}</h3>
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">{isRTL ? "مركز العمليات الأمنية" : "Security Operations Center"}</p>
                </div>
                <button onClick={onBack} className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 font-black transition-all">🔙 {isRTL ? "عودة" : "Back"}</button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className={`w-full ${isRTL ? "text-right" : "text-left"} text-sm`}>
                    <thead>
                        <tr className={`border-b border-white/10 opacity-50 font-black uppercase ${isDark ? "text-[#C4B687]" : "text-zinc-600"}`}>
                            <th className="p-4">{isRTL ? "رقم الطلب" : "Req ID"}</th>
                            <th className="p-4">{isRTL ? "مقدم الطلب (الرقم الوظيفي)" : "Applicant (Emp ID)"}</th>
                            <th className="p-4">{isRTL ? "رقم الهوية" : "ID Number"}</th>
                            <th className="p-4">{isRTL ? "نوع الطلب" : "Type"}</th>
                            <th className="p-4">{isRTL ? "الحالة" : "Status"}</th>
                            <th className="p-4">{isRTL ? "تاريخ التقديم" : "Date"}</th>
                            <th className="p-4 text-center">{isRTL ? "المرفقات" : "Attachments"}</th>
                            <th className="p-4 text-center">{isRTL ? "الإجراء" : "Actions"}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {requests.map((r) => (
                            <tr key={r.id} className={`hover:bg-white/5 transition-colors ${isDark ? "text-white" : "text-zinc-900"}`}>
                                <td className="p-4 font-mono font-bold text-[#C4B687]">{r.requestId}</td>
                                <td className="p-4 font-bold">
                                    <div className="flex flex-col">
                                        <span>{isRTL ? r.fullNameAr : r.fullNameEn}</span>
                                        <span className="text-[10px] opacity-50 font-mono">{r.empId}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono opacity-70">{r.idNumber}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-black uppercase border border-white/10">
                                        {r.type}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${r.status === 'pending' || r.status === 'uploading' ? 'bg-amber-500/10 text-amber-500' : (r.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td className="p-4 text-[10px] font-mono opacity-50">{r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "---"}</td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-1">
                                        {r.attachments && Object.keys(r.attachments).length > 0 ? (
                                            Object.entries(r.attachments).map(([key, url]: any) => (
                                                <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded bg-[#C4B687]/10 text-[#C4B687] hover:bg-[#C4B687] hover:text-black transition-colors" title={key}>
                                                    📎
                                                </a>
                                            ))
                                        ) : (
                                            <span className="opacity-20">-</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleStatusChange(r.id, 'approved')} className="px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded hover:bg-emerald-500 hover:text-white transition-all font-bold text-[10px] uppercase">✓ {isRTL ? "قبول" : "Approve"}</button>
                                        <button onClick={() => handleStatusChange(r.id, 'rejected')} className="px-3 py-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all font-bold text-[10px] uppercase">✕ {isRTL ? "رفض" : "Reject"}</button>
                                        <button onClick={() => handleDelete(r.id)} className="w-6 h-6 flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all font-black">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {requests.length === 0 && <p className="text-center py-20 opacity-30 font-black">{isRTL ? "لا توجد طلبات معلقة" : "No pending requests"}</p>}
            </div>
        </div>
    );
}
