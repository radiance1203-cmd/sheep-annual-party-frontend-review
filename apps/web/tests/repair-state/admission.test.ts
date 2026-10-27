import { describe, expect, test } from 'vitest';
import { fixtures } from '../page-state-fixtures';
import { gameAdmission } from '../../src/repair-state/admission';

describe('shared formal admission capabilities', () => {
  test('CHECK_IN waits while PLAYING uses a free ordinary slot', () => {
    const checkIn = fixtures({ phase: 'CHECK_IN' }); const playing = fixtures();
    expect(gameAdmission(checkIn.event, checkIn.me).kind).toBe('blocked');
    expect(gameAdmission(playing.event, playing.me).kind).toBe('ordinary');
  });
  test('DRAINING admits only a current, unexpired reserved grant with entry open', () => {
    const f = fixtures({ phase: 'DRAINING', grant: true });
    expect(gameAdmission(f.event, f.me).kind).toBe('makeup');
    expect(gameAdmission({ ...f.event, accepting_new_sessions: false }, f.me).kind).toBe('blocked');
    expect(gameAdmission(f.event, f.me, Date.now() + 700000).kind).toBe('blocked');
    expect(gameAdmission(f.event, fixtures({ phase: 'DRAINING' }).me).kind).toBe('blocked');
  });
  test('zero slots, rank frozen, paused, review, ineligible and staff-only cannot create a new formal request', () => {
    for (const f of [fixtures({ slots: 0 }), fixtures({ frozen: true }), fixtures({ paused: true }), fixtures({ recovery: true }), fixtures({ eligible: false }), fixtures({ identity: 'redeemer' })]) expect(gameAdmission(f.event, f.me).kind).toBe('blocked');
  });
  test('existing original session remains recoverable after new-entry closure', () => {
    const f = fixtures({ active: true, paused: true, sessionState: 'RUNNING' });
    expect(gameAdmission(f.event, f.me).kind).toBe('recover');
    const verifying = fixtures({ active: true, paused: true, sessionState: 'VERIFYING' });
    expect(gameAdmission(verifying.event, verifying.me).kind).toBe('result');
  });
  test('unknown event blocks and absent identity requires login', () => {
    const f = fixtures(); expect(gameAdmission(undefined, f.me).kind).toBe('blocked');
    expect(gameAdmission(f.event, undefined).kind).toBe('login');
  });
});
