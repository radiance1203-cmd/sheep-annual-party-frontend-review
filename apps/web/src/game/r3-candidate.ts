/// <reference types="vite/client" />
/** Callers additionally restrict the preview to practice/teaching, never formal play. */
export function r3CandidateRequested(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined'
    && ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get('artCandidate') === 'r3';
}
