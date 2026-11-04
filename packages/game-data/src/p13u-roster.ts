import { P13T1_ROSTER } from './p13t1';
import { MUS_PROVISIONAL_MEMBERS } from './p13u';
export const P13U_ROSTER = P13T1_ROSTER.map((u) =>
  MUS_PROVISIONAL_MEMBERS.includes(u.id)
    ? { ...u, synergies: [...u.synergies, 'mus'] }
    : structuredClone(u),
);
