import { afterEach, describe, expect, it, vi } from 'vitest';
import { r3CandidateRequested } from './r3-candidate';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('unaccepted R3 preview isolation', () => {
  it('allows an explicit candidate only in local development', () => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { hostname: '127.0.0.1', search: '?artCandidate=r3' } });
    expect(r3CandidateRequested()).toBe(true);
  });
  it.each([
    ['127.0.0.1', '', true], ['farm.example', '?artCandidate=r3', true],
    ['127.0.0.1', '?artCandidate=r3', false], ['localhost', '?artCandidate=old', true],
  ])('rejects host=%s search=%s development=%s', (hostname, search, development) => {
    vi.stubEnv('DEV', development);
    vi.stubGlobal('window', { location: { hostname, search } });
    expect(r3CandidateRequested()).toBe(false);
  });
});
