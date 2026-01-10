export const storage = {
  /**
   * جلب البيانات من الذاكرة المحلية
   * @param key المفتاح البرمجي
   * @param defaultValue القيمة الافتراضية في حال عدم الوجود
   */
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(key);
      // إذا كانت القيمة موجودة يتم تحويلها من نص JSON إلى كائن برمجي
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.warn(`Storage Get Error [${key}]:`, error);
      return defaultValue;
    }
  },

  /**
   * حفظ البيانات في الذاكرة المحلية
   */
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Storage Set Error [${key}]:`, error);
    }
  },

  /**
   * حذف مفتاح محدد من الذاكرة
   */
  remove(key: string) {
    localStorage.removeItem(key);
  },

  /**
   * مسح كافة بيانات النظام من الذاكرة (مفيد عند تسجيل الخروج النهائي)
   */
  clearAll() {
    localStorage.clear();
  }
};