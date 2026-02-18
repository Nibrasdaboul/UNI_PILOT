import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Maps each route to a unique page entrance animation.
 * انبثاق من الداخل = scale, من الأسفل = slideUp, من اليمين = slideRight, إلخ
 */
const PAGE_ENTRANCE_MAP = {
  '/': 'scaleIn',                    // Landing: انبثاق من الداخل
  '/dashboard': 'slideUp',            // من الأسفل
  '/courses': 'slideRight',          // من اليمين
  '/planner': 'slideUp',             // من الأسفل (staggerRight كان يخفي المحتوى)
  '/ai-coach': 'scaleIn',            // انبثاق من الداخل
  '/analytics': 'slideLeft',         // من اليسار
  '/study-tools': 'slideRight',
  '/notes': 'slideRight',
  '/admin': 'slideUp',
  '/settings': 'fade',
};

function getVariantForPath(pathname) {
  if (PAGE_ENTRANCE_MAP[pathname]) return PAGE_ENTRANCE_MAP[pathname];
  if (pathname.startsWith('/courses/')) return 'slideLeft';   // Course details: من اليسار
  return 'slideUp'; // default
}

const VARIANT_CLASSES = {
  scaleIn: 'animate-page-scale-in',
  slideUp: 'animate-page-slide-up',
  slideDown: 'animate-page-slide-down',
  slideRight: 'animate-page-slide-right',
  slideLeft: 'animate-page-slide-left',
  fade: 'animate-page-fade',
  staggerRight: 'page-entrance-stagger-right',
};

export function PageEntrance({ children, pathname, className }) {
  const variant = useMemo(() => getVariantForPath(pathname), [pathname]);
  const animationClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.slideUp;

  return (
    <div
      key={pathname}
      className={cn(animationClass, className)}
      data-page-entrance={variant}
    >
      {children}
    </div>
  );
}
