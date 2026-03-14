import { describe, expect, it } from 'vitest';
import { buildAvatarUrl, getAvatarUrl } from './avatarCatalog';

describe('avatarCatalog', () => {
  it('builds local avatar URLs from the root by default', () => {
    expect(getAvatarUrl('c_001', 11)).toBe('/avatars/c_001/avatar-011.svg');
  });

  it('builds avatar URLs relative to a deployed base path', () => {
    expect(buildAvatarUrl('c_007', 3, '/3k/')).toBe('/3k/avatars/c_007/avatar-003.svg');
    expect(buildAvatarUrl('c_007', 3, '/3k')).toBe('/3k/avatars/c_007/avatar-003.svg');
  });

  it('clamps invalid variant numbers into the supported range', () => {
    expect(buildAvatarUrl('c_009', 0, '/')).toBe('/avatars/c_009/avatar-001.svg');
    expect(buildAvatarUrl('c_009', 999, '/')).toBe('/avatars/c_009/avatar-100.svg');
  });
});
