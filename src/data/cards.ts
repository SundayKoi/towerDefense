import type { CardDef, RunState, TowerId } from '@/types';

// ==================== HELPERS ====================

function addToken(s: RunState, id: TowerId, count: number): void {
  s.deployTokens[id] = (s.deployTokens[id] ?? 0) + count;
}

function addEffect(s: RunState, tower: TowerId, tag: string): void {
  if (!s.towerEffects[tower]) s.towerEffects[tower] = new Set<string>();
  s.towerEffects[tower]!.add(tag);
}

// ==================== DEPLOY CARDS ====================

const DEPLOY: CardDef[] = [
  {
    id: 'deploy_firewall',
    name: 'DEPLOY: FIREWALL',
    rarity: 'common',
    category: 'deploy',
    towerHint: 'firewall',
    description: 'Gain a FIREWALL deploy token. Kinetic frontline.',
    apply: (s) => { addToken(s, 'firewall', 1); },
  },
  {
    id: 'deploy_honeypot',
    name: 'DEPLOY: HONEYPOT',
    rarity: 'common',
    category: 'deploy',
    towerHint: 'honeypot',
    description: 'Gain a HONEYPOT deploy token. Slows enemies 45% and drops goo puddles.',
    apply: (s) => { addToken(s, 'honeypot', 1); },
  },
  {
    id: 'deploy_antivirus',
    name: 'DEPLOY: ANTIVIRUS',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'antivirus',
    description: 'Gain an ANTIVIRUS deploy token. Long-range piercer. Fires 2 shots.',
    apply: (s) => { addToken(s, 'antivirus', 1); },
  },
  {
    id: 'deploy_quantum',
    name: 'DEPLOY: QUANTUM',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'quantum',
    description: 'Gain a QUANTUM deploy token. 35% crit chance, 3.5× crit damage.',
    apply: (s) => { addToken(s, 'quantum', 1); },
  },
  {
    id: 'deploy_ice',
    name: 'DEPLOY: ICE-BREAKER',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'ice',
    description: 'Gain an ICE-BREAKER deploy token. Explosive AOE shredder.',
    apply: (s) => { addToken(s, 'ice', 1); },
  },
  {
    id: 'deploy_mine',
    name: 'DEPLOY: ARTILLERY',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'mine',
    description: 'Gain an ARTILLERY deploy token. Heavy AoE shells with long range.',
    apply: (s) => { addToken(s, 'mine', 1); },
  },
  {
    id: 'deploy_chain',
    name: 'DEPLOY: CHAIN LIGHTNING',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'chain',
    description: 'Gain a CHAIN LIGHTNING deploy token. Arcs through 3 enemies.',
    apply: (s) => { addToken(s, 'chain', 1); },
  },
  {
    id: 'deploy_railgun',
    name: 'DEPLOY: RAILGUN',
    rarity: 'legendary',
    category: 'deploy',
    towerHint: 'railgun',
    description: 'Gain a RAILGUN deploy token. Pierces every enemy in its path.',
    apply: (s) => { addToken(s, 'railgun', 1); },
  },
  {
    id: 'deploy_pulse',
    name: 'DEPLOY: EMP ARRAY',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'pulse',
    description: 'Gain an EMP ARRAY deploy token. Radial burst every 2.5s hits all enemies in range.',
    apply: (s) => { addToken(s, 'pulse', 1); },
  },
  {
    id: 'deploy_sniper',
    name: 'DEPLOY: OVERWATCH',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'sniper',
    description: 'Gain an OVERWATCH deploy token. Extreme range, massive damage, 40% crit at 4×.',
    apply: (s) => { addToken(s, 'sniper', 1); },
  },
  {
    id: 'deploy_scrambler',
    name: 'DEPLOY: DISRUPTOR',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'scrambler',
    description: 'Gain a DISRUPTOR deploy token. Strips armor on every hit, enabling lethal combos.',
    apply: (s) => { addToken(s, 'scrambler', 1); },
  },
  {
    id: 'deploy_sentinel',
    name: 'DEPLOY: SENTINEL NODE',
    rarity: 'epic',
    category: 'deploy',
    towerHint: 'sentinel',
    description: 'Gain a SENTINEL NODE token. Passive field damages and slows all nearby enemies.',
    apply: (s) => { addToken(s, 'sentinel', 1); },
  },
  {
    id: 'deploy_booster_node',
    name: 'DEPLOY: BOOSTER NODE',
    rarity: 'common',
    category: 'deploy',
    towerHint: 'booster_node',
    description: 'Gain a BOOSTER NODE token. Passive support — buffs adjacent turrets (+25% damage, +15% rate).',
    apply: (s) => { addToken(s, 'booster_node', 1); },
  },
  {
    id: 'deploy_data_miner',
    name: 'DEPLOY: DATA MINER',
    rarity: 'rare',
    category: 'deploy',
    towerHint: 'data_miner',
    description: 'Gain a DATA MINER token. Passive XP generator — +3 XP/sec during waves.',
    apply: (s) => { addToken(s, 'data_miner', 1); },
  },
];

// ==================== UPGRADE CARDS (behavioral changes only) ====================

const UPGRADE: CardDef[] = [
  // ===== FIREWALL (5 upgrades) =====
  {
    id: 'fw_burst',
    name: 'FIREWALL: BURST PROTOCOL',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'Every 4th FIREWALL shot fires a triple spread burst.',
    apply: (s) => { addEffect(s, 'firewall', 'burst'); },
  },
  {
    id: 'fw_incendiary',
    name: 'FIREWALL: INCENDIARY.EXE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'FIREWALL shots leave a small fire zone that burns nearby enemies.',
    apply: (s) => { addEffect(s, 'firewall', 'incendiary'); },
  },
  {
    id: 'fw_ricochet',
    name: 'FIREWALL: RICOCHET',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'FIREWALL shots ricochet to a 2nd nearby enemy for 55% damage.',
    apply: (s) => { addEffect(s, 'firewall', 'ricochet'); },
  },
  {
    id: 'fw_tracer',
    name: 'FIREWALL: TRACER ROUNDS',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'FIREWALL shots mark enemies hit — marked enemies take +30% from all sources for 2s.',
    apply: (s) => { addEffect(s, 'firewall', 'tracer'); },
  },
  {
    id: 'fw_overdrive',
    name: 'FIREWALL: OVERDRIVE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'firewall',
    description: 'Every kill shortens FIREWALL\'s next cooldown by 0.4s (crits reduce it by 0.8s).',
    apply: (s) => { addEffect(s, 'firewall', 'overdrive'); },
  },

  // ===== HONEYPOT (5 upgrades) =====
  {
    id: 'hp_persistent',
    name: 'HONEYPOT: PERSISTENT PAYLOAD',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'HONEYPOT goo puddles last twice as long.',
    apply: (s) => { addEffect(s, 'honeypot', 'persistent'); },
  },
  {
    id: 'hp_acid',
    name: 'HONEYPOT: ACID BATH',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'HONEYPOT goo puddles burn enemies for 10 damage per second.',
    apply: (s) => { addEffect(s, 'honeypot', 'acid'); },
  },
  {
    id: 'hp_overflow',
    name: 'HONEYPOT: OVERFLOW',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'HONEYPOT goo puddles double in radius.',
    apply: (s) => { addEffect(s, 'honeypot', 'overflow'); },
  },
  {
    id: 'hp_detonation',
    name: 'HONEYPOT: GOO DETONATION',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'When an enemy dies inside a HONEYPOT puddle it detonates for 80 AoE damage.',
    apply: (s) => { addEffect(s, 'honeypot', 'detonation'); },
  },
  {
    id: 'hp_coating',
    name: 'HONEYPOT: VIRAL COATING',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'honeypot',
    description: 'Enemies slowed by HONEYPOT spread 50% of the slow effect to adjacent enemies on contact.',
    apply: (s) => { addEffect(s, 'honeypot', 'coating'); },
  },

  // ===== ANTIVIRUS (5 upgrades) =====
  {
    id: 'av_quarantine',
    name: 'ANTIVIRUS: QUARANTINE',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS hits apply a 30% slow for 1.2s.',
    apply: (s) => { addEffect(s, 'antivirus', 'quarantine'); },
  },
  {
    id: 'av_triple',
    name: 'ANTIVIRUS: TRIPLE SCAN',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS fires 3 projectiles per shot instead of 2.',
    apply: (s) => { addEffect(s, 'antivirus', 'triple'); },
  },
  {
    id: 'av_precision',
    name: 'ANTIVIRUS: PRECISION TARGETING',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS secondary (and tertiary) shots always critically strike.',
    apply: (s) => { addEffect(s, 'antivirus', 'precision'); },
  },
  {
    id: 'av_lockdown',
    name: 'ANTIVIRUS: LOCKDOWN',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'ANTIVIRUS marks targets on hit — marked enemies take +30% from all sources for 2s.',
    apply: (s) => { addEffect(s, 'antivirus', 'lockdown'); },
  },
  {
    id: 'av_overdrive',
    name: 'ANTIVIRUS: OVERDRIVE SCAN',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'antivirus',
    description: 'Every 3rd ANTIVIRUS kill without missing triggers a free instant-crit shot at nearest enemy.',
    apply: (s) => { addEffect(s, 'antivirus', 'overdrive'); },
  },

  // ===== CHAIN LIGHTNING (5 upgrades) =====
  {
    id: 'ch_storm',
    name: 'CHAIN: STORM SURGE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING arcs to 2 additional targets.',
    apply: (s) => { addEffect(s, 'chain', 'storm'); },
  },
  {
    id: 'ch_discharge',
    name: 'CHAIN: FULL DISCHARGE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING jumps deal full damage with no falloff.',
    apply: (s) => { addEffect(s, 'chain', 'discharge'); },
  },
  {
    id: 'ch_nova',
    name: 'CHAIN: ARC NOVA',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING arc reach doubles.',
    apply: (s) => { addEffect(s, 'chain', 'nova'); },
  },
  {
    id: 'ch_ground',
    name: 'CHAIN: GROUND FAULT',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'CHAIN LIGHTNING stuns each hit enemy for 0.35s (no movement, no act).',
    apply: (s) => { addEffect(s, 'chain', 'ground'); },
  },
  {
    id: 'ch_megavolt',
    name: 'CHAIN: MEGAVOLT',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'chain',
    description: 'Every 6th CHAIN shot fires a megavolt — no arc limit, no falloff, no range cap.',
    apply: (s) => { addEffect(s, 'chain', 'megavolt'); },
  },

  // ===== ICE-BREAKER (5 upgrades) =====
  {
    id: 'ic_wide',
    name: 'ICE: BLIZZARD FIELD',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER explosion radius is 70% wider.',
    apply: (s) => { addEffect(s, 'ice', 'wide'); },
  },
  {
    id: 'ic_freeze',
    name: 'ICE: ABSOLUTE ZERO',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER stops enemies completely for 0.6s instead of slowing.',
    apply: (s) => { addEffect(s, 'ice', 'freeze'); },
  },
  {
    id: 'ic_shards',
    name: 'ICE: SHARD STORM',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER blasts spawn 6 slow fields in a ring.',
    apply: (s) => { addEffect(s, 'ice', 'shards'); },
  },
  {
    id: 'ic_permafrost',
    name: 'ICE: PERMAFROST',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'Enemies hit by ICE-BREAKER leave a cryo field for 3s that slows nearby enemies 20%.',
    apply: (s) => { addEffect(s, 'ice', 'permafrost'); },
  },
  {
    id: 'ic_avalanche',
    name: 'ICE: AVALANCHE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'ice',
    description: 'ICE-BREAKER hitting a fully-stopped enemy explodes for 2× damage in a 40% wider radius.',
    apply: (s) => { addEffect(s, 'ice', 'avalanche'); },
  },

  // ===== QUANTUM (5 upgrades) =====
  {
    id: 'qm_double',
    name: 'QUANTUM: SUPERPOSITION',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM has a 35% chance to fire twice per shot.',
    apply: (s) => { addEffect(s, 'quantum', 'double'); },
  },
  {
    id: 'qm_entangle',
    name: 'QUANTUM: ENTANGLEMENT',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM critical hits arc to the nearest enemy for 60% damage.',
    apply: (s) => { addEffect(s, 'quantum', 'entangle'); },
  },
  {
    id: 'qm_phase',
    name: 'QUANTUM: PHASE SHIFT',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM shots ignore all enemy armor.',
    apply: (s) => { addEffect(s, 'quantum', 'phase'); },
  },
  {
    id: 'qm_collapse',
    name: 'QUANTUM: WAVE COLLAPSE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM hits reduce the target\'s armor by 50% for 1.5s (quantum decoherence).',
    apply: (s) => { addEffect(s, 'quantum', 'collapse'); },
  },
  {
    id: 'qm_observer',
    name: 'QUANTUM: OBSERVER EFFECT',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'quantum',
    description: 'QUANTUM charges while idle — each 0.5s of inactivity adds +0.5 to next crit mult (max +3.0).',
    apply: (s) => { addEffect(s, 'quantum', 'observer'); },
  },

  // ===== RAILGUN (5 upgrades) =====
  {
    id: 'rl_sabot',
    name: 'RAILGUN: SABOT ROUND',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN shots cause a small explosion at each enemy pierced.',
    apply: (s) => { addEffect(s, 'railgun', 'sabot'); },
  },
  {
    id: 'rl_shockwave',
    name: 'RAILGUN: SHOCKWAVE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN pierced enemies are slowed 70% for 1.5s.',
    apply: (s) => { addEffect(s, 'railgun', 'shockwave'); },
  },
  {
    id: 'rl_capacitor',
    name: 'RAILGUN: CAPACITOR',
    rarity: 'legendary',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN charges for 8s then auto-fires a 5× damage mega shot.',
    apply: (s) => { addEffect(s, 'railgun', 'capacitor'); },
  },
  {
    id: 'rl_feedback',
    name: 'RAILGUN: KILL FEEDBACK',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'Each enemy killed by RAILGUN reduces its next shot cooldown by 0.6s.',
    apply: (s) => { addEffect(s, 'railgun', 'feedback'); },
  },
  {
    id: 'rl_penetrator',
    name: 'RAILGUN: PENETRATOR',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'railgun',
    description: 'RAILGUN pierce angle threshold widens — it finds more targets in its path.',
    apply: (s) => { addEffect(s, 'railgun', 'penetrator'); },
  },

  // ===== ARTILLERY (5 upgrades) =====
  {
    id: 'mn_wide',
    name: 'ARTILLERY: HEAVY SHELLS',
    rarity: 'common',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'ARTILLERY explosion radius doubles.',
    apply: (s) => { addEffect(s, 'mine', 'wide'); },
  },
  {
    id: 'mn_cluster',
    name: 'ARTILLERY: CLUSTER MUNITIONS',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'Each ARTILLERY shot triggers 2 additional shells nearby.',
    apply: (s) => { addEffect(s, 'mine', 'cluster'); },
  },
  {
    id: 'mn_resupply',
    name: 'ARTILLERY: AUTO-LOADER',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'ARTILLERY fires 25% faster.',
    apply: (s) => { addEffect(s, 'mine', 'resupply'); },
  },
  {
    id: 'mn_stun',
    name: 'ARTILLERY: SHOCKWAVE SHELLS',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'ARTILLERY explosions stun all enemies in blast for 1.2s.',
    apply: (s) => { addEffect(s, 'mine', 'stun'); },
  },
  {
    id: 'mn_armor_strip',
    name: 'ARTILLERY: PENETRATOR SHELLS',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'mine',
    description: 'ARTILLERY explosions strip 10 armor from all enemies in blast for 4s.',
    apply: (s) => { addEffect(s, 'mine', 'armor_strip'); },
  },

  // ===== EMP ARRAY / PULSE (5 upgrades) =====
  {
    id: 'ps_overload',
    name: 'EMP: OVERLOAD PULSE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'pulse',
    description: 'Every 4th EMP ARRAY burst is an overload dealing 3× damage.',
    apply: (s) => { addEffect(s, 'pulse', 'overload'); },
  },
  {
    id: 'ps_frequency',
    name: 'EMP: HIGH FREQUENCY',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'pulse',
    description: 'EMP ARRAY burst recharge reduced by 0.7s.',
    apply: (s) => { addEffect(s, 'pulse', 'frequency'); },
  },
  {
    id: 'ps_cascade',
    name: 'EMP: CASCADE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'pulse',
    description: 'EMP ARRAY bursts push enemies 0.15 cells back toward the path entrance.',
    apply: (s) => { addEffect(s, 'pulse', 'cascade'); },
  },
  {
    id: 'ps_amplify',
    name: 'EMP: AMPLIFIER',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'pulse',
    description: 'EMP ARRAY range increases by 0.6 cells.',
    apply: (s) => { addEffect(s, 'pulse', 'amplify'); },
  },
  {
    id: 'ps_stun',
    name: 'EMP: STUN BURST',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'pulse',
    description: 'EMP ARRAY bursts stun every enemy hit for 0.5s.',
    apply: (s) => { addEffect(s, 'pulse', 'stun'); },
  },

  // ===== OVERWATCH / SNIPER (5 upgrades) =====
  {
    id: 'sn_callout',
    name: 'OVERWATCH: CALLOUT',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'sniper',
    description: 'OVERWATCH marks targets on hit — marked enemies take +30% from all sources for 3s.',
    apply: (s) => { addEffect(s, 'sniper', 'callout'); },
  },
  {
    id: 'sn_execute',
    name: 'OVERWATCH: EXECUTE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'sniper',
    description: 'OVERWATCH deals triple damage to enemies below 25% HP.',
    apply: (s) => { addEffect(s, 'sniper', 'execute'); },
  },
  {
    id: 'sn_rapidfire',
    name: 'OVERWATCH: RAPID SCAN',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'sniper',
    description: 'Each OVERWATCH kill reduces next shot cooldown by 0.8s.',
    apply: (s) => { addEffect(s, 'sniper', 'rapidfire'); },
  },
  {
    id: 'sn_reveal',
    name: 'OVERWATCH: THERMAL SCOPE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'sniper',
    description: 'OVERWATCH reveals stealth enemies in its full range — they become permanently visible.',
    apply: (s) => { addEffect(s, 'sniper', 'reveal'); },
  },
  {
    id: 'sn_oneshot',
    name: 'OVERWATCH: ONE SHOT',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'sniper',
    description: 'OVERWATCH crits against marked enemies instantly kill non-boss targets below 40% HP.',
    apply: (s) => { addEffect(s, 'sniper', 'oneshot'); },
  },

  // ===== DISRUPTOR / SCRAMBLER (5 upgrades) =====
  {
    id: 'sc_deep_scan',
    name: 'DISRUPTOR: DEEP SCAN',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'scrambler',
    description: 'DISRUPTOR strips 6 armor per hit instead of 3.',
    apply: (s) => { addEffect(s, 'scrambler', 'deep_scan'); },
  },
  {
    id: 'sc_broadcast',
    name: 'DISRUPTOR: BROADCAST',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'scrambler',
    description: 'DISRUPTOR pulses apply armor-strip to ALL enemies in range, not just the target.',
    apply: (s) => { addEffect(s, 'scrambler', 'broadcast'); },
  },
  {
    id: 'sc_cripple',
    name: 'DISRUPTOR: CRIPPLE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'scrambler',
    description: 'DISRUPTOR-debuffed enemies also move 30% slower for the debuff duration.',
    apply: (s) => { addEffect(s, 'scrambler', 'cripple'); },
  },
  {
    id: 'sc_feedback',
    name: 'DISRUPTOR: SIGNAL FEEDBACK',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'scrambler',
    description: 'DISRUPTOR gets +0.5 fire rate for each debuffed enemy currently in range.',
    apply: (s) => { addEffect(s, 'scrambler', 'feedback'); },
  },
  {
    id: 'sc_overwrite',
    name: 'DISRUPTOR: OVERWRITE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'scrambler',
    description: '20% chance each DISRUPTOR hit completely nullifies target armor for 2.5s.',
    apply: (s) => { addEffect(s, 'scrambler', 'overwrite'); },
  },

  // ===== SENTINEL NODE (5 upgrades) =====
  {
    id: 'se_reinforced',
    name: 'SENTINEL: REINFORCED FIELD',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'sentinel',
    description: 'SENTINEL NODE field damage increases to 20 per second.',
    apply: (s) => { addEffect(s, 'sentinel', 'reinforced'); },
  },
  {
    id: 'se_expanded',
    name: 'SENTINEL: EXPANDED GRID',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'sentinel',
    description: 'SENTINEL NODE range increases by 0.8 cells.',
    apply: (s) => { addEffect(s, 'sentinel', 'expanded'); },
  },
  {
    id: 'se_thorns',
    name: 'SENTINEL: THORN PROTOCOL',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'sentinel',
    description: 'Enemies in SENTINEL field that attack towers receive 2× damage as retaliation.',
    apply: (s) => { addEffect(s, 'sentinel', 'thorns'); },
  },
  {
    id: 'se_anchor',
    name: 'SENTINEL: ANCHOR FIELD',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'sentinel',
    description: 'SENTINEL NODE slow increases to 45% and affects slow-immune enemies at 20%.',
    apply: (s) => { addEffect(s, 'sentinel', 'anchor'); },
  },
  {
    id: 'se_pulse_link',
    name: 'SENTINEL: PULSE LINK',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'sentinel',
    description: 'Every 5s SENTINEL NODE emits a pulse marking all enemies in range for 2s.',
    apply: (s) => { addEffect(s, 'sentinel', 'pulse_link'); },
  },

  // ===== NEW FIREWALL CARDS =====
  {
    id: 'fw_suppressor', name: 'FIREWALL: SUPPRESSOR ROUNDS', rarity: 'common', category: 'upgrade', towerHint: 'firewall',
    description: 'FIREWALL shots slow enemies 15% for 1.2s.',
    apply: (s) => { addEffect(s, 'firewall', 'suppressor'); },
  },
  {
    id: 'fw_hollow_point', name: 'FIREWALL: HOLLOW POINT', rarity: 'rare', category: 'upgrade', towerHint: 'firewall',
    description: 'FIREWALL shots ignore 5 armor on each hit.',
    apply: (s) => { addEffect(s, 'firewall', 'hollow_point'); },
  },
  {
    id: 'fw_blazing', name: 'FIREWALL: BLAZE PROTOCOL', rarity: 'rare', category: 'upgrade', towerHint: 'firewall',
    description: 'Every 3 FIREWALL kills within 5s triggers 2s of +25% fire rate.',
    apply: (s) => { addEffect(s, 'firewall', 'blazing'); },
  },
  {
    id: 'fw_fragmentation', name: 'FIREWALL: FRAG ROUNDS', rarity: 'epic', category: 'upgrade', towerHint: 'firewall',
    requires: ['fw_burst'],
    description: '[Requires BURST PROTOCOL] FIREWALL burst spread shots detonate on impact (0.5-cell AoE, 40% damage).',
    apply: (s) => { addEffect(s, 'firewall', 'fragmentation'); },
  },
  {
    id: 'fw_hunter_instinct', name: 'FIREWALL: HUNTER INSTINCT', rarity: 'epic', category: 'upgrade', towerHint: 'firewall',
    requires: ['fw_tracer'],
    description: '[Requires TRACER ROUNDS] Tracer marks last 4s (was 2s) and grant +45% damage (was +30%).',
    apply: (s) => { addEffect(s, 'firewall', 'hunter_instinct'); },
  },

  // ===== NEW HONEYPOT CARDS =====
  {
    id: 'hp_viscous', name: 'HONEYPOT: VISCOUS PAYLOAD', rarity: 'common', category: 'upgrade', towerHint: 'honeypot',
    description: 'HONEYPOT puddles slow enemies 55% (was 40%).',
    apply: (s) => { addEffect(s, 'honeypot', 'viscous'); },
  },
  {
    id: 'hp_volatile', name: 'HONEYPOT: VOLATILE MIXTURE', rarity: 'rare', category: 'upgrade', towerHint: 'honeypot',
    description: 'HONEYPOT puddles explode when they expire — 30 AoE damage in puddle radius.',
    apply: (s) => { addEffect(s, 'honeypot', 'volatile'); },
  },
  {
    id: 'hp_linger', name: 'HONEYPOT: SLOW DRAIN', rarity: 'rare', category: 'upgrade', towerHint: 'honeypot',
    description: 'HONEYPOT puddles last 50% longer (stacks with Persistent Payload for 3× total).',
    apply: (s) => { addEffect(s, 'honeypot', 'linger'); },
  },
  {
    id: 'hp_chain_goo', name: 'HONEYPOT: CHAIN GOO', rarity: 'rare', category: 'upgrade', towerHint: 'honeypot',
    requires: ['hp_detonation'],
    description: '[Requires GOO DETONATION] Detonations leave a 1.5s goo puddle at the explosion point.',
    apply: (s) => { addEffect(s, 'honeypot', 'chain_goo'); },
  },
  {
    id: 'hp_toxic_bloom', name: 'HONEYPOT: TOXIC BLOOM', rarity: 'epic', category: 'upgrade', towerHint: 'honeypot',
    requires: ['hp_acid'],
    description: '[Requires ACID BATH] Enemies killed by acid damage burst into 3s micro-puddles (0.5-cell radius, 8 dps).',
    apply: (s) => { addEffect(s, 'honeypot', 'toxic_bloom'); },
  },

  // ===== NEW ANTIVIRUS CARDS =====
  {
    id: 'av_focus_fire', name: 'ANTIVIRUS: FOCUS FIRE', rarity: 'common', category: 'upgrade', towerHint: 'antivirus',
    description: 'Each consecutive ANTIVIRUS hit on the same enemy adds +10% damage (max +30%, resets on target change).',
    apply: (s) => { addEffect(s, 'antivirus', 'focus_fire'); },
  },
  {
    id: 'av_burst_mode', name: 'ANTIVIRUS: BURST MODE', rarity: 'rare', category: 'upgrade', towerHint: 'antivirus',
    requires: ['av_triple'],
    description: '[Requires TRIPLE SCAN] ANTIVIRUS fires a 4th shot instantly after the burst.',
    apply: (s) => { addEffect(s, 'antivirus', 'burst_mode'); },
  },
  {
    id: 'av_viral_mark', name: 'ANTIVIRUS: VIRAL MARK', rarity: 'epic', category: 'upgrade', towerHint: 'antivirus',
    requires: ['av_lockdown'],
    description: '[Requires LOCKDOWN] When a marked enemy dies, the mark spreads to 2 nearby enemies for 2s.',
    apply: (s) => { addEffect(s, 'antivirus', 'viral_mark'); },
  },
  {
    id: 'av_adaptive', name: 'ANTIVIRUS: ADAPTIVE TARGETING', rarity: 'rare', category: 'upgrade', towerHint: 'antivirus',
    description: 'ANTIVIRUS deals +15% bonus damage to enemies that have had armor stripped.',
    apply: (s) => { addEffect(s, 'antivirus', 'adaptive'); },
  },
  {
    id: 'av_precision_burst', name: 'ANTIVIRUS: PRECISION BURST', rarity: 'epic', category: 'upgrade', towerHint: 'antivirus',
    requires: ['av_precision'],
    description: '[Requires PRECISION TARGETING] Precision crits deal +50% bonus damage.',
    apply: (s) => { addEffect(s, 'antivirus', 'precision_burst'); },
  },

  // ===== NEW CHAIN LIGHTNING CARDS =====
  {
    id: 'ch_overcharge', name: 'CHAIN: OVERCHARGE', rarity: 'common', category: 'upgrade', towerHint: 'chain',
    description: 'CHAIN LIGHTNING arcs deal +20% damage per jump.',
    apply: (s) => { addEffect(s, 'chain', 'overcharge'); },
  },
  {
    id: 'ch_persistence', name: 'CHAIN: PERSISTENT ARC', rarity: 'rare', category: 'upgrade', towerHint: 'chain',
    description: 'CHAIN LIGHTNING arcs leave a 0.6s electric burn (10 dps) at each hit point.',
    apply: (s) => { addEffect(s, 'chain', 'persistence'); },
  },
  {
    id: 'ch_conductor', name: 'CHAIN: CONDUCTOR', rarity: 'rare', category: 'upgrade', towerHint: 'chain',
    description: 'CHAIN LIGHTNING deals +35% damage to slowed enemies.',
    apply: (s) => { addEffect(s, 'chain', 'conductor'); },
  },
  {
    id: 'ch_feedback_loop', name: 'CHAIN: FEEDBACK LOOP', rarity: 'epic', category: 'upgrade', towerHint: 'chain',
    requires: ['ch_ground'],
    description: '[Requires GROUND FAULT] Stunned enemies become marked for +30% damage from all sources.',
    apply: (s) => { addEffect(s, 'chain', 'feedback_loop'); },
  },
  {
    id: 'ch_tesla_coil', name: 'CHAIN: TESLA COIL', rarity: 'epic', category: 'upgrade', towerHint: 'chain',
    requires: ['ch_megavolt'],
    description: '[Requires MEGAVOLT] MEGAVOLT shots leave electric puddles (0.6s, 15 dps) at each hit.',
    apply: (s) => { addEffect(s, 'chain', 'tesla_coil'); },
  },

  // ===== NEW ICE-BREAKER CARDS =====
  {
    id: 'ic_brittle', name: 'ICE: BRITTLE COATING', rarity: 'common', category: 'upgrade', towerHint: 'ice',
    description: 'Slowed or frozen enemies take +15% damage from ALL tower sources.',
    apply: (s) => { addEffect(s, 'ice', 'brittle'); },
  },
  {
    id: 'ic_glacial', name: 'ICE: GLACIAL FIELD', rarity: 'rare', category: 'upgrade', towerHint: 'ice',
    description: 'ICE-BREAKER explosions leave a 3s slow field (25%) in addition to other effects.',
    apply: (s) => { addEffect(s, 'ice', 'glacial'); },
  },
  {
    id: 'ic_absolute_zero_plus', name: 'ICE: DEEP FREEZE', rarity: 'epic', category: 'upgrade', towerHint: 'ice',
    requires: ['ic_freeze'],
    description: '[Requires ABSOLUTE ZERO] Freeze duration increases to 1.0s (was 0.6s).',
    apply: (s) => { addEffect(s, 'ice', 'absolute_zero_plus'); },
  },
  {
    id: 'ic_ice_lance', name: 'ICE: ICE LANCE', rarity: 'rare', category: 'upgrade', towerHint: 'ice',
    description: 'ICE-BREAKER explosion radius +20% (stacks with BLIZZARD FIELD).',
    apply: (s) => { addEffect(s, 'ice', 'ice_lance'); },
  },
  {
    id: 'ic_cryo_nova', name: 'ICE: CRYO NOVA', rarity: 'epic', category: 'upgrade', towerHint: 'ice',
    requires: ['ic_shards'],
    description: '[Requires SHARD STORM] Shard fields deal 8 dps instead of just slowing.',
    apply: (s) => { addEffect(s, 'ice', 'cryo_nova'); },
  },

  // ===== NEW QUANTUM CARDS =====
  {
    id: 'qm_unstable', name: 'QUANTUM: UNSTABLE CORE', rarity: 'common', category: 'upgrade', towerHint: 'quantum',
    description: 'QUANTUM crit chance +8%.',
    apply: (s) => { addEffect(s, 'quantum', 'unstable'); },
  },
  {
    id: 'qm_resonance', name: 'QUANTUM: RESONANCE', rarity: 'rare', category: 'upgrade', towerHint: 'quantum',
    requires: ['qm_double'],
    description: '[Requires SUPERPOSITION] When first QUANTUM shot crits, double-shot also crits.',
    apply: (s) => { addEffect(s, 'quantum', 'resonance'); },
  },
  {
    id: 'qm_antimatter', name: 'QUANTUM: ANTIMATTER', rarity: 'epic', category: 'upgrade', towerHint: 'quantum',
    requires: ['qm_collapse'],
    description: '[Requires WAVE COLLAPSE] Each crit permanently increases QUANTUM damage by 2% (max +30%).',
    apply: (s) => { addEffect(s, 'quantum', 'antimatter'); },
  },
  {
    id: 'qm_uncertainty', name: 'QUANTUM: UNCERTAINTY PRINCIPLE', rarity: 'epic', category: 'upgrade', towerHint: 'quantum',
    requires: ['qm_entangle'],
    description: '[Requires ENTANGLEMENT] Entanglement arcs also reduce target armor 25% for 2s.',
    apply: (s) => { addEffect(s, 'quantum', 'uncertainty'); },
  },
  {
    id: 'qm_supercharge', name: 'QUANTUM: SUPERCHARGE', rarity: 'rare', category: 'upgrade', towerHint: 'quantum',
    description: 'After a QUANTUM crit, next shot is guaranteed to crit.',
    apply: (s) => { addEffect(s, 'quantum', 'supercharge'); },
  },

  // ===== NEW RAILGUN CARDS =====
  {
    id: 'rl_armor_pierce', name: 'RAILGUN: ARMOR PIERCER', rarity: 'common', category: 'upgrade', towerHint: 'railgun',
    description: 'RAILGUN shots ignore 6 armor.',
    apply: (s) => { addEffect(s, 'railgun', 'armor_pierce'); },
  },
  {
    id: 'rl_kill_chain', name: 'RAILGUN: KILL CHAIN', rarity: 'common', category: 'upgrade', towerHint: 'railgun',
    description: 'RAILGUN kills reduce cooldown by 0.3s (stacks with KILL FEEDBACK).',
    apply: (s) => { addEffect(s, 'railgun', 'kill_chain'); },
  },
  {
    id: 'rl_hypersonic', name: 'RAILGUN: HYPERSONIC', rarity: 'rare', category: 'upgrade', towerHint: 'railgun',
    description: 'RAILGUN projectile speed doubled.',
    apply: (s) => { addEffect(s, 'railgun', 'hypersonic'); },
  },
  {
    id: 'rl_splinter', name: 'RAILGUN: SPLINTER ROUND', rarity: 'rare', category: 'upgrade', towerHint: 'railgun',
    requires: ['rl_sabot'],
    description: '[Requires SABOT ROUND] Sabot explosions deal +50% damage.',
    apply: (s) => { addEffect(s, 'railgun', 'splinter'); },
  },
  {
    id: 'rl_charged_mega', name: 'RAILGUN: CHARGED BURST', rarity: 'epic', category: 'upgrade', towerHint: 'railgun',
    requires: ['rl_capacitor'],
    description: '[Requires CAPACITOR] Capacitor mega shot stuns all pierced targets for 1s.',
    apply: (s) => { addEffect(s, 'railgun', 'charged_mega'); },
  },

  // ===== NEW ARTILLERY CARDS =====
  {
    id: 'mn_pressure_fuse', name: 'ARTILLERY: ADVANCED TARGETING', rarity: 'common', category: 'upgrade', towerHint: 'mine',
    description: 'ARTILLERY range +0.4 cells.',
    apply: (s) => { addEffect(s, 'mine', 'pressure_fuse'); },
  },
  {
    id: 'mn_frag_kit', name: 'ARTILLERY: FRAGMENTATION ROUNDS', rarity: 'rare', category: 'upgrade', towerHint: 'mine',
    description: 'Each ARTILLERY shell scatters 3 mini-blasts (40% damage each).',
    apply: (s) => { addEffect(s, 'mine', 'frag_kit'); },
  },
  {
    id: 'mn_nanobots', name: 'ARTILLERY: NANOBOT PAYLOAD', rarity: 'rare', category: 'upgrade', towerHint: 'mine',
    description: '35% chance ARTILLERY impact leaves an acid puddle (3s, 12 dps).',
    apply: (s) => { addEffect(s, 'mine', 'nanobots'); },
  },
  {
    id: 'mn_demolition', name: 'ARTILLERY: DEMOLITION WARHEAD', rarity: 'epic', category: 'upgrade', towerHint: 'mine',
    requires: ['mn_wide'],
    description: '[Requires HEAVY SHELLS] Wide-radius shells deal +35% damage.',
    apply: (s) => { addEffect(s, 'mine', 'demolition'); },
  },
  {
    id: 'mn_chain_reaction', name: 'ARTILLERY: CHAIN DETONATION', rarity: 'epic', category: 'upgrade', towerHint: 'mine',
    requires: ['mn_cluster'],
    description: '[Requires CLUSTER MUNITIONS] Cluster shells deal full damage (was 70%).',
    apply: (s) => { addEffect(s, 'mine', 'chain_reaction'); },
  },

  // ===== NEW EMP ARRAY (PULSE) CARDS =====
  {
    id: 'ps_capacitor_boost', name: 'EMP: POWER CAPACITOR', rarity: 'common', category: 'upgrade', towerHint: 'pulse',
    description: 'EMP ARRAY burst damage +15%.',
    apply: (s) => { addEffect(s, 'pulse', 'capacitor_boost'); },
  },
  {
    id: 'ps_concussive', name: 'EMP: CONCUSSIVE PULSE', rarity: 'common', category: 'upgrade', towerHint: 'pulse',
    description: 'EMP ARRAY bursts push enemies 0.12 cells back toward the start.',
    apply: (s) => { addEffect(s, 'pulse', 'concussive'); },
  },
  {
    id: 'ps_ionic', name: 'EMP: IONIC CHARGE', rarity: 'epic', category: 'upgrade', towerHint: 'pulse',
    description: 'EMP ARRAY burst damage ignores all enemy armor.',
    apply: (s) => { addEffect(s, 'pulse', 'ionic'); },
  },
  {
    id: 'ps_overload_shock', name: 'EMP: OVERLOAD SHOCK', rarity: 'rare', category: 'upgrade', towerHint: 'pulse',
    requires: ['ps_overload'],
    description: '[Requires OVERLOAD PULSE] Overload bursts also slow all hit enemies 40% for 1.5s.',
    apply: (s) => { addEffect(s, 'pulse', 'overload_shock'); },
  },
  {
    id: 'ps_rapid_resonance', name: 'EMP: RAPID RESONANCE', rarity: 'rare', category: 'upgrade', towerHint: 'pulse',
    requires: ['ps_frequency'],
    description: '[Requires HIGH FREQUENCY] Recharge reduced by additional 0.4s (total 1.1s reduction).',
    apply: (s) => { addEffect(s, 'pulse', 'rapid_resonance'); },
  },

  // ===== NEW OVERWATCH (SNIPER) CARDS =====
  {
    id: 'sn_ghost_round', name: 'OVERWATCH: GHOST ROUND', rarity: 'common', category: 'upgrade', towerHint: 'sniper',
    description: 'OVERWATCH shots ignore 5 armor.',
    apply: (s) => { addEffect(s, 'sniper', 'ghost_round'); },
  },
  {
    id: 'sn_deadeye', name: 'OVERWATCH: DEADEYE', rarity: 'rare', category: 'upgrade', towerHint: 'sniper',
    requires: ['sn_execute'],
    description: '[Requires EXECUTE] Execute threshold raises to 35% HP (was 25%).',
    apply: (s) => { addEffect(s, 'sniper', 'deadeye'); },
  },
  {
    id: 'sn_spotter_mark', name: 'OVERWATCH: SPOTTER PROTOCOL', rarity: 'rare', category: 'upgrade', towerHint: 'sniper',
    description: 'OVERWATCH reveals stealth enemies and marks them for 1.5s on reveal.',
    apply: (s) => { addEffect(s, 'sniper', 'spotter_mark'); },
  },
  {
    id: 'sn_incendiary_round', name: 'OVERWATCH: INCENDIARY ROUND', rarity: 'epic', category: 'upgrade', towerHint: 'sniper',
    requires: ['sn_callout'],
    description: '[Requires CALLOUT] OVERWATCH shots burn marked targets — 12 dps for 2s.',
    apply: (s) => { addEffect(s, 'sniper', 'incendiary_round'); },
  },
  {
    id: 'sn_apex_predator', name: 'OVERWATCH: APEX PREDATOR', rarity: 'legendary', category: 'upgrade', towerHint: 'sniper',
    requires: ['sn_oneshot'],
    description: '[Requires ONE SHOT] ONE SHOT threshold raises to 50% HP.',
    apply: (s) => { addEffect(s, 'sniper', 'apex_predator'); },
  },

  // ===== NEW DISRUPTOR (SCRAMBLER) CARDS =====
  {
    id: 'sc_deep_hack', name: 'DISRUPTOR: DEEP HACK', rarity: 'common', category: 'upgrade', towerHint: 'scrambler',
    description: 'DISRUPTOR strips +2 additional armor per hit (stacks with DEEP SCAN for +8 total).',
    apply: (s) => { addEffect(s, 'scrambler', 'deep_hack'); },
  },
  {
    id: 'sc_signal_break', name: 'DISRUPTOR: SIGNAL BREAK', rarity: 'rare', category: 'upgrade', towerHint: 'scrambler',
    description: 'DISRUPTOR hits slow armor-stripped enemies 20% for 1.5s.',
    apply: (s) => { addEffect(s, 'scrambler', 'signal_break'); },
  },
  {
    id: 'sc_null_field', name: 'DISRUPTOR: NULL FIELD', rarity: 'epic', category: 'upgrade', towerHint: 'scrambler',
    requires: ['sc_broadcast'],
    description: '[Requires BROADCAST] BROADCAST pulse also slows all hit enemies 20% for 1.5s.',
    apply: (s) => { addEffect(s, 'scrambler', 'null_field'); },
  },
  {
    id: 'sc_system_crash', name: 'DISRUPTOR: SYSTEM CRASH', rarity: 'epic', category: 'upgrade', towerHint: 'scrambler',
    requires: ['sc_overwrite'],
    description: '[Requires OVERWRITE] OVERWRITE-nullified enemies (0 armor) become marked for +40% damage from all sources.',
    apply: (s) => { addEffect(s, 'scrambler', 'system_crash'); },
  },
  {
    id: 'sc_exploit_chain', name: 'DISRUPTOR: EXPLOIT CHAIN', rarity: 'rare', category: 'upgrade', towerHint: 'scrambler',
    description: 'Consecutive DISRUPTOR hits on the same enemy stack +8% damage (max +40%, resets on target change).',
    apply: (s) => { addEffect(s, 'scrambler', 'exploit_chain'); },
  },

  // ===== NEW SENTINEL NODE CARDS =====
  {
    id: 'se_overclocked', name: 'SENTINEL: OVERCLOCKED FIELD', rarity: 'common', category: 'upgrade', towerHint: 'sentinel',
    description: 'SENTINEL NODE field damage +8 dps (stacks with REINFORCED FIELD).',
    apply: (s) => { addEffect(s, 'sentinel', 'overclocked'); },
  },
  {
    id: 'se_trauma_protocol', name: 'SENTINEL: TRAUMA PROTOCOL', rarity: 'rare', category: 'upgrade', towerHint: 'sentinel',
    description: 'Enemies inside SENTINEL field are marked — they take +20% from all sources.',
    apply: (s) => { addEffect(s, 'sentinel', 'trauma_protocol'); },
  },
  {
    id: 'se_node_broadcast', name: 'SENTINEL: NODE BROADCAST', rarity: 'rare', category: 'upgrade', towerHint: 'sentinel',
    requires: ['se_expanded'],
    description: '[Requires EXPANDED GRID] SENTINEL range +0.5 more cells.',
    apply: (s) => { addEffect(s, 'sentinel', 'node_broadcast'); },
  },
  {
    id: 'se_surge_event', name: 'SENTINEL: SURGE EVENT', rarity: 'epic', category: 'upgrade', towerHint: 'sentinel',
    requires: ['se_reinforced'],
    description: '[Requires REINFORCED FIELD] Every 5s, SENTINEL field surges to 5× damage for 0.5s.',
    apply: (s) => { addEffect(s, 'sentinel', 'surge_event'); },
  },
  {
    id: 'se_total_suppression', name: 'SENTINEL: TOTAL SUPPRESSION', rarity: 'epic', category: 'upgrade', towerHint: 'sentinel',
    requires: ['se_anchor'],
    description: '[Requires ANCHOR FIELD] Slow-immune enemies are now affected at 35% (was 20%).',
    apply: (s) => { addEffect(s, 'sentinel', 'total_suppression'); },
  },

  // ===== BOOSTER NODE (5 upgrades) =====
  {
    id: 'bn_amplify', name: 'BOOSTER: AMPLIFIER', rarity: 'common', category: 'upgrade', towerHint: 'booster_node',
    description: 'BOOSTER NODE aura range +0.5 cells.',
    apply: (s) => { addEffect(s, 'booster_node', 'amplify'); },
  },
  {
    id: 'bn_overcharge', name: 'BOOSTER: OVERCHARGE', rarity: 'common', category: 'upgrade', towerHint: 'booster_node',
    description: 'BOOSTER NODE aura is stronger: +35% damage / +25% fire rate.',
    apply: (s) => { addEffect(s, 'booster_node', 'overcharge'); },
  },
  {
    id: 'bn_dual_wave', name: 'BOOSTER: DUAL WAVE', rarity: 'rare', category: 'upgrade', towerHint: 'booster_node',
    description: 'Buffed turrets also gain +10% crit chance from the BOOSTER NODE aura.',
    apply: (s) => { addEffect(s, 'booster_node', 'dual_wave'); s.mods.globalCritChance += 0.10; },
  },
  {
    id: 'bn_focus_beam', name: 'BOOSTER: FOCUS BEAM', rarity: 'epic', category: 'upgrade', towerHint: 'booster_node',
    requires: ['bn_amplify'],
    description: '[Requires AMPLIFIER] BOOSTER NODE aura targets ALL turrets regardless of distance.',
    apply: (s) => { addEffect(s, 'booster_node', 'focus_beam'); },
  },
  {
    id: 'bn_resonance', name: 'BOOSTER: RESONANCE', rarity: 'rare', category: 'upgrade', towerHint: 'booster_node',
    description: 'BOOSTER NODE counts as 2 unique types in subnet diversity calculations.',
    apply: (s) => { addEffect(s, 'booster_node', 'resonance'); },
  },

  // ===== DATA MINER (5 upgrades) =====
  {
    id: 'dm_throughput', name: 'DATA MINER: HIGH THROUGHPUT', rarity: 'common', category: 'upgrade', towerHint: 'data_miner',
    description: 'DATA MINER XP generation increased from 3/s to 8/s.',
    apply: (s) => { addEffect(s, 'data_miner', 'throughput'); },
  },
  {
    id: 'dm_compress', name: 'DATA MINER: COMPRESSION', rarity: 'common', category: 'upgrade', towerHint: 'data_miner',
    description: 'All enemy kills grant +20% bonus XP.',
    apply: (s) => { addEffect(s, 'data_miner', 'compress'); s.mods.xpMult *= 1.2; },
  },
  {
    id: 'dm_uplink', name: 'DATA MINER: UPLINK', rarity: 'rare', category: 'upgrade', towerHint: 'data_miner',
    description: 'DATA MINER XP generation doubles during waves.',
    apply: (s) => { addEffect(s, 'data_miner', 'uplink'); },
  },
  {
    id: 'dm_protocol_mine', name: 'DATA MINER: PROTOCOL EXTRACTOR', rarity: 'rare', category: 'upgrade', towerHint: 'data_miner',
    description: 'DATA MINER also extracts +1 PROTOCOL each wave cleared.',
    apply: (s) => { addEffect(s, 'data_miner', 'protocol_mine'); },
  },
  {
    id: 'dm_recursive', name: 'DATA MINER: RECURSIVE LEARNING', rarity: 'epic', category: 'upgrade', towerHint: 'data_miner',
    requires: ['dm_throughput'],
    description: '[Requires HIGH THROUGHPUT] DATA MINER XP rate +5/s additional. 13/s total combined.',
    apply: (s) => { addEffect(s, 'data_miner', 'recursive'); },
  },

  // ==================== SYNERGY CARDS (require both towers placed) ====================

  {
    id: 'syn_fw_hp',
    name: 'NAPALM PROTOCOL',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'firewall',
    towerHint2: 'honeypot',
    description: '[FIREWALL + HONEYPOT] Honeypot puddles become napalm — they deal Firewall-scaled fire damage instead of acid.',
    apply: (s) => { addEffect(s, 'honeypot', 'napalm'); addEffect(s, 'firewall', 'napalm_link'); },
  },
  {
    id: 'syn_av_sn',
    name: 'SURGICAL STRIKE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'antivirus',
    towerHint2: 'sniper',
    description: '[ANTIVIRUS + OVERWATCH] Antivirus lockdown marks persist 2× longer; Overwatch deals +60% to marked targets.',
    apply: (s) => { addEffect(s, 'antivirus', 'surgical'); addEffect(s, 'sniper', 'surgical'); },
  },
  {
    id: 'syn_ch_ps',
    name: 'STORM PULSE',
    rarity: 'epic',
    category: 'upgrade',
    towerHint: 'chain',
    towerHint2: 'pulse',
    description: '[CHAIN + EMP ARRAY] EMP burst triggers a chain arc on every enemy it hits.',
    apply: (s) => { addEffect(s, 'pulse', 'storm_pulse'); addEffect(s, 'chain', 'storm_pulse'); },
  },
  {
    id: 'syn_ic_sc',
    name: 'CRYO BREAK',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'ice',
    towerHint2: 'scrambler',
    description: '[ICE-BREAKER + DISRUPTOR] Armor-stripped enemies take 2× damage from ICE-BREAKER explosions.',
    apply: (s) => { addEffect(s, 'ice', 'cryo_break'); addEffect(s, 'scrambler', 'cryo_break'); },
  },
  {
    id: 'syn_rl_sn',
    name: 'OVERWATCH PENETRATOR',
    rarity: 'legendary',
    category: 'upgrade',
    towerHint: 'railgun',
    towerHint2: 'sniper',
    description: '[RAILGUN + OVERWATCH] Overwatch callout marks persist 4s; Railgun deals +100% to marked targets.',
    apply: (s) => { addEffect(s, 'railgun', 'overwatch_pen'); addEffect(s, 'sniper', 'overwatch_pen'); },
  },
  {
    id: 'syn_qm_sc',
    name: 'QUANTUM DECOHERENCE',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'quantum',
    towerHint2: 'scrambler',
    description: '[QUANTUM + DISRUPTOR] Armor-stripped enemies are treated as having 0 armor by QUANTUM shots.',
    apply: (s) => { addEffect(s, 'quantum', 'decoherence'); addEffect(s, 'scrambler', 'decoherence'); },
  },
  {
    id: 'syn_hp_se',
    name: 'CONTAMINATION FIELD',
    rarity: 'rare',
    category: 'upgrade',
    towerHint: 'honeypot',
    towerHint2: 'sentinel',
    description: '[HONEYPOT + SENTINEL NODE] Sentinel field becomes a slow field — enemies inside get an extra 25% slow from Honeypot puddles.',
    apply: (s) => { addEffect(s, 'sentinel', 'contamination'); addEffect(s, 'honeypot', 'contamination'); },
  },

  // ===== NEW SYNERGY CARDS =====
  {
    id: 'syn_fw_av', name: 'POINT GUARD', rarity: 'epic', category: 'upgrade', towerHint: 'firewall', towerHint2: 'antivirus',
    description: '[FIREWALL + ANTIVIRUS] ANTIVIRUS marks cause FIREWALL burst counter to immediately trigger.',
    apply: (s) => { addEffect(s, 'firewall', 'point_guard'); addEffect(s, 'antivirus', 'point_guard'); },
  },
  {
    id: 'syn_hp_ic', name: 'FLASH FREEZE', rarity: 'epic', category: 'upgrade', towerHint: 'honeypot', towerHint2: 'ice',
    description: '[HONEYPOT + ICE-BREAKER] ICE-BREAKER explosions freeze enemies inside HONEYPOT puddles for 0.8s.',
    apply: (s) => { addEffect(s, 'ice', 'flash_freeze'); addEffect(s, 'honeypot', 'flash_freeze'); },
  },
  {
    id: 'syn_hp_mn', name: 'VOLATILE MIXTURE', rarity: 'rare', category: 'upgrade', towerHint: 'honeypot', towerHint2: 'mine',
    description: '[HONEYPOT + ARTILLERY] ARTILLERY shells deal +75% bonus damage to enemies inside HONEYPOT puddles.',
    apply: (s) => { addEffect(s, 'mine', 'volatile_mixture'); addEffect(s, 'honeypot', 'volatile_mixture'); },
  },
  {
    id: 'syn_av_qm', name: 'PRECISION MATRIX', rarity: 'epic', category: 'upgrade', towerHint: 'antivirus', towerHint2: 'quantum',
    description: '[ANTIVIRUS + QUANTUM] ANTIVIRUS marks cause QUANTUM shots to always critically strike.',
    apply: (s) => { addEffect(s, 'quantum', 'precision_matrix'); addEffect(s, 'antivirus', 'precision_matrix'); },
  },
  {
    id: 'syn_ch_se', name: 'SURGE NETWORK', rarity: 'rare', category: 'upgrade', towerHint: 'chain', towerHint2: 'sentinel',
    description: '[CHAIN + SENTINEL] CHAIN LIGHTNING arcs spread SENTINEL slow to each arc target.',
    apply: (s) => { addEffect(s, 'chain', 'surge_network'); addEffect(s, 'sentinel', 'surge_network'); },
  },
  {
    id: 'syn_ic_ps', name: 'CRYOPULSE', rarity: 'epic', category: 'upgrade', towerHint: 'ice', towerHint2: 'pulse',
    description: '[ICE-BREAKER + EMP ARRAY] EMP bursts freeze already-slowed enemies for 0.4s.',
    apply: (s) => { addEffect(s, 'pulse', 'cryopulse'); addEffect(s, 'ice', 'cryopulse'); },
  },
  {
    id: 'syn_rl_mn', name: 'BARRAGE STRIKE', rarity: 'rare', category: 'upgrade', towerHint: 'railgun', towerHint2: 'mine',
    description: '[RAILGUN + ARTILLERY] RAILGUN kills trigger an ARTILLERY shell impact at the death location.',
    apply: (s) => { addEffect(s, 'railgun', 'barrage_strike'); addEffect(s, 'mine', 'barrage_strike'); },
  },
  {
    id: 'syn_fw_se', name: 'BASTION PROTOCOL', rarity: 'epic', category: 'upgrade', towerHint: 'firewall', towerHint2: 'sentinel',
    description: '[FIREWALL + SENTINEL] FIREWALL deals +60% damage to enemies inside SENTINEL field.',
    apply: (s) => { addEffect(s, 'firewall', 'bastion_protocol'); addEffect(s, 'sentinel', 'bastion_protocol'); },
  },
  {
    id: 'syn_sc_ps', name: 'SIGNAL JAM', rarity: 'rare', category: 'upgrade', towerHint: 'scrambler', towerHint2: 'pulse',
    description: '[DISRUPTOR + EMP ARRAY] EMP bursts apply 3 armor strip to every enemy hit.',
    apply: (s) => { addEffect(s, 'scrambler', 'signal_jam'); addEffect(s, 'pulse', 'signal_jam'); },
  },
  {
    id: 'syn_ch_mn', name: 'LIGHTNING ROD', rarity: 'rare', category: 'upgrade', towerHint: 'chain', towerHint2: 'mine',
    description: '[CHAIN + ARTILLERY] ARTILLERY impacts trigger a 3-jump chain arc from the explosion center.',
    apply: (s) => { addEffect(s, 'mine', 'lightning_rod'); addEffect(s, 'chain', 'lightning_rod'); },
  },
  {
    id: 'syn_qm_sn', name: 'QUANTUM SIGHT', rarity: 'epic', category: 'upgrade', towerHint: 'quantum', towerHint2: 'sniper',
    description: '[QUANTUM + OVERWATCH] OVERWATCH marks cause QUANTUM to always fire twice (bypasses 35% check).',
    apply: (s) => { addEffect(s, 'quantum', 'quantum_sight'); addEffect(s, 'sniper', 'quantum_sight'); },
  },
  {
    id: 'syn_fw_ch', name: 'STATIC CHARGE', rarity: 'epic', category: 'upgrade', towerHint: 'firewall', towerHint2: 'chain',
    description: '[FIREWALL + CHAIN] FIREWALL incendiary fire zones emit a 2-jump chain arc every 1.5s.',
    apply: (s) => { addEffect(s, 'firewall', 'static_charge'); addEffect(s, 'chain', 'static_charge'); },
  },
];

// ==================== HEAL CARDS ====================

const HEAL: CardDef[] = [
  {
    id: 'heal_small',
    name: 'INTEGRITY PATCH',
    rarity: 'common',
    category: 'heal',
    description: 'Restore 3 INTEGRITY.',
    apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + 3); },
  },
  {
    id: 'heal_med',
    name: 'SYSTEM RESTORE',
    rarity: 'rare',
    category: 'heal',
    description: 'Restore 6 INTEGRITY.',
    apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + 6); },
  },
  {
    id: 'heal_max',
    name: 'HARDENED CORE',
    rarity: 'epic',
    category: 'heal',
    description: '+5 MAX INTEGRITY and fully heal.',
    apply: (s) => { s.maxHp += 5; s.hp = s.maxHp; },
  },
  {
    id: 'heal_revive',
    name: 'IMMORTAL PROTOCOL',
    rarity: 'legendary',
    category: 'heal',
    description: 'Revive once on defeat with 5 INTEGRITY.',
    apply: (s) => { s.mods.revive = true; },
  },
];

// ==================== EXOTIC ====================

const EXOTIC: CardDef[] = [
  {
    id: 'exotic_time_dilation',
    name: 'TIME DILATION',
    rarity: 'legendary',
    category: 'exotic',
    description: 'All enemies move 25% slower for the rest of the run.',
    apply: (s) => { s.mods.enemySpeedMult *= 0.75; },
  },
  {
    id: 'exotic_replicator',
    name: 'REPLICATOR',
    rarity: 'legendary',
    category: 'exotic',
    description: 'Gain 1 deploy token for every tower type you have placed.',
    apply: (s) => {
      const placed = new Set(s.towers.map((t) => t.def));
      for (const id of placed) addToken(s, id, 1);
    },
  },
  {
    id: 'exotic_overclock',
    name: 'SYSTEM OVERCLOCK',
    rarity: 'epic',
    category: 'exotic',
    description: 'All towers fire 40% faster for the rest of the run.',
    apply: (s) => { s.mods.globalRatePct += 0.4; },
  },
  {
    id: 'exotic_kill_feed',
    name: 'KILL FEED',
    rarity: 'rare',
    category: 'exotic',
    description: 'Each enemy kill reduces ALL tower cooldowns by 0.08s.',
    apply: (_s) => { /* tracked via cardsPicked in killEnemy */ },
  },
  {
    id: 'exotic_redundancy',
    name: 'REDUNDANCY PROTOCOL',
    rarity: 'epic',
    category: 'exotic',
    description: 'With 4+ different tower types placed, all towers deal +20% damage.',
    apply: (_s) => { /* tracked via cardsPicked in effectiveDamage */ },
  },
];

// ==================== EXPORTS ====================

export const CARDS: CardDef[] = [
  ...DEPLOY,
  ...UPGRADE,
  ...HEAL,
  ...EXOTIC,
];

export const CARDS_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// Fresh-save unlocks. Three starter towers (firewall + honeypot + booster_node) plus
// their common/rare upgrades — every other tower and its upgrade cards are earned
// through map clears (see maps.ts rewards and finishRun() which auto-unlocks a tower's
// common/rare upgrades on unlock).
export const STARTING_UNLOCKED_CARDS = [
  'deploy_firewall',
  'deploy_honeypot',
  'deploy_booster_node',
  // Common/rare upgrades for the three starter towers (no synergies — those are earned later)
  ...UPGRADE.filter((c) =>
    (c.rarity === 'common' || c.rarity === 'rare') &&
    !c.towerHint2 &&
    (c.towerHint === 'firewall' || c.towerHint === 'honeypot' || c.towerHint === 'booster_node')
  ).map((c) => c.id),
  // Non-legendary heals always available
  ...HEAL.filter((c) => c.rarity !== 'legendary').map((c) => c.id),
  // One gentle exotic starter
  'exotic_overclock',
];

const BASE_WEIGHTS: Record<string, number> = { common: 60, rare: 28, epic: 10, legendary: 2 };
const PER_LEVEL: Record<string, number> = { common: 0, rare: 0.5, epic: 0.3, legendary: 0.15 };

export interface DraftContext {
  placedTowerTypes: Set<TowerId>;
  towerCount: number;
}

function categoryWeight(category: string, level: number, ctx: DraftContext): number {
  const n = ctx.towerCount;
  switch (category) {
    case 'deploy':  return Math.max(0.3, 2.5 - n * 0.28);
    case 'upgrade': return Math.min(2.5, 0.1 + n * 0.38);
    case 'heal':    return 1.0;
    case 'exotic':  return Math.min(1.5, 0.2 + level * 0.1);
    default:        return 1.0;
  }
}

export function drawDraft(level: number, unlockedIds: Set<string>, context: DraftContext, count = 3, pickedIds: string[] = []): string[] {
  const pool = CARDS.filter((c) => {
    if (!unlockedIds.has(c.id)) return false;
    // Upgrade cards only appear if the relevant tower(s) are placed
    if (c.category === 'upgrade' && c.towerHint && !context.placedTowerTypes.has(c.towerHint)) return false;
    if (c.category === 'upgrade' && c.towerHint2 && !context.placedTowerTypes.has(c.towerHint2)) return false;
    // Deploy cards filtered out for already-placed singleton tower types
    if (c.category === 'deploy' && c.towerHint && context.placedTowerTypes.has(c.towerHint)) return false;
    // Non-deploy cards already picked this run are excluded (no duplicates)
    if (c.category !== 'deploy' && pickedIds.includes(c.id)) return false;
    // Cards with requires: all prerequisite card IDs must already be picked
    if (c.requires && !c.requires.every(r => pickedIds.includes(r))) return false;
    return true;
  });
  if (pool.length === 0) return [];

  const rarityW: Record<string, number> = {};
  for (const r of Object.keys(BASE_WEIGHTS)) {
    rarityW[r] = BASE_WEIGHTS[r] + PER_LEVEL[r] * level;
  }

  const picks: string[] = [];
  const used = new Set<string>();
  while (picks.length < count) {
    const weighted = pool
      .filter((c) => !used.has(c.id))
      .map((c) => ({ card: c, weight: rarityW[c.rarity] * categoryWeight(c.category, level, context) }));
    const totalW = weighted.reduce((sum, x) => sum + x.weight, 0);
    if (totalW <= 0 || weighted.length === 0) break;
    let r = Math.random() * totalW;
    let picked = weighted[weighted.length - 1];
    for (const w of weighted) { r -= w.weight; if (r <= 0) { picked = w; break; } }
    used.add(picked.card.id);
    picks.push(picked.card.id);
  }
  return picks;
}
