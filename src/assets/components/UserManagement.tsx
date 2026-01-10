import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, updateDoc } from "firebase/firestore";
import { useApp } from "../../App";
import type { User, Role, ModuleKey, Permission } from "../../types";

/**
 * Project: Al-Duwayhi Mine - Admin Staff Control (SOC v6.0)
 * FEATURE: Advanced Role-Based Access Control (RBAC).
 * FIXED: Secure Root
 */
// Determine Default Permissions by Role (Strictly Typed)
const getPermissionsByRole = (role: string): Record<ModuleKey, Permission> => {
  const defaultPerm: Permission = { view: false, add: false, edit: false, delete: false };
  const allModules: ModuleKey[] = ['dashboard', 'employees', 'contractors', 'vehicle_permits', 'management', 'users'];

  // Initialize with false
  const perms = allModules.reduce((acc, mod) => {
    acc[mod] = { ...defaultPerm };
    return acc;
  }, {} as Record<ModuleKey, Permission>);

  if (role === 'Admin') {
    allModules.forEach(mod => { perms[mod] = { view: true, add: true, edit: true, delete: true }; });
  } else if (role === 'Manager') {
    perms['dashboard'] = { view: true, add: false, edit: false, delete: false };
    perms['employees'] = { view: true, add: true, edit: true, delete: false };
    perms['contractors'] = { view: true, add: true, edit: true, delete: false };
    perms['management'] = { view: true, add: true, edit: true, delete: false };
  } else if (role === 'Gate') {
    perms['vehicle_permits'] = { view: true, add: true, edit: false, delete: false };
    perms['employees'] = { view: true, add: false, edit: false, delete: false };
  }

  return perms;
};

export function UserManagement() {
  const { user: currentUser, theme, language } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Custom");
  const [perms, setPerms] = useState<Record<ModuleKey, Permission>>(getPermissionsByRole("Custom"));

  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (role !== "Custom") setPerms(getPermissionsByRole(role));
  }, [role]);

  // التحقق من صلاحية الإدارة العليا
  const isAdmin =
    currentUser?.username?.toLowerCase() === 'admin' ||
    currentUser?.role === 'Admin';

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "users")), (s) => {
      setUsers(s.docs.map(d => ({ ...d.data() } as User)));
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!name || !username || !password) return alert(isRTL ? "يرجى إكمال الحقول الإلزامية" : "Fields required");
    const userId = "user_" + Date.now();
    try {
      await setDoc(doc(db, "users", userId), {
        id: userId,
        name,
        username: username.toLowerCase().trim(),
        password,
        role,
        permissions: perms
      });
      setName(""); setUsername(""); setPassword(""); setRole("Custom");
      alert(isRTL ? "تم إنشاء حساب المشغل بنجاح ✅" : "Operator account created ✅");
    } catch (err) {
      alert("Error saving account");
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await updateDoc(doc(db, "users", editUser.id), { ...editUser });
      setIsEditModalOpen(false);
      setEditUser(null);
      alert(isRTL ? "تم تحديث الامتيازات ✅" : "Updated ✅");
    } catch (err) {
      alert("Update failed");
    }
  };

  const togglePerm = (moduleKey: ModuleKey, action: keyof Permission) => {
    if (!editUser) return;
    // Cast strict type
    const currentPerms = (editUser.permissions || {}) as Record<ModuleKey, Permission>;
    const modulePerm = currentPerms[moduleKey] || { view: false, add: false, edit: false, delete: false };

    const updatedPerms = {
      ...currentPerms,
      [moduleKey]: { ...modulePerm, [action]: !modulePerm[action] }
    };

    setEditUser({ ...editUser, permissions: updatedPerms as Record<ModuleKey, Permission> });
  };

  if (!isAdmin) return (
    <div className={`p-20 text-center font-['Cairo'] min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-black/90' : 'bg-zinc-50'}`}>
      <span className="text-8xl mb-6">🔒</span>
      <h1 className="text-2xl font-black text-red-500 uppercase tracking-widest">{isRTL ? "دخول مقيد للإدارة العليا" : "Strategic Access Restricted"}</h1>
    </div>
  );

  return (
    <div className={`p-4 md:p-8 space-y-12 font-['Cairo'] animate-view`} dir={isRTL ? "rtl" : "ltr"}>

      {/* هيدر تفعيل الحسابات */}
      <div className={`p-10 rounded-[3rem] border shadow-2xl backdrop-blur-3xl transition-all ${isDark ? 'bg-black/40 border-white/5 shadow-black' : 'bg-white border-zinc-100'}`}>
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#C4B687]/10 flex items-center justify-center text-3xl shadow-inner border border-[#C4B687]/20">👑</div>
          <div>
            <h2 className="text-2xl font-black text-[#C4B687]">{isRTL ? "إدارة طاقم التحكم SOC" : "SOC Staff Governance"}</h2>
            <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">Operational Privileges & Access</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <InputGroup label={isRTL ? "الاسم الكامل" : "Full Name"} value={name} onChange={setName} isDark={isDark} />
          <InputGroup label={isRTL ? "اسم المستخدم" : "Username"} value={username} onChange={setUsername} isDark={isDark} />
          <InputGroup label={isRTL ? "كلمة المرور" : "Password"} value={password} onChange={setPassword} isDark={isDark} type="password" />
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{isRTL ? "الدور الوظيفي" : "Role"}</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)} className={`w-full p-4 rounded-xl font-black outline-none shadow-xl transition-all ${isDark ? 'bg-zinc-800 text-[#C4B687]' : 'bg-[#C4B687] text-zinc-900'}`}>
              <option value="Custom">{isRTL ? "مخصص / مبرمج" : "Custom"}</option>
              <option value="Assistant">{isRTL ? "مساعد (إدخال بيانات)" : "Assistant"}</option>
              <option value="Leader">{isRTL ? "رئيس وردية (اعتماد)" : "Shift Leader"}</option>
              <option value="Admin">{isRTL ? "مدير نظام" : "Admin"}</option>
            </select>
          </div>
        </div>
        <div className="mt-10 flex justify-end">
          <button onClick={handleSave} className="bg-[#C4B687] px-16 py-5 rounded-2xl font-[900] text-[#0f172a] shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase text-xs">
            {isRTL ? "تفعيل حساب المشغل ✅" : "Activate Operator Account ✅"}
          </button>
        </div>
      </div>

      {/* بطاقات الموظفين الحالية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {users.map(u => (
          <div key={u.id} className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all relative overflow-hidden group ${isDark ? 'bg-black/40 border-white/5 hover:border-[#C4B687]/40 shadow-black' : 'bg-white border-zinc-100 hover:border-[#C4B687]'}`}>
            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1.5 h-full ${u.role === 'Admin' ? 'bg-red-600' : 'bg-[#C4B687]'} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-[#C4B687]/20 bg-[#C4B687]/5 text-[#C4B687] shadow-inner">👤</div>
                <div>
                  <h4 className={`font-black text-sm uppercase ${isDark ? 'text-white' : 'text-zinc-900'}`}>{u.name}</h4>
                  <span className="text-[9px] font-[900] uppercase text-[#C4B687] tracking-[0.2em]">{u.role}</span>
                </div>
              </div>
              {u.username?.toLowerCase() !== 'admin' && (
                <button onClick={() => { if (confirm(isRTL ? "هل تريد إلغاء صلاحيات هذا المستخدم؟" : "Revoke Access?")) deleteDoc(doc(db, "users", u.id)); }} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xs opacity-0 group-hover:opacity-100">✕</button>
              )}
            </div>
            <button onClick={() => { setEditUser(u); setIsEditModalOpen(true); }} className={`w-full py-4 rounded-xl text-[10px] font-black border transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-[#C4B687] hover:text-black' : 'bg-zinc-50 border-zinc-100 hover:border-[#C4B687]'}`}>
              {isRTL ? "تخصيص الامتيازات الإدارية" : "Customize Privileges"}
            </button>
          </div>
        ))}
      </div>

      {/* نافذة تعديل الامتيازات (Modal) */}
      {isEditModalOpen && editUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className={`w-full max-w-2xl p-10 rounded-[3rem] border shadow-2xl transition-all ${isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200'}`} dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex justify-between items-center mb-8 border-b border-[#C4B687]/10 pb-6">
              <h3 className="text-2xl font-black text-[#C4B687] uppercase tracking-tight">
                {isRTL ? `إدارة امتيازات: ${editUser.name}` : `Privileges: ${editUser.name}`}
              </h3>
              <span className="px-4 py-1 bg-[#C4B687]/10 text-[#C4B687] rounded-full text-[9px] font-black uppercase">{editUser.role}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
              {(Object.keys(editUser.permissions || {}) as ModuleKey[]).map(mod => (
                <div key={mod} className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/[0.08]' : 'bg-zinc-50 border-zinc-100'}`}>
                  <p className="text-[10px] font-black text-[#C4B687] mb-4 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4B687] animate-pulse"></span>
                    {mod.replace('_', ' ')}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {(['view', 'add', 'edit', 'delete'] as (keyof Permission)[]).map(act => (
                      <label key={act} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={editUser.permissions?.[mod]?.[act] ?? false}
                            onChange={() => togglePerm(mod, act)}
                            className="w-5 h-5 accent-[#C4B687] rounded-md cursor-pointer opacity-0 absolute z-10"
                          />
                          <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${editUser.permissions?.[mod]?.[act] ?? false ? 'bg-[#C4B687] border-[#C4B687]' : 'border-zinc-500'}`}>
                            {(editUser.permissions?.[mod]?.[act] ?? false) && <span className="text-[10px] text-black font-bold">✓</span>}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-500 group-hover:text-zinc-300 uppercase transition-colors">{act}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setIsEditModalOpen(false); setEditUser(null); }} className="flex-1 py-5 border border-white/10 text-zinc-500 font-black rounded-2xl uppercase text-[10px] hover:bg-white/5 transition-all">إلغاء العملية</button>
              <button onClick={handleUpdate} className="flex-[2] py-5 bg-[#C4B687] text-black font-[900] rounded-2xl shadow-2xl hover:brightness-110 active:scale-95 transition-all uppercase text-[10px]">تحديث جدول الامتيازات ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// مكون فرعي لحقول الإدخال
function InputGroup({ label, value, onChange, isDark, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full p-4 border rounded-xl font-bold outline-none transition-all shadow-inner ${isDark ? 'bg-black/40 border-white/10 text-white focus:border-[#C4B687]' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#C4B687]'}`}
        placeholder="..."
      />
    </div>
  );
}