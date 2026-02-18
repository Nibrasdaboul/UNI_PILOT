import { useLanguage } from '@/lib/LanguageContext';

export default function VideoTranslate() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12"
      data-testid="video-translate-page"
    >
      {/* Logo + app name with transparency */}
      <div className="flex flex-col items-center gap-4 opacity-90">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl font-display shrink-0 opacity-80">
          U
        </div>
        <span className="text-xl sm:text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent opacity-90">
          UniPilot
        </span>
      </div>
      {/* Coming soon text – centered, with transparency */}
      <p className="mt-8 text-2xl sm:text-3xl font-semibold text-foreground/80 text-center" dir="auto">
        {isArabic ? 'سيأتي قريباً' : 'Coming soon'}
      </p>
      <p className="mt-2 text-base sm:text-lg text-muted-foreground/80 text-center" dir="ltr">
        {isArabic ? 'Coming soon' : 'سيأتي قريباً'}
      </p>
    </div>
  );
}
