import { useCallback, useState } from 'react';

const STORAGE_KEY = 'vastuplan-comment-author';
const DEFAULT_AUTHOR = 'Reviewer';

export function useCommentAuthor(): {
  author: string;
  setAuthor: (name: string) => void;
} {
  const [author, setAuthorState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_AUTHOR;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_AUTHOR;
  });

  const setAuthor = useCallback((name: string) => {
    const trimmed = name.trim();
    const value = trimmed || DEFAULT_AUTHOR;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value);
    }
    setAuthorState(value);
  }, []);

  return { author, setAuthor };
}

export { DEFAULT_AUTHOR as COMMENT_AUTHOR_DEFAULT };
