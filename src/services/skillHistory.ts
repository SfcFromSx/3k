export type SkillPlayerId = 'A' | 'B' | 'C';
export type SkillVersionSource = 'seed' | 'round_review';

export interface SkillVersionRecord {
  version: number;
  round: number;
  updatedAt: string;
  source: SkillVersionSource;
  content: string;
  summary: string;
}

const CURRENT_KEY_PREFIX = 'skill_';
const HISTORY_KEY_PREFIX = 'skill_history_';

const getCurrentKey = (playerId: SkillPlayerId) => `${CURRENT_KEY_PREFIX}${playerId}`;
const getHistoryKey = (playerId: SkillPlayerId) => `${HISTORY_KEY_PREFIX}${playerId}`;

const parseHistory = (raw: string | null): SkillVersionRecord[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (playerId: SkillPlayerId, history: SkillVersionRecord[]) => {
  localStorage.setItem(getHistoryKey(playerId), JSON.stringify(history));
};

const summarizeSkill = (content: string) => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Empty skill snapshot.';
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
};

export const getSkillHistory = (playerId: SkillPlayerId): SkillVersionRecord[] =>
  parseHistory(localStorage.getItem(getHistoryKey(playerId)));

export const getCurrentSkill = (playerId: SkillPlayerId): string =>
  localStorage.getItem(getCurrentKey(playerId)) || '';

export const ensureSkillHistorySeed = (playerId: SkillPlayerId) => {
  const history = getSkillHistory(playerId);
  const currentSkill = getCurrentSkill(playerId).trim();

  if (history.length > 0 || !currentSkill) return;

  const seededRecord: SkillVersionRecord = {
    version: 1,
    round: 0,
    updatedAt: new Date().toISOString(),
    source: 'seed',
    content: currentSkill,
    summary: summarizeSkill(currentSkill),
  };

  writeHistory(playerId, [seededRecord]);
};

export const saveSkillVersion = (
  playerId: SkillPlayerId,
  content: string,
  round: number,
  source: SkillVersionSource
): SkillVersionRecord | null => {
  const normalizedContent = content.trim();
  if (!normalizedContent) return null;

  ensureSkillHistorySeed(playerId);
  const history = getSkillHistory(playerId);
  const latest = history.at(-1);

  if (latest?.content.trim() === normalizedContent) {
    localStorage.setItem(getCurrentKey(playerId), normalizedContent);
    return latest;
  }

  const nextRecord: SkillVersionRecord = {
    version: (latest?.version ?? 0) + 1,
    round,
    updatedAt: new Date().toISOString(),
    source,
    content: normalizedContent,
    summary: summarizeSkill(normalizedContent),
  };

  const nextHistory = [...history, nextRecord];
  writeHistory(playerId, nextHistory);
  localStorage.setItem(getCurrentKey(playerId), normalizedContent);
  return nextRecord;
};
