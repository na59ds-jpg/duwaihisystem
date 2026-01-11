import React, { useState, useEffect } from 'react';

const alerts = [
    {
        id: 1,
        title: "تنبيه هام",
        titleEn: "Important Alert",
        content: "يجب على جميع الموظفين تحديث بيانات المركبات قبل نهاية الشهر.",
        contentEn: "All employees must update vehicle details before month end."
    },
    {
        id: 2,
        title: "صيانة مجدولة",
        titleEn: "Scheduled Maintenance",
        content: "ستتوقف البوابة عن العمل للصيانة يوم الجمعة من 2:00 ص إلى 4:00 ص.",
        contentEn: "Gate system maintenance on Friday from 2:00 AM to 4:00 AM."
    },
    {
        id: 3,
        title: "تعليمات أمنية",
        titleEn: "Security Instructions",
        content: "يرجى إبراز الهوية عند الدخول والخروج من البوابات الرئيسية.",
        contentEn: "Please show ID when entering/exiting main gates."
    }
];

interface AlertsSliderProps {
    lang: string;
}

export const AlertsSlider: React.FC<AlertsSliderProps> = ({ lang }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const isRTL = lang === 'ar';

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % alerts.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <div className="w-full max-w-4xl mx-auto my-6 px-4">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden min-h-[140px] flex items-center justify-between">

                {/* Decorative Gold Line */}
                <div className={`absolute top-0 bottom-0 w-1 bg-[var(--royal-gold)] ${isRTL ? 'right-0' : 'left-0'}`}></div>

                <div className="flex-1 px-6 z-10">
                    <div className="transition-all duration-500 transform">
                        <h3 className="text-[var(--royal-gold)] text-lg font-black mb-2 flex items-center gap-2">
                            <span>⚠️</span>
                            {isRTL ? alerts[currentIndex].title : alerts[currentIndex].titleEn}
                        </h3>
                        <p className="text-[var(--text-main)] text-sm md:text-base font-semibold leading-relaxed opacity-90">
                            {isRTL ? alerts[currentIndex].content : alerts[currentIndex].contentEn}
                        </p>
                    </div>
                </div>

                {/* Navigation Dots */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {alerts.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleDotClick(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${currentIndex === idx
                                    ? 'bg-[var(--royal-gold)] w-6'
                                    : 'bg-gray-300 hover:bg-[var(--royal-gold)]/50'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
