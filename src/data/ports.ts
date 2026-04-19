import type { EnemyId, Port, TowerId } from '@/types';

// ─── PORTS / PROTOCOLS ────────────────────────────────────────────────────
// Each enemy has one "open port" — a secondary exploit-vector tag that's
// orthogonal to the existing damageType/resistance system. Each turret that
// specializes in a port deals +PORT_EXPLOIT_BONUS% damage against enemies
// carrying that port, with a floating "EXPLOIT!" floater on the hit.
//
// Design intent: damage types answer "what weapons can hurt this?" (armor /
// phase / chain-immune). Ports answer "which turret is BEST at hurting this?"
// It gives every specialist a clean "oh, THIS is what I'm for" moment without
// making any matchup mandatory.
//
// The split: we keep the data in a table here rather than editing every
// enemy/tower definition, so the port layer is easy to retune in one place.

export const PORT_EXPLOIT_BONUS = 0.25; // +25% damage on matched port

// Narrative mapping:
//   SSH  — armored / authenticated targets (trojan, rootkit, juggernaut)
//   HTTP — phase-shift / illusion targets (phantom, wraith, stealth)
//   DNS  — support / routing targets (leech, parasite)
//   SMB  — swarm / replicator targets (worm, spider, glitch)
//   ICMP — detonator / pulse targets (bomber, corruptor, kernel)
export const ENEMY_PORT: Partial<Record<EnemyId, Port>> = {
  worm: 'SMB',
  spider: 'SMB',
  glitch: 'SMB',
  trojan: 'SSH',
  rootkit: 'SSH',
  juggernaut: 'SSH',
  phantom: 'HTTP',
  wraith: 'HTTP',
  stealth: 'HTTP',
  leech: 'DNS',
  parasite: 'DNS',
  bomber: 'ICMP',
  corruptor: 'ICMP',
  // Bosses span multiple ports across the roster so no single-exploit comp can
  // solo every encounter. Exact assignment mixes up counters.
  kernel: 'ICMP',
  daemon: 'SMB',
  leviathan: 'SSH',
  swarm: 'SMB',
  voidlord: 'HTTP',
};

// Turret exploit pairings — each turret has a natural affinity. Support turrets
// and raw damage turrets without a specialty stay undefined (no bonus).
export const TOWER_EXPLOITS: Partial<Record<TowerId, Port>> = {
  firewall: 'SMB',       // anti-swarm frontline
  antivirus: 'SSH',      // pierce armor = crack SSH auth
  railgun: 'SSH',        // heavy pierce = SSH
  quantum: 'HTTP',       // phase-shift bypass = anti-HTTP illusions
  scrambler: 'HTTP',     // armor-strip debuff on phased targets
  ice: 'SMB',            // AOE on swarms
  mine: 'ICMP',          // detonator vs detonators
  chain: 'ICMP',         // chain through detonator clusters
  pulse: 'DNS',          // radial disables support
  honeypot: 'DNS',       // bait/reroute support
  sniper: 'SSH',         // single-target pierce
  sentinel: 'HTTP',      // passive field detects phase
  // booster_node / data_miner are pure support — no exploit.
};

export function exploitBonus(towerId: TowerId, enemyId: EnemyId): number {
  const tp = TOWER_EXPLOITS[towerId];
  const ep = ENEMY_PORT[enemyId];
  if (!tp || !ep) return 1;
  return tp === ep ? 1 + PORT_EXPLOIT_BONUS : 1;
}
