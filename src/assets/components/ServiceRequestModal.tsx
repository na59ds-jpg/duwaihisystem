import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { uploadToCloudinary } from '../../utils/cloudinary';
import type { StructureItem } from '../../types';

interface ServiceRequestModalProps {
    type: 'employee_card' | 'contractor_card' | 'private_vehicle' | 'company_vehicle' | 'contractor_vehicle' | 'inquiry';
    onClose: () => void;
    departments: StructureItem[];
    companies: StructureItem[];
    theme: 'light' | 'dark';
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({ type, onClose, departments, companies }) => {
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    // Updated field names: natId -> idNumber
    const [formData, setFormData] = useState<any>({
        requestType: 'new',
        fullNameAr: '', fullNameEn: '',
        empId: '', title: '', grade: '',
        nationality: '', dob: '', idNumber: '', // Unified Field Name
        placeOfBirth: '', bloodGroup: '',
        mobile: '',
        dept: '', section: '',
        licenseType: '', licenseNo: '', licenseExpiry: '',
        plateNo: '', vehicleColor: '', vehicleModel: '', vehicleType: '',
        ownerName: '', permitType: 'permanent',
    });

    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        personalPhoto: null, nationalIdCard: null, maadenCard: null,
        driverLicense: null, vehicleReg: null, insurance: null,
    });

    const getConfig = () => {
        switch (type) {
            case 'employee_card':
                return { title: "طلب بطاقة موظف / Employee ID Card Request", penalties: "خصم أجر يومين من الراتب في حال فقدان البطاقة.", requiredFiles: ['personalPhoto', 'nationalIdCard'] };
            case 'contractor_card':
                return { title: "طلب بطاقة مقاول / Contractor ID Request", penalties: "غرامة 500 ريال في حال فقدان البطاقة.", requiredFiles: ['personalPhoto', 'nationalIdCard', 'maadenCard'] };
            case 'private_vehicle': case 'company_vehicle': case 'contractor_vehicle':
                return { title: "طلب تصريح مركبة / Vehicle Permit Request", penalties: "السرعة 20 كم/س في مناطق التشغيل والسكن، و60 كم/س في باقي طرق المنجم.", requiredFiles: ['driverLicense', 'vehicleReg', 'insurance', 'maadenCard'] };
            default: return { title: "استعلام / Inquiry", penalties: "", requiredFiles: [] };
        }
    };
    const config = getConfig();

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFiles({ ...files, [key]: e.target.files[0] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress("جاري التحقق...");

        const missingFiles = config.requiredFiles.filter(key => !files[key]);
        if (missingFiles.length > 0) {
            alert(`المستندات المطلوبة ناقصة: \n ${missingFiles.join(', ')}`);
            setLoading(false);
            return;
        }

        try {
            const uniqueId = `MS-${Math.floor(1000 + Math.random() * 9000)}`;
            const submissionDate = new Date().toISOString();

            const payload = {
                type,
                requestId: uniqueId,
                ...formData,
                status: "uploading",
                createdAt: serverTimestamp(),
                submittedAt: submissionDate,
                attachments: {},
            };
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            setUploadProgress("جاري حفظ البيانات...");

            // Explicit collection: security_requests
            const docRef = await addDoc(collection(db, "security_requests"), payload);
            console.log("Document created successfully with ID:", docRef.id);

            setUploadProgress("جاري رفع المرفقات...");
            const attachments: any = {};

            for (const key of Object.keys(files)) {
                if (files[key]) {
                    try {
                        console.log(`Uploading ${key}...`);
                        const url = await uploadToCloudinary(files[key]!);
                        attachments[key] = url;
                    } catch (uploadErr) {
                        console.error(`Failed to upload ${key}:`, uploadErr);
                    }
                }
            }

            setUploadProgress("جاري إنهاء الطلب...");
            await updateDoc(doc(db, "security_requests", docRef.id), {
                attachments,
                status: "pending"
            });
            console.log("Document updated with attachments.");

            alert(`✅ تم إرسال الطلب بنجاح! \n رقم الطلب: ${uniqueId}`);
            onClose();

        } catch (err: any) {
            console.error("CRITICAL SUBMISSION ERROR:", err);
            alert(`❌ حدث خطأ أثناء الإرسال: \n ${err.message || JSON.stringify(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchLoading(true);
        try {
            let q = query(collection(db, "security_requests"), where("requestId", "==", searchQuery.trim()));
            let snap = await getDocs(q);
            if (snap.empty) {
                // Unified Field Search
                q = query(collection(db, "security_requests"), where("idNumber", "==", searchQuery.trim()));
                snap = await getDocs(q);
            }
            if (!snap.empty) setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
            else alert("لم يتم العثور على أي طلب بهذا الرقم");
        } catch (err) {
            console.error("Search Error:", err);
            alert("حدث خطأ أثناء البحث، يرجى المحاولة لاحقاً");
        }
        setSearchLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[10px] p-4 font-['Tajawal']" dir="rtl">

            <div className="w-full max-w-4xl rounded-[2.5rem] relative flex flex-col max-h-[90vh] overflow-hidden border border-[#C4B687]/30 animate-in zoom-in-95 duration-500 glass-card bg-zinc-900/95 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

                <div className="p-6 border-b border-[#C4B687]/20 flex justify-between items-start bg-white/5 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-black text-[#C4B687] uppercase tracking-tighter flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-[#C4B687] rounded-full shadow-[0_0_15px_rgba(196,182,135,0.6)]"></div>
                            {config.title}
                        </h2>
                        <p className="text-zinc-400 text-xs font-bold mt-1 ml-5">يرجى تعبئة جميع الحقول بدقة</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-red-500 text-3xl font-black transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
                    {loading && (
                        <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <span className="text-4xl animate-bounce mb-4">🚀</span>
                            <h3 className="text-xl font-black text-[#C4B687]">{uploadProgress || "جاري المعالجة..."}</h3>
                            <p className="text-xs text-zinc-400 mt-2">يرجى عدم إغلاق النافذة...</p>
                        </div>
                    )}

                    {type === 'inquiry' ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-2xl mx-auto space-y-8">
                            {!searchResult ? (
                                <form onSubmit={handleSearch} className="w-full flex gap-4 flex-col items-center">
                                    <div className="text-center space-y-2 mb-4">
                                        <span className="text-5xl animate-bounce inline-block text-[#C4B687]">🔍</span>
                                        <h3 className="text-2xl font-black text-white">تتبع حالة الطلب</h3>
                                    </div>
                                    <input type="text" placeholder="رقم الطلب (MS-XXXX) أو رقم الهوية" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full p-5 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 text-white shadow-lg backdrop-blur-md font-black text-center text-lg focus:border-[#C4B687] outline-none transition-all uppercase placeholder:normal-case" />
                                    <button disabled={searchLoading} className="px-8 py-3 bg-[#C4B687] text-black rounded-xl font-black uppercase hover:scale-105 transition-all">{searchLoading ? "..." : "بحث عن الطلب"}</button>
                                </form>
                            ) : (
                                <div className="w-full p-8 rounded-[2rem] border border-white/10 bg-white/5 text-center">
                                    <h2 className="text-2xl font-black text-white mb-2">{searchResult.status}</h2>
                                    <p className="text-zinc-400">رقم الطلب: {searchResult.requestId}</p>
                                    <button onClick={() => setSearchResult(null)} className="mt-6 text-[#C4B687] underline">بحث آخر</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-4 gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                                {['new', 'renew', 'lost', 'damaged'].map(rt => (
                                    <label key={rt} className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border ${formData.requestType === rt ? 'border-[#C4B687] bg-[#C4B687] text-black' : 'border-transparent text-zinc-500 hover:bg-white/5'}`}>
                                        <input type="radio" name="reqType" value={rt} checked={formData.requestType === rt} onChange={(e) => setFormData({ ...formData, requestType: e.target.value })} className="hidden" />
                                        <span className="text-sm font-black uppercase">{rt === 'new' ? 'جديد' : rt === 'renew' ? 'تجديد' : rt === 'lost' ? 'بدل فاقد' : 'بدل تالف'}</span>
                                    </label>
                                ))}
                            </div>

                            <SectionTitle title="البيانات الشخصية / Personal Information" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-white">
                                <Input label="الاسم الكامل (En)" value={formData.fullNameEn} onChange={(e: any) => setFormData({ ...formData, fullNameEn: e.target.value })} required dir="ltr" />
                                <Input label="الاسم الكامل (عربي)" value={formData.fullNameAr} onChange={(e: any) => setFormData({ ...formData, fullNameAr: e.target.value })} dir="rtl" required />
                                <Input label="رقم الهوية / الإقامة" value={formData.idNumber} onChange={(e: any) => setFormData({ ...formData, idNumber: e.target.value })} required />
                                <Input label="الرقم الوظيفي" value={formData.empId} onChange={(e: any) => setFormData({ ...formData, empId: e.target.value })} required />
                                <Input label="المسمى الوظيفي" value={formData.title} onChange={(e: any) => setFormData({ ...formData, title: e.target.value })} required />
                                <Input label="المرتبة (Grade)" value={formData.grade} onChange={(e: any) => setFormData({ ...formData, grade: e.target.value })} />
                                <Input label="الجنسية" value={formData.nationality} onChange={(e: any) => setFormData({ ...formData, nationality: e.target.value })} required />
                                <Input label="تاريخ الميلاد" type="date" value={formData.dob} onChange={(e: any) => setFormData({ ...formData, dob: e.target.value })} required />
                                <Input label="رقم الجوال" value={formData.mobile} onChange={(e: any) => setFormData({ ...formData, mobile: e.target.value })} required />
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">الإدارة / الشركة</label>
                                    <select className="p-4 border border-white/10 rounded-2xl bg-black/40 text-white font-bold text-sm outline-none focus:border-[#C4B687]"
                                        value={type.includes('contractor') ? formData.companyName : formData.dept}
                                        onChange={(e) => type.includes('contractor') ? setFormData({ ...formData, companyName: e.target.value }) : setFormData({ ...formData, dept: e.target.value })}>
                                        <option value="">-- اختر --</option>
                                        {type.includes('contractor') ? companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {(type.includes('vehicle')) && (
                                <>
                                    <SectionTitle title="بيانات المركبة / Vehicle Data" />
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-white">
                                        <Input label="نوع الرخصة" value={formData.licenseType} onChange={(e: any) => setFormData({ ...formData, licenseType: e.target.value })} />
                                        <Input label="رقم الرخصة" value={formData.licenseNo} onChange={(e: any) => setFormData({ ...formData, licenseNo: e.target.value })} />
                                        <Input label="رقم اللوحة" value={formData.plateNo} onChange={(e: any) => setFormData({ ...formData, plateNo: e.target.value })} />
                                        <Input label="الموديل" value={formData.vehicleModel} onChange={(e: any) => setFormData({ ...formData, vehicleModel: e.target.value })} />
                                    </div>
                                </>
                            )}

                            <SectionTitle title="المرفقات / Attachments" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {config.requiredFiles.map(fileKey => (
                                    <div key={fileKey} className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer relative ${files[fileKey] ? 'border-green-500/50 bg-green-500/10' : 'border-zinc-700 hover:border-[#C4B687] bg-white/5'}`}>
                                        <span className="text-3xl mb-3">{files[fileKey] ? '✅' : '📂'}</span>
                                        <span className="text-[10px] font-black uppercase text-zinc-400 mb-3">{formatAttachmentName(fileKey)}</span>
                                        <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(fileKey, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                                <button type="button" onClick={onClose} className="px-8 py-3 font-bold text-zinc-500 hover:text-white transition-colors">إلغاء</button>
                                <button type="submit" disabled={loading} className="px-10 py-3 bg-[#C4B687] text-black font-black text-sm uppercase rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(196,182,135,0.4)] disabled:opacity-50">
                                    {loading ? (uploadProgress || "جاري المعالجة...") : "إرسال الطلب"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const SectionTitle = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 py-4 border-b border-white/10 mb-4 mt-6">
        <div className="h-1.5 w-10 bg-[#C4B687] rounded-full"></div>
        <h3 className="text-sm font-black text-zinc-300 uppercase tracking-widest">{title}</h3>
    </div>
);

const Input = ({ label, dir = 'rtl', ...props }: any) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">{label}</label>
        <input {...props} dir={dir} className={`p-4 border border-white/10 bg-black/40 rounded-2xl outline-none focus:border-[#C4B687] transition-all font-bold text-white placeholder-zinc-600 focus:bg-black/60 ${dir === 'rtl' ? 'font-serif' : 'font-mono'}`} />
    </div>
);

const formatAttachmentName = (key: string) => {
    const names: any = {
        personalPhoto: 'الصورة الشخصية',
        nationalIdCard: 'الهوية الوطنية / الإقامة',
        maadenCard: 'بطاقة معادن (سابقة)',
        driverLicense: 'رخصة القيادة',
        vehicleReg: 'استمارة المركبة',
        insurance: 'تأمين المركبة'
    };
    return names[key] || key.replace(/([A-Z])/g, ' $1');
};