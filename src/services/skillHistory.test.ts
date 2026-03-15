import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureSkillHistorySeed, getSkillHistory, saveSkillVersion } from './skillHistory';

describe('skillHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);
  });

  it('mirrors seeded history into the project snapshot endpoint', () => {
    window.localStorage.setItem('skill_A', 'Seeded lesson');

    ensureSkillHistorySeed('A');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/skill-history/snapshot');
    const payload = JSON.parse(String(init?.body));
    expect(payload.playerId).toBe('A');
    expect(payload.currentSkill).toBe('Seeded lesson');
    expect(payload.history).toHaveLength(1);
    expect(payload.history[0]).toEqual(expect.objectContaining({
      version: 1,
      round: 0,
      source: 'seed',
      content: 'Seeded lesson',
    }));
  });

  it('saves a new version locally and mirrors the full history into project files', () => {
    const record = saveSkillVersion('B', 'Use faction clues first.', 2, 'round_review');

    expect(record).not.toBeNull();
    expect(getSkillHistory('B')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.playerId).toBe('B');
    expect(payload.currentSkill).toBe('Use faction clues first.');
    expect(payload.history).toEqual([
      expect.objectContaining({
        version: 1,
        round: 2,
        source: 'round_review',
        content: 'Use faction clues first.',
      }),
    ]);
  });

  it('still mirrors the current skill state when the content has not changed', () => {
    saveSkillVersion('C', 'Track answered traits.', 1, 'round_review');
    vi.mocked(fetch).mockClear();

    const record = saveSkillVersion('C', 'Track answered traits.', 2, 'round_review');

    expect(record).toEqual(expect.objectContaining({
      version: 1,
      round: 1,
      content: 'Track answered traits.',
    }));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload.history).toHaveLength(1);
    expect(payload.currentSkill).toBe('Track answered traits.');
  });
});
