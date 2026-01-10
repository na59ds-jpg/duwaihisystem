import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { useApp } from "../../App";

/**
 * Maaden Duwaihi Mine - Security Visitor Authorization Center
 * FEATURE: Gate Routing & Document Verification.
 * UPDATED: Strictly follows ID/Iqama standards. Removed Passport options.
 */

export function GatePass({ onBack }: { onBack: () => void }) {
  const { theme, language } = useApp(); 
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(false);
  const [dbGates, setDbGates] = useState<any[]>([]); 
  
  // بيانات الزيارة الأساسية (مبسطة وفق الحاجة الميدانية)
  const [visitInfo, setVisitInfo] = useState({
    company: "",
    hostName: "",
    permitNo: "", // رقم التصريح الورقي المرجعي إن وجد
    targetGateId: "", 
  });

  // قائمة الزوار - اعتماد رقم الهوية/الإقامة فقط
  const [visitorList, setVisitorList] = useState([{ name: "", idNo: "", nationality: isRTL ? "السعودية" : "Saudi Arabia" }]);
  
  // مرفقات الزوار الرسمية
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    [isRTL ? "صورة التصريح المعتمد" : "Approved Permit Photo"]: null,
    [isRTL ? "وثائق الهوية / الإقامة" : "ID / Iqama Documents"]: null
  });

  useEffect(() => {
    const unsubGates = onSnapshot(query(collection(db, "security_gates"), orderBy("nameAr", "asc")), (snap) => {
      setDbGates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubGates();
  }, []);

  const addVisitorRow = () => {
    setVisitorList([...visitorList, { name: "", idNo: "", nationality: isRTL ? "السعودية" : "Saudi Arabia" }]);
  };

  const uploadToCloudinary = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "duwaihi_preset");
    const res = await fetch(`https://api.cloudinary.com/v1_1/drrbaujge/auto/upload`, { method: "POST", body: data });
    const json = await res.json();
    return json.secure_url;
  };

  const handleSubmit = async () => {
    if (!visitInfo.company || !visitInfo.targetGateId || visitorList[0].name === "") {
      return alert(isRTL ? "يرجى تحديد البوابة واسم الزائر والجهة." : "Please select gate, visitor name, and entity.");
    }
    
    setLoading(true);
    try {
      const urls: { [key: string]: string } = {};
      for (const label of Object.keys(files)) {
        if (files[label]) urls[label] = await uploadToCloudinary(files[label]!);
      }

      await addDoc(collection(db, "visitor_logs"), {
        ...visitInfo,
        visitors: visitorList,
        attachments: urls,
        status: isRTL ? "بانتظار وصول الزائر" : "Awaiting Visitor",
        createdAt: serverTimestamp(),
        issuedBy: "Security Admin",
      });

      alert(isRTL ? "تم إرسال بيانات الزوار للبوابة بنجاح ✅" : "Visitor data sent to gate successfully ✅");
      onBack();
    } catch (err) {
      alert("Cloud Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`animate-in fade-in zoom-in duration-500 font-['Cairo'] pb-20`} dir={isRTL ? "rtl" : "ltr"}>
      {/* الهيدر */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-3 px-6 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] text-[#C4B687]">🔙 {isRTL ? 'عودة' : 'Back'}</button>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{isRTL ? "تصاريح دخول الزوار" : "Visitor Entry Permits"}</h2>
          <p className="text-[#C4B687] font-bold text-[9px] uppercase tracking-widest">Official Access Authorization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* تفاصيل التوجيه */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 rounded-[2rem] border shadow-xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
            <label className="text-[10px] font-black text-[#C4B687] block mb-3 uppercase">{isRTL ? "توجيه لبوابة: *" : "Route to Gate: *"}</label>
            <select 
               value={visitInfo.targetGateId} 
               onChange={(e) => setVisitInfo({...visitInfo, targetGateId: e.target.value})}
               className={`w-full p-4 rounded-xl border-2 font-black text-xs outline-none ${isDark ? 'bg-black border-white/5 text-white' : 'bg-zinc-50'}`}
            >
              <option value="">-- {isRTL ? "اختر البوابة" : "Select Gate"} --</option>
              {dbGates.map(g => <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.nameEn}</option>)}
            </select>
            <div className="mt-4 space-y-4">
               <InputItem label={isRTL ? "الجهة الزائرة" : "Visitor Entity"} value={visitInfo.company} onChange={(v:any)=>setVisitInfo({...visitInfo, company:v})} isDark={isDark} />
               <InputItem label={isRTL ? "المسؤول المستضيف" : "Host Name"} value={visitInfo.hostName} onChange={(v:any)=>setVisitInfo({...visitInfo, hostName:v})} isDark={isDark} />
            </div>
          </div>

          <div className={`p-6 rounded-[2rem] border shadow-xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
             <p className="text-[10px] font-black text-[#C4B687] mb-4 uppercase">{isRTL ? "المرفقات الرسمية" : "Attachments"}</p>
             <div className="grid gap-3">
                {Object.keys(files).map(label => (
                  <div key={label} className="relative h-24 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5">
                    <span className="text-xl">{files[label] ? "✅" : "📤"}</span>
                    <span className="text-[8px] font-black text-zinc-500 mt-1">{label}</span>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files && setFiles({...files, [label]: e.target.files[0]})} />
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* قائمة الزوار */}
        <div className="lg:col-span-8">
          <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDark ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <button onClick={addVisitorRow} className="bg-emerald-600 text-white p-2 px-6 rounded-lg font-black text-[10px]">+ {isRTL ? 'إضافة زائر' : 'Add Visitor'}</button>
              <h3 className="text-sm font-black text-[#C4B687]">{isRTL ? "قائمة الأشخاص المشمولين" : "Authorized Personnel List"}</h3>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {visitorList.map((v, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-center animate-in slide-in-from-bottom-2">
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase">{isRTL ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input value={v.name} onChange={e=>{const nl=[...visitorList]; nl[i].name=e.target.value; setVisitorList(nl)}} className="w-full bg-transparent border-b border-white/10 outline-none font-black text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-zinc-500 uppercase">{isRTL ? 'رقم الهوية / الإقامة' : 'ID / Iqama No'}</label>
                    <input value={v.idNo} onChange={e=>{const nl=[...visitorList]; nl[i].idNo=e.target.value; setVisitorList(nl)}} className="w-full bg-transparent border-b border-white/10 outline-none font-black text-sm" />
                  </div>
                  {visitorList.length > 1 && <button onClick={()=>setVisitorList(visitorList.filter((_,idx)=>idx!==i))} className="text-red-500 font-black">✕</button>}
                </div>
              ))}
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full mt-10 p-5 bg-[#C4B687] text-black rounded-2xl font-[900] text-xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {loading ? '...' : (isRTL ? "اعتماد وإرسال التصريح للبوابة ➔" : "Issue & Send Permit to Gate ➔")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputItem({ label, value, onChange, isDark }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-zinc-500 uppercase">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`w-full p-3 rounded-xl border outline-none font-black text-xs ${isDark ? 'bg-black border-white/5 text-white focus:border-[#C4B687]' : 'bg-zinc-50'}`} />
    </div>
  );
}