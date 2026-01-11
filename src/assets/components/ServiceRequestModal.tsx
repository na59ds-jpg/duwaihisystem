import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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
    const [formData, setFormData] = useState<any>({
        requestType: 'new', // new, renew, lost, damaged
        // Personal Fields
        fullNameAr: '', fullNameEn: '',
        empId: '', title: '', grade: '',
        nationality: '', dob: '', natId: '',
        placeOfBirth: '', bloodGroup: '',
        mobile: '',
        dept: '', section: '',

        // License/Vehicle Fields (for permits)
        licenseType: '', licenseNo: '', licenseExpiry: '',
        plateNo: '', vehicleColor: '', vehicleModel: '', vehicleType: '',
        ownerName: '', permitType: 'permanent', // permanent, temp, visitor
    });

    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        personalPhoto: null,
        nationalIdCard: null,
        maadenCard: null,
        driverLicense: null,
        vehicleReg: null, // Istimara
        insurance: null,
    });



    // --- Dynamic Labels & Config based on Type ---
    const getConfig = () => {
        switch (type) {
            case 'employee_card':
                return {
                    title: "Employee ID Card Request / طلب بطاقة موظف",
                    color: "border-[var(--royal-gold)]",
                    penalties: "Important: Loss of card due to negligence will result in a written warning and a 2-day salary deduction. \n تنبيه هام: فقدان البطاقة بسبب الإهمال يترتب عليه إنذار خطي وحسم أجر يومين من الراتب.",
                    requiredFiles: ['personalPhoto', 'nationalIdCard']
                };
            case 'contractor_card':
                return {
                    title: "Contractor ID Request / طلب بطاقة مقاول",
                    color: "border-[var(--royal-gold)]",
                    penalties: "Fines for lost card: 1st time 500 SAR, 2nd time 1000 SAR, 3rd time Ban. Late return fine: 100 SAR/week. \n غرامة فقدان البطاقة: 500 ريال للمرة الأولى، 1000 ريال للثانية، حرمان نهائي للثالثة. تأخير التسليم: 100 ريال أسبوعياً.",
                    requiredFiles: ['personalPhoto', 'nationalIdCard', 'maadenCard']
                };
            case 'private_vehicle':
            case 'company_vehicle':
            case 'contractor_vehicle':
                return {
                    title: "Vehicle Permit Request / طلب تصريح مركبة",
                    color: "border-[var(--royal-gold)]",
                    penalties: "Speed limit: 20 km/h in operation/housing areas, 60 km/h in other mine areas. \n السرعة 20 كم/س في مناطق التشغيل والسكن، و60 كم/س في باقي مناطق المنجم.",
                    requiredFiles: ['driverLicense', 'vehicleReg', 'insurance', 'maadenCard']
                };
            default: return { title: "Inquiry", color: "border-gray-500", penalties: "", requiredFiles: [] };
        }
    };

    const config = getConfig();

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFiles({ ...files, [key]: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 1. Validation
        const missingFiles = config.requiredFiles.filter(key => !files[key]);
        if (missingFiles.length > 0) {
            alert(`Missing required documents / المستندات المطلوبة ناقصة: \n ${missingFiles.join(', ')}`);
            setLoading(false);
            return;
        }

        try {
            // 2. Upload Files
            const attachments: any = {};
            for (const key of Object.keys(files)) {
                const file = files[key];
                if (file) {
                    const url = await uploadToCloudinary(file);
                    attachments[key] = url;
                }
            }

            // 3. Generate Request ID (MS-XXXX)
            const uniqueId = `MS-${Math.floor(1000 + Math.random() * 9000)}`;

            // 4. Save to Firestore
            await addDoc(collection(db, "security_requests"), {
                type,
                requestId: uniqueId, // New Unique ID
                ...formData,
                attachments,
                status: "pending",
                createdAt: serverTimestamp(),
                submittedAt: new Date().toISOString(),
            });

            // 5. Generate PDF
            // We wait a moment for the 'OfficiaView' to be fully rendered with data including the new ID
            setFormData((prev: any) => ({ ...prev, generatedId: uniqueId })); // Temp update for PDF view
            await new Promise(r => setTimeout(r, 500));
            await generateOfficialPDF("official-form-view", `Request_${uniqueId}`);

            alert(`Request Submitted Successfully! \n Your Request ID is: ${uniqueId} \n تم تقديم الطلب بنجاح! رقم طلبك هو: ${uniqueId}`);
            onClose();

        } catch (err) {
            console.error(err);
            alert("Error submitting request / حدث خطأ أثناء تقديم الطلب");
        }
        setLoading(false);
    };

    // --- Inquiry Logic ---
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchLoading(true);
        setSearchResult(null);
        try {
            // Search by Request ID first
            let q = query(collection(db, "security_requests"), where("requestId", "==", searchQuery.trim()));
            let snap = await getDocs(q);

            // If not found, try National ID
            if (snap.empty) {
                q = query(collection(db, "security_requests"), where("natId", "==", searchQuery.trim()));
                snap = await getDocs(q);
            }

            if (!snap.empty) {
                // Get the most recent request if multiple match national ID
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort by createdAt desc if needed, but for now just take first or let user be specific
                setSearchResult(docs[0]);
            } else {
                alert("No request found with this ID / لم يتم العثور على طلب بهذا الرقم");
            }
        } catch (err) {
            console.error("Search Error", err);
            alert("Error searching / حدث خطأ في البحث");
        }
        setSearchLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[15px] p-4 overflow-y-auto">
            <div className={`w-full max-w-4xl rounded-[2.5rem] relative flex flex-col max-h-[90vh] overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 glass-card bg-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.3)]`}>

                {/* Header */}
                <div className="p-6 border-b border-[var(--royal-gold)]/20 flex justify-between items-start bg-white/40 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tighter flex items-center gap-2">
                            <div className="w-2 h-8 bg-[var(--royal-gold)] rounded-full"></div>
                            {config.title}
                        </h2>
                        <p className="text-zinc-500 text-xs font-bold mt-1 ml-4">Please fill all fields accurately / يرجى تعبئة جميع الحقول بدقة</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-red-600 text-3xl font-black transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100">&times;</button>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-8 relative font-['Tajawal'] bg-white/50 backdrop-blur-sm">

                    {type === 'inquiry' ? (
                        // --- NEW MINIMALIST INQUIRY UI ---
                        <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-2xl mx-auto space-y-8">
                            {!searchResult ? (
                                <>
                                    <div className="text-center space-y-2">
                                        <span className="text-4xl animate-bounce inline-block">🔍</span>
                                        <h3 className="text-xl font-black text-zinc-800">Track Your Request / تتبع حالة الطلب</h3>
                                        <p className="text-zinc-500 text-sm">Enter your Request ID (MS-XXXX) or National ID</p>
                                    </div>
                                    <form onSubmit={handleSearch} className="w-full flex gap-4">
                                        <input
                                            type="text"
                                            placeholder="MS-1001 or ID Number..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 p-5 rounded-2xl border border-white/40 bg-white/60 shadow-lg backdrop-blur-md font-bold text-center text-lg focus:border-[#C4B687] outline-none transition-all uppercase placeholder:normal-case focus:shadow-[0_0_20px_rgba(196,182,135,0.2)]"
                                        />
                                        <button type="submit" disabled={searchLoading} className="px-8 py-4 bg-gradient-to-r from-[var(--royal-gold)] to-[#b39030] text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all">
                                            {searchLoading ? "..." : "Check"}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                // --- STATUS RESULT CARD ---
                                <div className={`w-full p-8 rounded-[2rem] border flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 backdrop-blur-xl
                                    ${searchResult.status === 'approved' ? 'bg-emerald-50/80 border-emerald-500/30' :
                                        searchResult.status === 'rejected' ? 'bg-red-50/80 border-red-500/30' :
                                            'bg-[var(--royal-gold)]/5 border-[var(--royal-gold)]/30'}
                                `}>
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg
                                        ${searchResult.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                            searchResult.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                'bg-[#C4B687]/20 text-[var(--royal-gold)]'}
                                    `}>
                                        {searchResult.status === 'approved' ? '✅' : searchResult.status === 'rejected' ? '❌' : '⏳'}
                                    </div>

                                    <h2 className="text-2xl font-black text-zinc-900 mb-1">
                                        {searchResult.status === 'approved' ? 'Congratulations! Request Approved' :
                                            searchResult.status === 'rejected' ? 'Request Returned / الطلب مرفوض' :
                                                'Under Processing / قيد المراجعة'}
                                    </h2>
                                    <p className="text-zinc-500 font-bold mb-6 text-sm">Request ID: {searchResult.requestId}</p>

                                    {searchResult.status === 'rejected' && (
                                        <div className="w-full bg-white/50 p-6 rounded-2xl border border-red-200 mb-6">
                                            <p className="text-xs font-black text-red-500 uppercase mb-2">REJECTION REASON / سبب الرفض</p>
                                            <p className="text-red-700 font-bold">{searchResult.rejectionReason || "No specific reason provided. Please contact processing center."}</p>
                                        </div>
                                    )}

                                    <button onClick={() => setSearchResult(null)} className="text-zinc-400 text-xs font-bold hover:text-[var(--royal-gold)] underline transition-colors">Check Another Request</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- STANDARD FORM ---
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Request Type */}
                            <div className="grid grid-cols-4 gap-4 bg-white/60 p-2 rounded-2xl border border-white/40 shadow-inner">
                                {['new', 'renew', 'lost', 'damaged'].map(rt => (
                                    <label key={rt} className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border ${formData.requestType === rt ? 'border-[var(--royal-gold)] bg-[var(--royal-gold)]/10 shadow-md transform scale-105' : 'border-transparent hover:bg-white/50'}`}>
                                        <input type="radio" name="reqType" value={rt} checked={formData.requestType === rt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, requestType: e.target.value })} className="hidden" />
                                        <span className={`text-sm font-black uppercase ${formData.requestType === rt ? 'text-[var(--royal-gold)]' : 'text-zinc-500'}`}>{rt}</span>
                                        <span className="text-[10px] font-bold opacity-60">
                                            {rt === 'new' ? 'جديد' : rt === 'renew' ? 'تجديد' : rt === 'lost' ? 'بدل فاقد' : 'بدل تالف'}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Personal Information Section */}
                            <SectionTitle title="Personal Information / البيانات الشخصية" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <Input label="Full Name (English) / الاسم بالإنجليزية" value={formData.fullNameEn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fullNameEn: e.target.value })} required />
                                <Input label="Full Name (Arabic) / الاسم بالعربية" value={formData.fullNameAr} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fullNameAr: e.target.value })} dir="rtl" required />
                                <Input label="ID Number / رقم الهوية/الإقامة" value={formData.natId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, natId: e.target.value })} required />

                                <Input label="Employee ID / الرقم الوظيفي" value={formData.empId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, empId: e.target.value })} required />
                                <Input label="Job Title / المسمى الوظيفي" value={formData.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })} required />
                                <Input label="Grade / الدرجة" value={formData.grade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, grade: e.target.value })} />

                                <Input label="Nationality / الجنسية" value={formData.nationality} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nationality: e.target.value })} required />
                                <Input label="Date of Birth / تاريخ الميلاد" type="date" value={formData.dob} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dob: e.target.value })} required />
                                <Input label="Place of Birth / مكان الميلاد" value={formData.placeOfBirth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, placeOfBirth: e.target.value })} required />

                                <Input label="Mobile No / رقم الجوال" value={formData.mobile} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, mobile: e.target.value })} required />
                                <Input label="Blood Group / فصيلة الدم" value={formData.bloodGroup} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bloodGroup: e.target.value })} required />

                                {/* Affiliation Dropdown */}
                                <div className="flex flex-col gap-1 group">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 group-focus-within:text-[var(--royal-gold)] transition-colors">Department / الإدارة</label>
                                    <select
                                        className="p-4 border border-white/50 rounded-2xl bg-white/70 backdrop-blur-sm font-bold text-sm outline-none focus:border-[var(--royal-gold)] focus:ring-1 focus:ring-[var(--royal-gold)]/20 transition-all shadow-sm"
                                        value={type.includes('contractor') ? formData.companyName : formData.dept}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => type.includes('contractor') ? setFormData({ ...formData, companyName: e.target.value }) : setFormData({ ...formData, dept: e.target.value })}
                                    >
                                        <option value="">-- Select / اختر --</option>
                                        {type.includes('contractor')
                                            ? companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                            : departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)
                                        }
                                    </select>
                                </div>
                            </div>

                            {/* Vehicle Section (Conditional) */}
                            {(type.includes('vehicle')) && (
                                <>
                                    <SectionTitle title="Vehicle & License Data / بيانات المركبة والرخصة" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <Input label="License Type / نوع الرخصة" value={formData.licenseType} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, licenseType: e.target.value })} />
                                        <Input label="License No / رقم الرخصة" value={formData.licenseNo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, licenseNo: e.target.value })} />
                                        <Input label="Expiry Date / تاريخ الانتهاء" type="date" value={formData.licenseExpiry} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, licenseExpiry: e.target.value })} />
                                        <div className="hidden lg:block"></div> {/* Spacer */}

                                        <Input label="Plate No / رقم اللوحة" value={formData.plateNo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, plateNo: e.target.value })} />
                                        <Input label="Model / الموديل" value={formData.vehicleModel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vehicleModel: e.target.value })} />
                                        <Input label="Color / اللون" value={formData.vehicleColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vehicleColor: e.target.value })} />
                                        <Input label="Type / النوع" value={formData.vehicleType} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vehicleType: e.target.value })} />
                                    </div>
                                </>
                            )}

                            {/* Attachments Section */}
                            <SectionTitle title="Required Attachments / المرفقات المطلوبة" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {config.requiredFiles.map(fileKey => (
                                    <div key={fileKey} className="border-2 border-dashed border-[var(--royal-gold)]/30 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-[var(--royal-gold)]/5 hover:border-[var(--royal-gold)] transition-all cursor-pointer group bg-white/40">
                                        <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">📂</span>
                                        <span className="text-[10px] font-black uppercase text-zinc-500 mb-3 group-hover:text-[var(--royal-gold)] transition-colors">{fileKey.replace(/([A-Z])/g, ' $1')}</span>
                                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(fileKey, e)} className="text-[9px] w-full text-center file:mr-0 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[var(--royal-gold)] file:text-white hover:file:bg-[#b39030] cursor-pointer" />
                                    </div>
                                ))}
                            </div>

                            {/* Penalties Notice */}
                            <div className="bg-red-50/80 border-l-4 border-red-500 p-6 rounded-r-2xl shadow-sm backdrop-blur-sm">
                                <h4 className="text-red-800 font-black text-sm mb-2 uppercase flex items-center gap-2">
                                    <span>⚠️</span> LEGAL NOTICE / تنويه قانوني
                                </h4>
                                <p className="text-red-700 text-xs font-bold leading-relaxed whitespace-pre-line">
                                    {config.penalties}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-4 border-t border-[var(--royal-gold)]/20 pt-6 mt-8 sticky bottom-0 z-20">
                                <button type="button" onClick={onClose} className="px-8 py-3 font-bold text-zinc-500 hover:text-zinc-800 transition-colors hover:bg-white/50 rounded-xl">Cancel / إلغاء</button>
                                <button type="submit" disabled={loading} className="px-10 py-3 bg-[var(--royal-gold)] text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
                                    {loading ? "Processing..." : "Submit Request / إرسال الطلب"}
                                </button>
                            </div>
                        </form>
                    )}

                </div>

                {/* Hidden Official PDF Template (Rendered off-screen or visibly for debug) */}
                {/* We keep it in the DOM but hidden from view, visible to html2canvas */}
                <div className="absolute top-0 left-0 -z-50 w-[210mm] bg-white text-black p-10 font-serif" id="official-form-view">
                    {/* Official Letterhead */}
                    <div className="flex justify-between items-center border-b-2 border-[#C4B687] pb-6 mb-8">
                        <div className="text-left">
                            <h1 className="text-2xl font-bold uppercase tracking-widest text-[#C4B687]">MA'ADEN <span className="text-zinc-400">|</span> Gold</h1>
                            <p className="text-xs text-zinc-500 font-bold mt-1">Al Duwaihi Gold Mine - Security Department</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-2xl font-bold text-[#C4B687]">معادن <span className="text-zinc-400">|</span> للذهب</h1>
                            <p className="text-xs text-zinc-500 font-bold mt-1">منجم الدويحي للذهب - إدارة الأمن الصناعي</p>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black uppercase underline decoration-[#C4B687] underline-offset-8 mb-2">{config.title}</h2>
                        <p className="text-sm font-bold text-zinc-400">Reference: {formData.generatedId || "PENDING"}</p>
                    </div>

                    <table className="w-full border-collapse border border-zinc-300 text-sm mb-8">
                        <tbody>
                            <tr className="bg-zinc-50">
                                <td className="border p-3 font-bold w-1/4">Request Type / نوع الطلب</td>
                                <td className="border p-3 w-1/4 uppercase">{formData.requestType}</td>
                                <td className="border p-3 font-bold w-1/4">Date / التاريخ</td>
                                <td className="border p-3 w-1/4">{new Date().toLocaleDateString('en-GB')}</td>
                            </tr>
                            <tr>
                                <td className="border p-3 font-bold">Name (En)</td>
                                <td className="border p-3 font-mono">{formData.fullNameEn}</td>
                                <td className="border p-3 font-bold">الاسم (عربي)</td>
                                <td className="border p-3 font-serif dir-rtl">{formData.fullNameAr}</td>
                            </tr>
                            <tr className="bg-zinc-50">
                                <td className="border p-3 font-bold">ID No / الهوية</td>
                                <td className="border p-3 font-mono">{formData.natId}</td>
                                <td className="border p-3 font-bold">Emp ID / الوظيفي</td>
                                <td className="border p-3 font-mono">{formData.empId}</td>
                            </tr>
                            <tr>
                                <td className="border p-3 font-bold">Nationality / الجنسية</td>
                                <td className="border p-3">{formData.nationality}</td>
                                <td className="border p-3 font-bold">Mobile / الجوال</td>
                                <td className="border p-3 font-mono">{formData.mobile}</td>
                            </tr>
                            {(type.includes('vehicle')) && (
                                <>
                                    <tr className="bg-zinc-100"><td colSpan={4} className="border p-2 text-center font-bold text-[#C4B687]">VEHICLE DETAILS / بيانات المركبة</td></tr>
                                    <tr>
                                        <td className="border p-3 font-bold">Plate No / اللوحة</td>
                                        <td className="border p-3 font-mono text-lg">{formData.plateNo}</td>
                                        <td className="border p-3 font-bold">Type/Color / النوع واللون</td>
                                        <td className="border p-3">{formData.vehicleType} - {formData.vehicleColor}</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>

                    {/* Footer / Signature */}
                    <div className="mt-12 flex justify-between items-end">
                        <div className="text-center">
                            <div className="mb-4 text-xs font-bold text-zinc-400">DIGITAL SIGNATURE / التوقيع الرقمي</div>
                            <div className="font-dancing text-2xl text-blue-900 border-b border-black pb-1 mb-1 px-8">{formData.fullNameEn}</div>
                            <p className="text-[10px] text-zinc-400">Signed at: {new Date().toLocaleString()}</p>
                        </div>

                        <div className="text-center opacity-30">
                            <div className="w-24 h-24 border-4 border-double border-[#C4B687] rounded-full flex items-center justify-center rotate-[-15deg]">
                                <span className="text-xs font-black uppercase text-[#C4B687]">Security<br />Approval</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-10 left-0 w-full text-center text-[10px] text-zinc-300 uppercase tracking-[0.5em]">
                        Official Document • Maaden Gold • Security Control
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- Helper Subcomponents ---

const SectionTitle = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 py-4 border-b border-[var(--royal-gold)]/20 mb-4 mt-6">
        <div className="h-2 w-8 bg-[var(--royal-gold)] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]"></div>
        <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">{title}</h3>
    </div>
);

const Input = ({ label, dir = 'ltr', ...props }: any) => (
    <div className="flex flex-col gap-1 group">
        <label className="text-[10px] font-black text-zinc-500 uppercase ml-1 group-focus-within:text-[var(--royal-gold)] transition-colors">{label}</label>
        <input
            {...props}
            dir={dir}
            className={`p-4 border border-white/50 bg-white/70 backdrop-blur-sm rounded-2xl outline-none focus:border-[var(--royal-gold)] focus:ring-1 focus:ring-[var(--royal-gold)]/20 transition-all font-bold text-zinc-800 placeholder-zinc-300 shadow-sm ${dir === 'rtl' ? 'font-serif' : 'font-mono'}`}
        />
    </div>
);
