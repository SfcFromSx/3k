import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const charactersPath = path.join(rootDir, 'src/assets/characters.json');
const outputRoot = path.join(rootDir, 'public/avatars');
const avatarCount = 100;

const characters = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));

const factionThemes = {
  Shu: { primary: '#2c7a4b', secondary: '#d9b95b', accent: '#f2e6bd', hair: '#2c1e18' },
  Wu: { primary: '#2b5f8d', secondary: '#f29f4b', accent: '#f7e8c9', hair: '#2d1f1b' },
  Wei: { primary: '#384457', secondary: '#c7a35a', accent: '#edf0f4', hair: '#201b1a' },
  Other: { primary: '#7f355a', secondary: '#e2a95b', accent: '#f8e9de', hair: '#261a19' },
};

const characterProfiles = {
  c_001: { headwear: 'phoenix', symbol: 'spear', beard: 'none', ornament: 'feather', robe: '#f3f0e8' },
  c_002: { headwear: 'crown', symbol: 'fan', beard: 'none', ornament: 'flame', robe: '#f8efe3' },
  c_003: { headwear: 'flower', symbol: 'lotus', beard: 'none', ornament: 'silk', robe: '#f7d7dd', hair: '#23151a' },
  c_004: { headwear: 'crown', symbol: 'seal', beard: 'mustache', ornament: 'moon', robe: '#d9dbe4' },
  c_005: { headwear: 'helmet', symbol: 'blade', beard: 'long', ornament: 'ember', robe: '#7a2f2d' },
  c_006: { headwear: 'helmet', symbol: 'halberd', beard: 'goatee', ornament: 'flare', robe: '#43203f' },
  c_007: { headwear: 'hood', symbol: 'fan', beard: 'mustache', ornament: 'star', robe: '#eef2db' },
  c_008: { headwear: 'crown', symbol: 'orb', beard: 'mustache', ornament: 'wave', robe: '#d8c39a' },
  c_009: { headwear: 'hood', symbol: 'moon', beard: 'goatee', ornament: 'spire', robe: '#d6d7df' },
  c_010: { headwear: 'helmet', symbol: 'bridge', beard: 'mustache', ornament: 'bolt', robe: '#423028' },
};

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const pad = (value) => String(value).padStart(3, '0');

const hashString = (input) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed) => () => {
  let value = (seed += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const shiftHex = (hex, delta) => {
  const amount = clamp(delta, -255, 255);
  const channels = hex.match(/[0-9a-f]{2}/gi)?.map((channel) => parseInt(channel, 16)) ?? [128, 128, 128];
  const adjusted = channels.map((channel) => clamp(channel + amount, 0, 255));
  return `#${adjusted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const initialsFor = (name) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const buildHeadwear = (type, primary, secondary, rng) => {
  const raise = Math.round(rng() * 10);

  if (type === 'helmet') {
    return `
      <path d="M68 ${90 - raise} Q128 ${28 - raise} 188 ${90 - raise} L176 124 Q128 96 80 124 Z" fill="${primary}" />
      <path d="M94 ${88 - raise} Q128 ${54 - raise} 162 ${88 - raise}" fill="none" stroke="${secondary}" stroke-width="8" stroke-linecap="round" />
    `;
  }

  if (type === 'hood') {
    return `
      <path d="M56 ${102 - raise} Q128 ${26 - raise} 200 ${102 - raise} L184 156 Q128 126 72 156 Z" fill="${primary}" opacity="0.92" />
      <path d="M80 ${112 - raise} Q128 ${70 - raise} 176 ${112 - raise}" fill="none" stroke="${secondary}" stroke-width="6" stroke-linecap="round" />
    `;
  }

  if (type === 'flower') {
    return `
      <circle cx="128" cy="${62 - raise}" r="16" fill="${secondary}" />
      <circle cx="108" cy="${78 - raise}" r="14" fill="${primary}" />
      <circle cx="148" cy="${78 - raise}" r="14" fill="${primary}" />
      <circle cx="128" cy="${92 - raise}" r="14" fill="${shiftHex(primary, 20)}" />
    `;
  }

  if (type === 'phoenix') {
    return `
      <path d="M76 ${88 - raise} Q128 ${18 - raise} 180 ${88 - raise}" fill="none" stroke="${secondary}" stroke-width="10" stroke-linecap="round" />
      <path d="M128 ${56 - raise} L148 ${86 - raise} L108 ${86 - raise} Z" fill="${primary}" />
    `;
  }

  return `
    <path d="M78 ${86 - raise} Q128 ${34 - raise} 178 ${86 - raise}" fill="none" stroke="${secondary}" stroke-width="12" stroke-linecap="round" />
    <rect x="92" y="${86 - raise}" width="72" height="18" rx="9" fill="${primary}" />
  `;
};

const buildFacialHair = (type, hairColor, rng) => {
  const width = 24 + Math.round(rng() * 10);

  if (type === 'long') {
    return `
      <path d="M128 156 Q112 182 ${128 - width} 222 Q128 212 ${128 + width} 222 Q144 182 128 156 Z" fill="${hairColor}" opacity="0.9" />
      <path d="M104 150 Q128 168 152 150" fill="none" stroke="${hairColor}" stroke-width="5" stroke-linecap="round" />
    `;
  }

  if (type === 'goatee') {
    return `
      <path d="M128 160 Q116 182 128 200 Q140 182 128 160 Z" fill="${hairColor}" opacity="0.9" />
      <path d="M106 148 Q128 158 150 148" fill="none" stroke="${hairColor}" stroke-width="5" stroke-linecap="round" />
    `;
  }

  if (type === 'mustache') {
    return `
      <path d="M104 150 Q118 140 128 150 Q138 140 152 150" fill="none" stroke="${hairColor}" stroke-width="6" stroke-linecap="round" />
    `;
  }

  return '';
};

const buildSymbol = (symbol, color, secondary) => {
  if (symbol === 'spear') {
    return `<path d="M128 182 L128 228 M118 194 L128 174 L138 194" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  if (symbol === 'fan') {
    return `<path d="M96 216 Q128 174 160 216" fill="none" stroke="${color}" stroke-width="6" /><path d="M128 174 L128 228" stroke="${secondary}" stroke-width="5" />`;
  }
  if (symbol === 'lotus') {
    return `<path d="M128 184 L142 212 L128 228 L114 212 Z" fill="${color}" /><path d="M100 210 Q128 178 156 210" fill="none" stroke="${secondary}" stroke-width="5" />`;
  }
  if (symbol === 'seal') {
    return `<rect x="106" y="188" width="44" height="44" rx="10" fill="${color}" /><path d="M112 206 H144 M112 218 H138" stroke="${secondary}" stroke-width="4" stroke-linecap="round" />`;
  }
  if (symbol === 'blade') {
    return `<path d="M120 184 L140 184 L146 226 L114 226 Z" fill="${color}" /><path d="M128 172 L144 190 L128 198 L112 190 Z" fill="${secondary}" />`;
  }
  if (symbol === 'halberd') {
    return `<path d="M128 178 L128 230" stroke="${color}" stroke-width="6" stroke-linecap="round" /><path d="M110 188 Q128 172 146 188" fill="none" stroke="${secondary}" stroke-width="5" />`;
  }
  if (symbol === 'orb') {
    return `<circle cx="128" cy="206" r="20" fill="${color}" /><circle cx="120" cy="198" r="6" fill="${secondary}" opacity="0.65" />`;
  }
  if (symbol === 'moon') {
    return `<path d="M138 184 A22 22 0 1 0 138 228 A16 16 0 1 1 138 184 Z" fill="${color}" />`;
  }
  if (symbol === 'bridge') {
    return `<path d="M96 220 Q128 188 160 220" fill="none" stroke="${color}" stroke-width="6" /><path d="M104 222 V206 M128 222 V198 M152 222 V206" stroke="${secondary}" stroke-width="4" />`;
  }
  return `<circle cx="128" cy="206" r="18" fill="${color}" />`;
};

const buildOrnament = (ornament, color, secondary, rng) => {
  const angle = Math.round(rng() * 18);

  if (ornament === 'feather') {
    return `<path d="M192 78 Q216 64 220 106 Q196 104 182 122" fill="none" stroke="${secondary}" stroke-width="7" stroke-linecap="round" transform="rotate(${angle} 200 96)" />`;
  }
  if (ornament === 'flame') {
    return `<path d="M206 138 Q222 110 206 82 Q188 110 206 138 Z" fill="${color}" opacity="0.8" /><path d="M206 122 Q214 106 206 94 Q198 106 206 122 Z" fill="${secondary}" opacity="0.9" />`;
  }
  if (ornament === 'silk') {
    return `<path d="M36 170 Q72 130 86 182 T138 184" fill="none" stroke="${secondary}" stroke-width="7" stroke-linecap="round" opacity="0.8" />`;
  }
  if (ornament === 'moon') {
    return `<path d="M44 80 A22 22 0 1 0 44 124 A16 16 0 1 1 44 80 Z" fill="${secondary}" opacity="0.9" />`;
  }
  if (ornament === 'ember') {
    return `<circle cx="48" cy="72" r="10" fill="${secondary}" opacity="0.8" /><circle cx="66" cy="58" r="6" fill="${color}" opacity="0.7" />`;
  }
  if (ornament === 'flare') {
    return `<path d="M58 76 L74 94 L54 100 L66 116 L42 112 L36 134 L28 108 L6 112 L18 96 L0 86 L24 84 L18 60 L36 76 Z" fill="${secondary}" opacity="0.55" />`;
  }
  if (ornament === 'star') {
    return `<path d="M44 76 L52 96 L74 98 L56 112 L62 134 L44 120 L26 134 L32 112 L14 98 L36 96 Z" fill="${secondary}" opacity="0.8" />`;
  }
  if (ornament === 'wave') {
    return `<path d="M18 182 Q42 160 66 182 T114 182" fill="none" stroke="${secondary}" stroke-width="6" opacity="0.75" />`;
  }
  if (ornament === 'spire') {
    return `<path d="M206 60 L226 94 L186 94 Z" fill="${secondary}" opacity="0.8" /><rect x="198" y="94" width="16" height="26" rx="6" fill="${color}" opacity="0.7" />`;
  }
  if (ornament === 'bolt') {
    return `<path d="M42 64 L58 88 H46 L64 116 L32 92 H46 Z" fill="${secondary}" opacity="0.8" />`;
  }
  return '';
};

const buildAvatarSvg = (character, variant) => {
  const theme = factionThemes[character.faction] ?? factionThemes.Other;
  const profile = characterProfiles[character.id] ?? characterProfiles.c_001;
  const seed = hashString(`${character.id}-${variant}`);
  const rng = mulberry32(seed);

  const skin = shiftHex(theme.accent, Math.round((rng() - 0.5) * 30));
  const hair = shiftHex(profile.hair ?? theme.hair, Math.round((rng() - 0.5) * 20));
  const robe = shiftHex(profile.robe ?? theme.primary, Math.round((rng() - 0.5) * 18));
  const trim = shiftHex(theme.secondary, Math.round((rng() - 0.5) * 24));
  const backgroundTop = shiftHex(theme.primary, Math.round((rng() - 0.5) * 22));
  const backgroundBottom = shiftHex(theme.secondary, Math.round((rng() - 0.5) * 22));
  const eyeY = 108 + Math.round((rng() - 0.5) * 6);
  const eyeOffset = 22 + Math.round(rng() * 6);
  const faceWidth = 84 + Math.round((rng() - 0.5) * 12);
  const faceHeight = 96 + Math.round((rng() - 0.5) * 10);
  const shoulders = 82 + Math.round(rng() * 20);
  const insignia = initialsFor(character.nameEN);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${character.nameEN} avatar ${variant}">
  <defs>
    <linearGradient id="bg-${character.id}-${variant}" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${backgroundTop}" />
      <stop offset="100%" stop-color="${backgroundBottom}" />
    </linearGradient>
    <radialGradient id="glow-${character.id}-${variant}" cx="50%" cy="38%" r="60%">
      <stop offset="0%" stop-color="${shiftHex(theme.accent, 12)}" stop-opacity="0.94" />
      <stop offset="100%" stop-color="${theme.primary}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="256" height="256" rx="36" fill="url(#bg-${character.id}-${variant})" />
  <rect x="12" y="12" width="232" height="232" rx="28" fill="url(#glow-${character.id}-${variant})" opacity="0.75" />
  ${buildOrnament(profile.ornament, theme.primary, trim, rng)}
  <circle cx="128" cy="128" r="104" fill="none" stroke="${shiftHex(theme.accent, -8)}" stroke-width="8" opacity="0.85" />
  <path d="M52 222 Q128 ${160 + Math.round(rng() * 16)} 204 222 V256 H52 Z" fill="${robe}" />
  <path d="M68 210 Q128 ${184 + Math.round(rng() * 10)} 188 210" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round" opacity="0.8" />
  <path d="M86 206 Q128 170 170 206" fill="none" stroke="${theme.accent}" stroke-width="6" stroke-linecap="round" opacity="0.65" />
  <ellipse cx="128" cy="146" rx="${faceWidth}" ry="${faceHeight}" fill="${skin}" />
  <path d="M84 132 Q128 ${52 + Math.round(rng() * 18)} 172 132 L168 92 Q128 ${38 + Math.round(rng() * 10)} 88 92 Z" fill="${hair}" />
  <path d="M80 134 Q74 162 92 188" fill="none" stroke="${hair}" stroke-width="16" stroke-linecap="round" opacity="0.95" />
  <path d="M176 134 Q182 162 164 188" fill="none" stroke="${hair}" stroke-width="16" stroke-linecap="round" opacity="0.95" />
  ${buildHeadwear(profile.headwear, theme.primary, trim, rng)}
  <path d="M${128 - eyeOffset - 10} ${eyeY - 12} Q${128 - eyeOffset} ${eyeY - 18} ${128 - eyeOffset + 12} ${eyeY - 12}" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round" />
  <path d="M${128 + eyeOffset - 12} ${eyeY - 12} Q${128 + eyeOffset} ${eyeY - 18} ${128 + eyeOffset + 10} ${eyeY - 12}" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round" />
  <ellipse cx="${128 - eyeOffset}" cy="${eyeY}" rx="7" ry="5" fill="#251b1a" />
  <ellipse cx="${128 + eyeOffset}" cy="${eyeY}" rx="7" ry="5" fill="#251b1a" />
  <circle cx="${128 - eyeOffset - 2}" cy="${eyeY - 1}" r="2" fill="#fff8ee" opacity="0.8" />
  <circle cx="${128 + eyeOffset - 2}" cy="${eyeY - 1}" r="2" fill="#fff8ee" opacity="0.8" />
  <path d="M128 ${eyeY + 10} Q120 ${eyeY + 28} 128 ${eyeY + 38} Q136 ${eyeY + 28} 128 ${eyeY + 10}" fill="${shiftHex(skin, -14)}" opacity="0.68" />
  <path d="M104 ${eyeY + 56} Q128 ${eyeY + 70} 152 ${eyeY + 56}" fill="none" stroke="${shiftHex(hair, 10)}" stroke-width="5" stroke-linecap="round" />
  <path d="M${128 - shoulders} 232 Q128 180 ${128 + shoulders} 232" fill="none" stroke="${shiftHex(robe, 24)}" stroke-width="12" stroke-linecap="round" opacity="0.55" />
  ${buildFacialHair(profile.beard, hair, rng)}
  <circle cx="128" cy="206" r="34" fill="${shiftHex(theme.primary, -12)}" opacity="0.92" />
  ${buildSymbol(profile.symbol, trim, theme.accent)}
  <text x="128" y="92" text-anchor="middle" font-size="18" font-weight="700" font-family="Georgia, serif" fill="${shiftHex(theme.accent, -12)}" opacity="0.75">${insignia}</text>
</svg>`;
};

ensureDir(outputRoot);

for (const character of characters) {
  const characterDir = path.join(outputRoot, character.id);
  ensureDir(characterDir);

  for (let variant = 1; variant <= avatarCount; variant += 1) {
    const outputPath = path.join(characterDir, `avatar-${pad(variant)}.svg`);
    fs.writeFileSync(outputPath, buildAvatarSvg(character, variant));
  }
}

console.log(`Generated ${characters.length * avatarCount} avatars in ${path.relative(rootDir, outputRoot)}`);
