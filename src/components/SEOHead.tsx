import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
}

export function SEOHead({ title, description, keywords }: SEOHeadProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const updateMeta = (name: string, content?: string) => {
      if (!content) return;
      let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      const prev = element?.content;
      if (!element) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
      }
      element.content = content;
      return prev;
    };

    const prevDescription = updateMeta('description', description);
    const prevKeywords = updateMeta('keywords', keywords);

    return () => {
      document.title = prevTitle;
      if (prevDescription !== undefined) {
        const el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (el) el.content = prevDescription || '';
      }
      if (prevKeywords !== undefined) {
        const el = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
        if (el) el.content = prevKeywords || '';
      }
    };
  }, [title, description, keywords]);

  return null;
}
