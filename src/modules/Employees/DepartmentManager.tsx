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
 * Maaden Duwaihi Mine - Department Management Module (v6.0)
 * Purpose: Managing administrative departments for Maaden staff.
 * FEATURE: Auto-Icon generation and safe deletion logic.
 */

export default function DepartmentManager() {
  const { theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const [depts, setDepts] = useState<any[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [loading, setLoading] = useState(false);

  // جلب الأقسام الرسمية (النوع: dept) من الهيكل التنظيمي
  useEffect(() => {
    const q = query(
      collection(db, "structure"),
      where("type", "==", "dept"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDepts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  // إضافة قسم جديد للهيكل الإداري للمنجم
  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "structure"), {
        name: newDeptName.trim(),
        type: "dept",
        createdAt: serverTimestamp()
      });
      setNewDeptName("");
    } catch (error) {
      console.error("Error adding department:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-view p-6 space-y-8 font-['Cairo'] relative z-10">

      {/* لوحة التحكم الرئيسية لإضافة الأقسام */}
      <div className={`p-8 rounded-[2.5rem] shadow-2xl border-t-4 border-t-[#C4B687] backdrop-blur-xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-2xl font-black text-[#C4B687] uppercase tracking-widest">
              {isRTL ? "إدارة الأقسام الإدارية" : "Admin Department Hub"}
            </h3>
            <p className="text-[10px] font-black opacity-40 tracking-[0.2em] mt-1 uppercase">
              {isRTL ? "هيكلة الأقسام الرسمية - منجم الدويحي" : "Official Internal Mine Structure"}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-[#C4B687]/10 flex items-center justify-center border border-[#C4B687]/20 shadow-lg">
            <span className="text-2xl">🏢</span>
          </div>
        </div>

        {/* حقل الإضافة المتطور */}
        <div className={`flex gap-4 p-2 rounded-3xl border shadow-inner ${isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
          <input
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder={isRTL ? "أدخل مسمى القسم الجديد..." : "Enter new department name..."}
            className={`flex-1 p-5 rounded-2xl bg-transparent outline-none font-black text-sm transition-all ${isDark ? 'text-white placeholder-white/20' : 'text-zinc-900 placeholder-zinc-400'}`}
          />
          <button
            onClick={handleAddDept}
            disabled={loading}
            className={`px-12 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl ${loading ? 'bg-zinc-600 cursor-not-allowed text-zinc-400' : 'bg-[#C4B687] text-black hover:brightness-110'
              }`}
          >
            {loading ? "..." : (isRTL ? "اعتماد القسم +" : "Approve Dept +")}
          </button>
        </div>
      </div>

      {/* عرض الأقسام المسجلة كبطاقات تعريفية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {depts.map((dept) => (
          <div
            key={dept.id}
            className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.03] hover:shadow-2xl group ${isDark ? 'bg-black/40 border-white/5 hover:border-[#C4B687]/40 shadow-black' : 'bg-white border-zinc-100 hover:border-[#C4B687] shadow-zinc-200'
              }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-5">
                {/* توليد أيقونة نصية من اسم القسم */}
                <div className="w-12 h-12 rounded-2xl bg-[#C4B687]/10 flex items-center justify-center text-xs font-black text-[#C4B687] border border-[#C4B687]/20 shadow-inner group-hover:bg-[#C4B687] group-hover:text-black transition-all">
                  {dept.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{dept.name}</p>
                  <p className="text-[8px] font-black opacity-30 uppercase italic tracking-tighter">Corporate Unit</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (window.confirm(isRTL ? "تنبيه: حذف القسم سيؤثر على تصفية بيانات الموظفين المسجلين تحته. هل تود المتابعة؟" : "Warning: This affects staff filtering. Continue?")) {
                    deleteDoc(doc(db, "structure", dept.id));
                  }
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500/20 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* شاشة حالة "لا توجد بيانات" */}
      {depts.length === 0 && (
        <div className="py-32 text-center opacity-20 select-none">
          <p className="font-black text-[10px] uppercase tracking-[0.8em] text-inherit animate-pulse">
            {isRTL ? "بانتظار إضافة أقسام إدارية" : "Awaiting Department Entries"}
          </p>
        </div>
      )}
    </div>
  );
}