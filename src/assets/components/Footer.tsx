import React from 'react';

interface FooterProps {
    lang: string;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
    const isRTL = lang === 'ar';

    return (
        <footer className="w-full py-8 mt-12 border-t border-[var(--royal-gold)]/20 glass-card rounded-t-3xl">
            <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Contact Info */}
                <div className={`flex flex-col gap-2 ${isRTL ? 'md:items-start text-right' : 'md:items-end text-left'} text-[var(--text-main)]`}>
                    <h4 className="text-[var(--royal-gold)] text-sm font-black mb-2 uppercase">
                        {isRTL ? 'مركز التواصل والدعم' : 'Contact & Support Center'}
                    </h4>
                    <a href="mailto:Nawaf0434@outlook.com" className="hover:text-[var(--royal-gold)] transition-colors text-sm font-bold flex items-center gap-2">
                        <span>📧</span> Nawaf0434@outlook.com
                    </a>
                    <a href="tel:0568000434" className="hover:text-[var(--royal-gold)] transition-colors text-sm font-bold flex items-center gap-2">
                        <span>📞</span> 0568000434
                    </a>
                </div>

                {/* Logos */}
                <div className="flex items-center gap-6 opacity-90">
                    {/* Ma'aden Logo (Assuming generic placeholder logic or text if image missing) */}
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-[var(--royal-gold)] tracking-widest">MA'ADEN</span>
                        <span className="text-[10px] text-[var(--text-main)] font-bold tracking-[0.3em]">SAUDI ARABIA</span>
                    </div>

                    <div className="h-10 w-px bg-gray-300 mx-2"></div>

                    {/* High Commission for Industrial Security (HCIS) Placeholder/Logo */}
                    <div className="flex flex-col items-center">
                        {/* Using a placeholder shield icon for HCIS if image not locally available, or text */}
                        <div className="w-10 h-10 border-2 border-[var(--royal-gold)] rounded-full flex items-center justify-center">
                            <span className="text-lg">🛡️</span>
                        </div>
                        <span className="text-[8px] font-bold mt-1 text-[var(--text-main)] text-center max-w-[80px] leading-tight">
                            {isRTL ? 'الهيئة العليا للأمن الصناعي' : 'HCIS'}
                        </span>
                    </div>
                </div>

            </div>

            <div className="text-center mt-8 text-[10px] text-gray-400 font-semibold">
                © {new Date().getFullYear()} Masar Platform. All Rights Reserved.
            </div>
        </footer>
    );
};
