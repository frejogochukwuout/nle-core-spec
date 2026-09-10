/* mockMixer — the mock G-layer sidecar, mirroring spec 20 §4.2's
   MixerSceneSettings shape (per-track strips keyed by trackId + aux buses +
   master). Real home: project data mutated via audio commands (updateFromTrack
   path, zero timeline invalidation — spec 15 §13.15). The mock co-locates it
   next to the doc slice with the same honesty comment as the rest.
   Roles (Dialogue/BGM/SFX/Music) are client-side tags keyed by trackId /
   mediaId — spec 09 has no role field; seal decision pending (design doc §7). */

export type Role = 'dialogue' | 'bgm' | 'sfx' | 'music';

export interface MixerTrackSettings {
  fader: number;        // dB, -60..+6 (0 = unity)
  pan: number;          // -100 (L) .. 100 (R)
  inserts: [string | null, string | null]; // 2 slots
  auxA: number;         // 0..1 send level
  auxB: number;
  auxPreFader: boolean;
  outputBus: 0 | 1 | 2; // 0 = master, 1 = A1, 2 = A2
}

export interface AuxBusSettings {
  name: string;
  returnGain: number;   // dB
  on: boolean;
}

export interface DuckingSettings {
  source: string | null; // trackId of the sidechain source (default: dialogue track)
  amount: number;        // 0..1
  attack: number;        // ms
  release: number;       // ms
}

export interface MockMixerScene {
  tracks: Record<string, MixerTrackSettings>;
  buses: { a1: AuxBusSettings; a2: AuxBusSettings };
  ducking: Record<string, DuckingSettings>;
  roles: Record<string, Role>; // trackId -> role (client-side tags)
}

export const ROLES: Role[] = ['dialogue', 'bgm', 'sfx', 'music'];

export const ROLE_LABEL: Record<Role, string> = {
  dialogue: 'Dialogue', bgm: 'BGM', sfx: 'SFX', music: 'Music',
};

/** role-tagged mock track list: A1 dialogue, A2 bgm, A3 sfx, A4 music */
export function createMixerScene(audioTrackIds: string[]): MockMixerScene {
  const tracks: Record<string, MixerTrackSettings> = {};
  const roles: Record<string, Role> = {};
  const ducking: Record<string, DuckingSettings> = {};
  const roleSeq: Role[] = ['dialogue', 'bgm', 'sfx', 'music'];
  audioTrackIds.forEach((id, i) => {
    tracks[id] = {
      fader: i === 0 ? -3 : i === 1 ? -12 : -6,
      pan: 0,
      inserts: i === 0 ? ['EQ', null] : [null, null],
      auxA: i === 3 ? 0.3 : 0,
      auxB: 0,
      auxPreFader: false,
      outputBus: 0,
    };
    roles[id] = roleSeq[i % roleSeq.length];
  });
  // default ducking: every bgm/music track ducks under the FIRST dialogue track
  const dialogueId = audioTrackIds.find((id) => roles[id] === 'dialogue') ?? null;
  for (const id of audioTrackIds) {
    if (roles[id] === 'bgm' || roles[id] === 'music') {
      ducking[id] = { source: dialogueId, amount: 0.6, attack: 20, release: 400 };
    }
  }
  return {
    tracks,
    buses: {
      a1: { name: 'Reverb', returnGain: -6, on: true },
      a2: { name: 'Spare', returnGain: 0, on: false },
    },
    ducking,
    roles,
  };
}

export const dbToSlider = (db: number) => (db + 60) / 66; // 0..1
export const sliderToDb = (v: number) => v * 66 - 60;

export const dbLabel = (db: number) =>
  db <= -59.5 ? '−∞' : `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
