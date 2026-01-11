import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Alert {
    id: string;
    title: string;
    content: string;
    titleEn?: string; // Optional if DB doesn't have it yet, fallback to title
    contentEn?: string;
    isActive?: boolean;
    createdAt?: any;
}

interface AlertsSliderProps {
    lang: string;
}

export const AlertsSlider: React.FC<AlertsSliderProps> = ({ lang }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const isRTL = lang === 'ar';

    // 1. Fetch Alerts Real-time
    useEffect(() => {
        const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAlerts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Alert[];

            // Filter only active if you have such filed, or just take all for now. 
            // Assuming all in DB are to be shown.
            // If empty, we can set a default welcome message to avoid empty space.
            if (fetchedAlerts.length === 0) {
                setAlerts([{
                    id: 'default',
                    title: 'مرحباً بكم في منصة مسار',
                    titleEn: 'Welcome to Masar Platform',
                    content: 'المنصة الأمنية الموحدة لمنجم الدويحي.',
                    contentEn: 'The Unified Security Platform of Al Duwaihi Mine.'
                }]);
            } else {
                setAlerts(fetchedAlerts);
            }
        });

        return () => unsubscribe();
    }, []);

    // 2. Auto-Play Logic (Only if > 1 alert)
    useEffect(() => {
        if (alerts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % alerts.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [alerts.length]); // Reset if alerts change

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    if (alerts.length === 0) return null; // Should not happen due to default fallback

    const currentAlert = alerts[currentIndex];
    const displayTitle = isRTL ? currentAlert.title : (currentAlert.titleEn || currentAlert.title);
    const displayContent = isRTL ? currentAlert.content : (currentAlert.contentEn || currentAlert.content);

    return (
        <div className="w-full max-w-4xl mx-auto my-6 px-4 font-['Tajawal']" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ROYAL GLASS CONTAINER */}
            {/* Transparent Glass + Gold Border + Round Corners */}
            <div className={`relative overflow-hidden min-h-[120px] rounded-2xl border border-[var(--royal-gold)]/40 bg-white/10 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_30px_rgba(196,182,135,0.15)] transition-all duration-500 group flex items-center`}>

                {/* Decorative Side Bar */}
                <div className={`absolute top-0 bottom-0 w-1.5 bg-gradient-to-b from-[var(--royal-gold)] to-[#A3966D] ${isRTL ? 'right-0' : 'left-0'}`}></div>

                <div className="flex-1 px-8 py-6 z-10 flex flex-col justify-center">
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 key={currentIndex}"> {/* Re-animate on change */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl drop-shadow-md">⚠️</span>
                            <h3 className="text-[var(--text-main)] text-lg font-black tracking-wide uppercase">
                                {displayTitle}
                            </h3>
                        </div>

                        <p className="text-[var(--text-main)]/90 text-sm md:text-base font-bold leading-relaxed max-w-3xl">
                            {displayContent}
                        </p>
                    </div>
                </div>

                {/* Navigation Dots (Only if > 1) */}
                {alerts.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                        {alerts.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleDotClick(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx
                                    ? 'bg-[var(--royal-gold)] w-6 shadow-[0_0_10px_rgba(196,182,135,0.8)]'
                                    : 'bg-zinc-300/50 w-1.5 hover:bg-[var(--royal-gold)]/50'
                                    }`}
                                aria-label={`Go to alert ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Background Sparkle/Glow (Subtle) */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--royal-gold)]/5 rounded-full blur-[50px] pointer-events-none"></div>

            </div>
        </div>
    );
};
