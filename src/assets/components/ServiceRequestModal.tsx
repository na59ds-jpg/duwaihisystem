import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { generateOfficialPDF } from '../../utils/pdfGenerator';
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
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    const [formData, setFormData] = useState<any>({
        requestType: 'new',
        fullNameAr: '', fullNameEn: '',
        empId: '', title: '', grade: '',
        nationality: '', dob: '', natId: '',
        placeOfBirth: '', bloodGroup: '',
        mobile: '',
        dept: '', section: '',
        // License/Vehicle Fields
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
                return { title: "Employee ID Card Request / طلب بطاقة موظف", penalties: "Loss of card due to negligence will result in a 2-day salary deduction. \n خصم أجر يومين من الراتب في حال فقدان البطاقة.", requiredFiles: ['personalPhoto', 'nationalIdCard'] };
            case 'contractor_card':
                return { title: "Contractor ID Request / طلب بطاقة مقاول", penalties: "500 SAR fine for lost card. \n غرامة 500 ريال في حال فقدان البطاقة.", requiredFiles: ['personalPhoto', 'nationalIdCard', 'maadenCard'] };
            case 'private_vehicle': case 'company_vehicle': case 'contractor_vehicle':
                return { title: "Vehicle Permit Request / طلب تصريح مركبة", penalties: "Speed limit: 20 km/h in operation/housing areas, 60 km/h in other mine areas. \n السرعة 20 كم/س في مناطق التشغيل والسكن، و60 كم/س في باقي طرق المنجم.", requiredFiles: ['driverLicense', 'vehicleReg', 'insurance', 'maadenCard'] };
            default: return { title: "Inquiry", penalties: "", requiredFiles: [] };
        }
    };
    const config = getConfig();

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFiles({ ...files, [key]: e.target.files[0] });
    };

    // --- TEXT-FIRST SUBMISSION STRATEGY ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress("Validating...");

        const missingFiles = config.requiredFiles.filter(key => !files[key]);
        if (missingFiles.length > 0) {
            alert(`Missing required documents / المستندات المطلوبة ناقصة: \n ${missingFiles.join(', ')}`);
            setLoading(false);
            return;
        }

        try {
            // 1. Generate ID & Prepare Initial Payload
            const uniqueId = `MS-${Math.floor(1000 + Math.random() * 9000)}`;
            const submissionDate = new Date().toISOString();

            const payload = {
                type,
                requestId: uniqueId,
                ...formData,
                status: "uploading", // STATUS indicates uploads are in progress
                createdAt: serverTimestamp(),
                submittedAt: submissionDate,
                attachments: {}, // Empty initially
            };
            // Clean undefined values
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            setUploadProgress("Saving Data...");
            console.log("Creating document in 'security_requests' table...", payload);

            // Create Document FIRST (Async Safety)
            const docRef = await addDoc(collection(db, "security_requests"), payload);
            console.log("Document created successfully with ID:", docRef.id);

            // 2. Upload Files
            setUploadProgress("Uploading Files...");
            const attachments: any = {};

            for (const key of Object.keys(files)) {
                if (files[key]) {
                    try {
                        console.log(`Uploading ${key}...`);
                        const url = await uploadToCloudinary(files[key]!);
                        attachments[key] = url;
                    } catch (uploadErr) {
                        console.error(`Failed to upload ${key}:`, uploadErr);
                        // Continue even if one fails
                    }
                }
            }

            // 3. Update Document with Attachments
            setUploadProgress("Finalizing...");
            await updateDoc(doc(db, "security_requests", docRef.id), {
                attachments,
                status: "pending"
            });
            console.log("Document updated with attachments.");

            // 4. PDF Generation & Close
            // LAYER ISOLATION: Hide Form Immediately
            setFormData((prev: any) => ({ ...prev, generatedId: uniqueId }));
            setIsGeneratingPdf(true); // This triggers the UI switch
            setLoading(false);

            alert(`✅ Request Submitted Successfully! \n ID: ${uniqueId}`);

            // Tiny delay to ensure React renders the hidden PDF template with new ID
            await new Promise(r => setTimeout(r, 800));

            await generateOfficialPDF("official-form-view", `Request_${uniqueId}`);

            console.log("PDF Generated. closing modal.");
            onClose();

        } catch (err: any) {
            console.error("CRITICAL SUBMISSION ERROR:", err);
            // REAL Error Message to User
            alert(`❌ Error Submitting Request: \n ${err.message || JSON.stringify(err)} \n Check Console for details.`);
            setLoading(false);
            setIsGeneratingPdf(false);
        }
    };

    // --- Search Logic ---
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
                q = query(collection(db, "security_requests"), where("natId", "==", searchQuery.trim()));
                snap = await getDocs(q);
            }
            if (!snap.empty) setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
            else alert("No request found / لم يتم العثور على طلب");
        } catch (err) {
            console.error("Search Error:", err);
            alert("Error searching / حدث خطأ في البحث");
        }
        setSearchLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[10px] p-4 font-['Tajawal']">

            {!isGeneratingPdf && (
                <div className="w-full max-w-4xl rounded-[2.5rem] relative flex flex-col max-h-[90vh] overflow-hidden border border-[var(--royal-gold)]/30 animate-in zoom-in-95 duration-500 glass-card bg-zinc-900/95 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

                    {/* Header */}
                    <div className="p-6 border-b border-[var(--royal-gold)]/20 flex justify-between items-start bg-white/5 backdrop-blur-md">
                        <div>
                            <h2 className="text-2xl font-black text-[var(--royal-gold)] uppercase tracking-tighter flex items-center gap-3">
                                <div className="w-1.5 h-8 bg-[var(--royal-gold)] rounded-full shadow-[0_0_15px_rgba(196,182,135,0.6)]"></div>
                                {config.title}
                            </h2>
                            <p className="text-zinc-400 text-xs font-bold mt-1 ml-5">Please fill all fields accurately / يرجى تعبئة جميع الحقول بدقة</p>
                        </div>
                        <button onClick={onClose} className="text-zinc-500 hover:text-red-500 text-3xl font-black transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">&times;</button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
                        {/* Overlay for Loading Text */}
                        {loading && (
                            <div className="absolute inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                <span className="text-4xl animate-bounce mb-4">🚀</span>
                                <h3 className="text-xl font-black text-[#C4B687]">{uploadProgress || "Processing..."}</h3>
                                <p className="text-xs text-zinc-400 mt-2">Please do not close this window...</p>
                            </div>
                        )}

                        {type === 'inquiry' ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-2xl mx-auto space-y-8">
                                {!searchResult ? (
                                    <form onSubmit={handleSearch} className="w-full flex gap-4 flex-col items-center">
                                        <div className="text-center space-y-2 mb-4">
                                            <span className="text-5xl animate-bounce inline-block text-[var(--royal-gold)]">🔍</span>
                                            <h3 className="text-2xl font-black text-white">Track Your Request / تتبع حالة الطلب</h3>
                                        </div>
                                        <input type="text" placeholder="MS-XXXX or ID Number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full p-5 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 text-white shadow-lg backdrop-blur-md font-black text-center text-lg focus:border-[var(--royal-gold)] outline-none transition-all uppercase placeholder:normal-case" />
                                        <button disabled={searchLoading} className="px-8 py-3 bg-[var(--royal-gold)] text-black rounded-xl font-black uppercase hover:scale-105 transition-all">{searchLoading ? "..." : "Check Status"}</button>
                                    </form>
                                ) : (
                                    <div className="w-full p-8 rounded-[2rem] border border-white/10 bg-white/5 text-center">
                                        <h2 className="text-2xl font-black text-white mb-2">{searchResult.status}</h2>
                                        <p className="text-zinc-400">ID: {searchResult.requestId}</p>
                                        <button onClick={() => setSearchResult(null)} className="mt-6 text-[var(--royal-gold)] underline">Check Another</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Type Selection */}
                                <div className="grid grid-cols-4 gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
                                    {['new', 'renew', 'lost', 'damaged'].map(rt => (
                                        <label key={rt} className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border ${formData.requestType === rt ? 'border-[var(--royal-gold)] bg-[var(--royal-gold)] text-black' : 'border-transparent text-zinc-500 hover:bg-white/5'}`}>
                                            <input type="radio" name="reqType" value={rt} checked={formData.requestType === rt} onChange={(e) => setFormData({ ...formData, requestType: e.target.value })} className="hidden" />
                                            <span className="text-sm font-black uppercase">{rt}</span>
                                            <span className="text-[10px] font-bold opacity-70">{rt === 'new' ? 'جديد' : rt === 'renew' ? 'تجديد' : rt === 'lost' ? 'بدل فاقد' : 'بدل تالف'}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Personal Info */}
                                <SectionTitle title="Personal Information / البيانات الشخصية" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-white">
                                    <Input label="Full Name (En)" value={formData.fullNameEn} onChange={(e: any) => setFormData({ ...formData, fullNameEn: e.target.value })} required />
                                    <Input label="Full Name (Ar)" value={formData.fullNameAr} onChange={(e: any) => setFormData({ ...formData, fullNameAr: e.target.value })} dir="rtl" required />
                                    <Input label="ID Number" value={formData.natId} onChange={(e: any) => setFormData({ ...formData, natId: e.target.value })} required />
                                    <Input label="Employee ID" value={formData.empId} onChange={(e: any) => setFormData({ ...formData, empId: e.target.value })} required />
                                    <Input label="Job Title" value={formData.title} onChange={(e: any) => setFormData({ ...formData, title: e.target.value })} required />
                                    <Input label="Grade" value={formData.grade} onChange={(e: any) => setFormData({ ...formData, grade: e.target.value })} />
                                    <Input label="Nationality" value={formData.nationality} onChange={(e: any) => setFormData({ ...formData, nationality: e.target.value })} required />
                                    <Input label="DOB" type="date" value={formData.dob} onChange={(e: any) => setFormData({ ...formData, dob: e.target.value })} required />
                                    <Input label="Mobile" value={formData.mobile} onChange={(e: any) => setFormData({ ...formData, mobile: e.target.value })} required />
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Department/Company</label>
                                        <select className="p-4 border border-white/10 rounded-2xl bg-black/40 text-white font-bold text-sm outline-none focus:border-[var(--royal-gold)]"
                                            value={type.includes('contractor') ? formData.companyName : formData.dept}
                                            onChange={(e) => type.includes('contractor') ? setFormData({ ...formData, companyName: e.target.value }) : setFormData({ ...formData, dept: e.target.value })}>
                                            <option value="">-- Select --</option>
                                            {type.includes('contractor') ? companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Vehicle Info */}
                                {(type.includes('vehicle')) && (
                                    <>
                                        <SectionTitle title="Vehicle Data / بيانات المركبة" />
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-white">
                                            <Input label="License Type" value={formData.licenseType} onChange={(e: any) => setFormData({ ...formData, licenseType: e.target.value })} />
                                            <Input label="License No" value={formData.licenseNo} onChange={(e: any) => setFormData({ ...formData, licenseNo: e.target.value })} />
                                            <Input label="Plate No" value={formData.plateNo} onChange={(e: any) => setFormData({ ...formData, plateNo: e.target.value })} />
                                            <Input label="Model" value={formData.vehicleModel} onChange={(e: any) => setFormData({ ...formData, vehicleModel: e.target.value })} />
                                        </div>
                                    </>
                                )}

                                {/* Attachments */}
                                <SectionTitle title="Attachments / المرفقات" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {config.requiredFiles.map(fileKey => (
                                        <div key={fileKey} className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer relative ${files[fileKey] ? 'border-green-500/50 bg-green-500/10' : 'border-zinc-700 hover:border-[var(--royal-gold)] bg-white/5'}`}>
                                            <span className="text-3xl mb-3">{files[fileKey] ? '✅' : '📂'}</span>
                                            <span className="text-[10px] font-black uppercase text-zinc-400 mb-3">{fileKey.replace(/([A-Z])/g, ' $1')}</span>
                                            <input type="file" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(fileKey, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                    ))}
                                </div>

                                {/* Submit */}
                                <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
                                    <button type="button" onClick={onClose} className="px-8 py-3 font-bold text-zinc-500 hover:text-white transition-colors">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-10 py-3 bg-[var(--royal-gold)] text-black font-black text-sm uppercase rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(196,182,135,0.4)] disabled:opacity-50">
                                        {loading ? (uploadProgress || "Processing...") : "Submit Request"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* A4 Template (Hidden) */}
            <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
                <div id="official-form-view" className="bg-white text-black font-serif relative" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                    <div className="flex justify-between items-end border-b-4 border-[#C4B687] pb-6 mb-10">
                        <div>
                            <h1 className="text-3xl font-bold text-[#C4B687] uppercase tracking-widest leading-none">MAADEN</h1>
                            <p className="text-sm font-bold text-zinc-600 mt-2 uppercase tracking-wider">Duwaihi Gold Mine Security</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl font-bold text-[#C4B687] leading-none">معادن للذهب</h1>
                            <p className="text-sm font-bold text-zinc-600 mt-2">إدارة الأمن الصناعي - منجم الدويحي</p>
                        </div>
                    </div>

                    <div className="text-center mb-12 bg-zinc-50 py-4 border-y border-zinc-200">
                        <h2 className="text-2xl font-black uppercase text-black mb-1">{config.title}</h2>
                        <p className="text-sm text-zinc-500 font-mono">REF: <span className="text-black font-bold">{formData.generatedId || "Generating..."}</span></p>
                    </div>

                    <div className="mb-10">
                        <h3 className="text-sm font-bold uppercase border-b border-black mb-4 pb-1">Applicant Details / بيانات مقدم الطلب</h3>
                        <table className="w-full text-sm border-collapse">
                            <tbody>
                                <tr className="border-b border-zinc-200"><td className="py-2 font-bold text-zinc-500 w-1/3">Full Name</td><td className="py-2 font-bold">{formData.fullNameEn}</td></tr>
                                <tr className="border-b border-zinc-200"><td className="py-2 font-bold text-zinc-500">Employee ID</td><td className="py-2 font-mono">{formData.empId}</td></tr>
                                <tr className="border-b border-zinc-200"><td className="py-2 font-bold text-zinc-500">Department</td><td className="py-2">{formData.dept || formData.companyName}</td></tr>
                                <tr className="border-b border-zinc-200"><td className="py-2 font-bold text-zinc-500">National ID</td><td className="py-2 font-mono">{formData.natId}</td></tr>
                                {type.includes('vehicle') && (
                                    <>
                                        <tr className="border-b border-zinc-200"><td className="py-2 font-bold text-zinc-500">Vehicle</td><td className="py-2">{formData.vehicleModel} - {formData.plateNo}</td></tr>
                                        <tr className="border-b border-zinc-200"><td className="py-2 font-bold text-zinc-500">License</td><td className="py-2">{formData.licenseType} ({formData.licenseNo})</td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="absolute bottom-20 left-20 right-20 flex justify-between items-end">
                        <div className="text-center">
                            <p className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">Applicant Signature</p>
                            <div className="font-dancing text-xl border-b border-black pb-2 px-8">{formData.fullNameEn}</div>
                        </div>

                        <div className="text-center">
                            <div className="w-32 h-32 border-4 double border-[#C4B687] rounded-full flex items-center justify-center rotate-[-12deg] mb-2 opacity-80">
                                <div className="text-center">
                                    <div className="text-[#C4B687] font-black text-xs uppercase">Security Dept</div>
                                    <div className="text-[#C4B687] font-black text-xl uppercase my-1">RECEIVED</div>
                                    <div className="text-[#C4B687] font-bold text-[10px]">{new Date().toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-5 left-0 w-full text-center">
                        <p className="text-[10px] text-zinc-400 uppercase">Generated Automatically by Duwaihi System v6.0</p>
                    </div>

                </div>
            </div>
        </div>
    );
};

const SectionTitle = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 py-4 border-b border-white/10 mb-4 mt-6">
        <div className="h-1.5 w-10 bg-[var(--royal-gold)] rounded-full"></div>
        <h3 className="text-sm font-black text-zinc-300 uppercase tracking-widest">{title}</h3>
    </div>
);

const Input = ({ label, dir = 'ltr', ...props }: any) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">{label}</label>
        <input {...props} dir={dir} className={`p-4 border border-white/10 bg-black/40 rounded-2xl outline-none focus:border-[var(--royal-gold)] transition-all font-bold text-white placeholder-zinc-600 focus:bg-black/60 ${dir === 'rtl' ? 'font-serif' : 'font-mono'}`} />
    </div>
);