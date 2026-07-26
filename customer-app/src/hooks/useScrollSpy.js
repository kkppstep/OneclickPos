import { useCallback, useEffect, useRef, useState } from 'react';

// Tracks which category section is currently in view (tapping a pill
// scrolls to a section; scrolling manually updates the active pill) —
// same rootMargin trick as the original: treat a section as "active"
// once it's crossed 20% from the top, so the pill updates a beat
// before the section title reaches the very top of the viewport.
//
// `rootElement` scopes the observer to a specific scrolling container
// (Stage layout's independently-scrolling menu panel) rather than the
// whole viewport (Standard layout, where the page itself scrolls).
export function useScrollSpy(categoryNames, rootElement = null) {
  const [activeCategory, setActiveCategory] = useState(categoryNames[0] || null);
  const sectionRefs = useRef({});
  const key = categoryNames.join('|');

  useEffect(() => {
    if (categoryNames.length === 0) return undefined;
    setActiveCategory((prev) => (categoryNames.includes(prev) ? prev : categoryNames[0]));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const name = entry.target.getAttribute('data-category');
            if (name) setActiveCategory(name);
          }
        });
      },
      { root: rootElement, rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, rootElement]);

  const registerSection = useCallback(
    (name) => (el) => {
      sectionRefs.current[name] = el;
    },
    []
  );

  const scrollToCategory = useCallback((name) => {
    setActiveCategory(name);
    sectionRefs.current[name]?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return { activeCategory, registerSection, scrollToCategory };
}
