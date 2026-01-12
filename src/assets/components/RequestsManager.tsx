import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, where } from "firebase/firestore";
import { useApp } from "../../App";

export function RequestsManager({ onBack }: { onBack: () => void }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [filterType, setFilterType] = useState<'employee' | 'contractor'>('employee'); // حالة الفلترة الجديدة
    const { theme, language } = useApp();
    const isDark = theme === 'dark';
    const isRTL = language === 'ar';

    useEffect(() => {
        // جلب الطلبات قيد الانتظار فقط
        const q = query(
            collection(db, "security_requests"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // تصفية الطلبات بناءً على التبويب المختار
    const filteredRequests = requests.filter(r => {
        if (filterType === 'employee') {
            return r.type?.includes('employee') || r.type?.includes('private_vehicle');
        } else {
            return r.type?.includes('contractor') || r.type?.includes('contractor_vehicle');
        }
    });

    const handleStatusChange = async (reqId: string, newStatus: string) => {
        if (newStatus === 'rejected') {
            const reason = prompt(isRTL ? "يرجى إدخال سبب الرفض:" : "Please enter rejection reason:");
            if (!reason) return;

            await updateDoc(doc(db, "security_requests", reqId), {
                status: 'rejected',
                rejectionReason: reason,
                updatedAt: new Date().toISOString()
            });
            alert(isRTL ? "تم رفض الطلب وتسجيل السبب" : "Request rejected with reason");
        } else {
            if (confirm(isRTL ? "هل أنت متأكد من قبول هذا الطلب؟" : "Confirm approval?")) {
                await updateDoc(doc(db, "security_requests", reqId), {
                    status: 'approved',
                    updatedAt: new Date().toISOString()
                });
                alert(isRTL ? "تم قبول الطلب بنجاح ✅" : "Request approved ✅");
            }
        }
    };

    const handleDelete = async (reqId: string) => {
        if (confirm(isRTL ? "حذف الطلب نهائياً من قاعدة البيانات؟" : "Delete permanently?")) {
            await deleteDoc(doc(db, "security_requests", reqId));
        }
    }

    const formatKey = (key: string) => {
        const translations: any = {
            personalPhoto: 'صورة',
            nationalIdCard: 'هوية',
            maadenCard: 'معادن',
            driverLicense: 'رخصة',
            vehicleReg: 'استمارة',
            insurance: 'تأمين'
        };
        return translations[key] || key;
    };

    return (
        <div className={`p-10 rounded-[3.5rem] border shadow-2xl animate-view ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'} font-['Cairo']`} dir={isRTL ? "rtl" : "ltr"}>

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                <div>
                    <h3 className="text-2xl font-[900] text-[#C4B687] uppercase tracking-tighter">{isRTL ? "إدارة طلبات الخدمة" : "Service Requests Management"}</h3>
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">{isRTL ? "مركز تدقيق البيانات" : "Data Audit Center"}</p>
                </div>

                {/* أزرار الفلترة الجديدة لتسهيل الوصول للموظفين والمقاولين */}
                <div className="flex gap-2 p-1.5 bg-black/10 rounded-2xl border border-white/5 shadow-inner">
                    <button
                        onClick={() => setFilterType('employee')}
                        className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${filterType === 'employee' ? 'bg-[#C4B687] text-black shadow-lg' : 'text-zinc-500 hover:text-[#C4B687]'}`}>
                        {isRTL ? "قائمة الموظفين" : "Employees"}
                    </button>
                    <button
                        onClick={() => setFilterType('contractor')}
                        className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${filterType === 'contractor' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-500 hover:text-amber-600'}`}>
                        {isRTL ? "قائمة المقاولين" : "Contractors"}
                    </button>
                </div>

                <button onClick={onBack} className="px-6 py-2 rounded-xl bg-[#C4B687]/10 text-[#C4B687] hover:bg-[#C4B687] hover:text-black font-black transition-all">🔙 {isRTL ? "عودة" : "Back"}</button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className={`w-full ${isRTL ? "text-right" : "text-left"} text-sm border-separate border-spacing-y-2`}>
                    <thead>
                        <tr className={`opacity-50 font-black uppercase ${isDark ? "text-[#C4B687]" : "text-zinc-600"}`}>
                            <th className="p-4">{isRTL ? "رقم الطلب" : "Req ID"}</th>
                            <th className="p-4">{isRTL ? "مقدم الطلب" : "Applicant"}</th>
                            <th className="p-4">{isRTL ? "رقم الهوية" : "ID"}</th>
                            <th className="p-4">{isRTL ? "نوع الخدمة" : "Service"}</th>
                            <th className="p-4 text-center">{isRTL ? "المرفقات" : "Files"}</th>
                            <th className="p-4 text-center">{isRTL ? "القرار الإداري" : "Decision"}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.map((r) => (
                            <tr key={r.id} className={`group transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-zinc-50 hover:bg-zinc-100"} rounded-2xl`}>
                                <td className="p-4 font-mono font-black text-[#C4B687] rounded-s-2xl">{r.requestId}</td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className={`font-black ${isDark ? "text-white" : "text-zinc-900"}`}>{isRTL ? r.fullNameAr : r.fullNameEn}</span>
                                        <span className="text-[10px] opacity-60 font-mono italic">{r.dept || r.companyName}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono font-bold opacity-70">{r.idNumber}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-black border border-white/10">
                                        {r.type}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        {r.attachments && Object.keys(r.attachments).length > 0 ? (
                                            Object.entries(r.attachments).map(([key, url]: any) => (
                                                <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                                                    className="group/btn relative w-9 h-9 flex items-center justify-center rounded-xl bg-[#C4B687]/20 text-[#C4B687] hover:bg-[#C4B687] hover:text-black transition-all shadow-sm"
                                                    title={formatKey(key)}>
                                                    <span className="text-lg">📎</span>
                                                    <span className="absolute -top-8 scale-0 group-hover/btn:scale-100 bg-black text-white text-[8px] px-2 py-1 rounded transition-all whitespace-nowrap z-50">{formatKey(key)}</span>
                                                </a>
                                            ))
                                        ) : (
                                            <span className="text-[10px] opacity-30 italic">{isRTL ? "لا يوجد" : "None"}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 rounded-e-2xl">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleStatusChange(r.id, 'approved')} className="flex-1 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all font-black text-[10px] border border-emerald-500/20">
                                            {isRTL ? "قبول" : "APPROVE"}
                                        </button>
                                        <button onClick={() => handleStatusChange(r.id, 'rejected')} className="flex-1 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all font-black text-[10px] border border-red-500/20">
                                            {isRTL ? "رفض" : "REJECT"}
                                        </button>
                                        <button onClick={() => handleDelete(r.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRequests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 opacity-20">
                        <span className="text-6xl mb-4">📥</span>
                        <p className="font-black text-xl uppercase tracking-widest">{isRTL ? "لا توجد طلبات معلقة حالياً" : "No Pending Requests"}</p>
                    </div>
                )}
            </div>
        </div>
    );
}