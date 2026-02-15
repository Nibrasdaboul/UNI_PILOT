import { useEffect, useRef, useState } from 'react';

const defaultOptions = {
  root: null,
  rootMargin: '0px 0px -40px 0px',
  threshold: 0.1,
  triggerOnce: true,
};

/**
 * Hook that detects when element enters viewport for scroll-triggered animations.
 * @param {Object} options - IntersectionObserver options
 * @returns {[React.Ref, boolean]} - ref to attach to element, and isInView state
 */
export function useScrollAnimation(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const opts = { ...defaultOptions, ...options };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (opts.triggerOnce && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!opts.triggerOnce) {
          setIsInView(false);
        }
      },
      { root: opts.root, rootMargin: opts.rootMargin, threshold: opts.threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [opts.root, opts.rootMargin, opts.threshold, opts.triggerOnce]);

  return [ref, isInView];
}
