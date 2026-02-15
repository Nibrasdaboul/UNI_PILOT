import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const variants = {
  fadeUp: 'animate-scroll-fade-up',
  fadeIn: 'animate-scroll-fade-in',
  slideLeft: 'animate-scroll-slide-left',
  slideRight: 'animate-scroll-slide-right',
  scale: 'animate-scroll-scale',
  none: '',
};

/**
 * Wraps content and runs a scroll-triggered animation when the section enters viewport.
 * @param {string} variant - 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scale' | 'none'
 * @param {number} delay - optional delay (0-5) for stagger, maps to delay-0..delay-5
 */
export function AnimatedSection({
  children,
  className,
  variant = 'fadeUp',
  delay = 0,
  as: Component = 'div',
  ...props
}) {
  const [ref, isInView] = useScrollAnimation();

  return (
    <Component
      ref={ref}
      className={cn(
        !isInView && 'opacity-0',
        isInView && variants[variant],
        isInView && delay > 0 && `animation-delay-${delay}`,
        className
      )}
      data-in-view={isInView}
      style={!isInView && variant === 'fadeUp' ? { transform: 'translateY(28px)' } : undefined}
      {...props}
    >
      {children}
    </Component>
  );
}
