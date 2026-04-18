import type { CardDef, RunState, TowerId, Rarity } from '@/types';

// ==================== HELPERS ====================

function addToken(s: RunState, id: TowerId, count: number): void {
  s.deployTokens[id] = (s.deployTokens[id] ?? 0) + count;
}

function addEffect(s: RunState, tower: TowerId, tag: string): void {
  if (!s.towerEffects[tower]) s.towerEffects[tower] = new Set<string>();
  s.towerEffects[tower]!.add(tag);
}

function bumpDmg(s: RunState, t: TowerId, amt: number): void {
  s.mods.towerDmg[t] = (s.mods.towerDmg[t] ?? 0) + amt;
}
function bumpRange(s: RunState, t: TowerId, amt: number): void {
  s.mods.towerRange[t] = (s.mods.towerRange[t] ?? 0) + amt;
}
function bumpRate(s: RunState, t: TowerId, amt: number): void {
  s.mods.towerRate[t] = (s.mods.towerRate[t] ?? 0) + amt;
}
function bumpCrit(s: RunState, t: TowerId, amt: number): void {
  s.mods.towerCrit[t] = (s.mods.towerCrit[t] ?? 0) + amt;
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
    description: 'Gain a DATA MINER token. Passive XP generator — 1 XP per 3s during waves.',
    apply: (s) => { addToken(s, 'data_miner', 1); },
  },
];

// ==================== UPGRADE BRANCH HELPERS ====================
//
// Each tower has 3 branches. Each branch is 6 cards: keystone + 4 picks + capstone.
// Keystone excludes the OTHER 2 keystones for the same tower (commits the build).
// Capstone requires keystone + 2 of the 4 mid-branch picks (cards 2 & 4 by convention).

interface BranchSpec {
  tower: TowerId;
  towerLabel: string;            // human-readable, used in card names
  branchKey: string;             // e.g. 'sup'
  branchLabel: string;           // e.g. 'SUPPRESSION'
  branchTagSuffix: string;       // namespace for the branch (e.g. 'suppression')
  // 6 entries (keystone + 4 + capstone). Each defines name, description, rarity (auto for keys/caps), apply.
  cards: BranchCardSpec[];
}

interface BranchCardSpec {
  shortName: string;             // e.g. 'SUPPRESSION PROTOCOL'
  description: string;
  rarity?: Rarity;               // forced; defaults vary by slot
  apply: (s: RunState) => void;
}

function buildBranch(spec: BranchSpec, otherKeystones: string[]): CardDef[] {
  const t = spec.tower;
  const bk = spec.branchKey;
  const ids = [
    `${t}_${bk}_key`,
    `${t}_${bk}_1`,
    `${t}_${bk}_2`,
    `${t}_${bk}_3`,
    `${t}_${bk}_4`,
    `${t}_${bk}_caps`,
  ];
  const out: CardDef[] = [];
  for (let i = 0; i < 6; i++) {
    const c = spec.cards[i];
    const isKey = i === 0;
    const isCaps = i === 5;
    const card: CardDef = {
      id: ids[i],
      name: `${spec.towerLabel}: ${c.shortName}`,
      rarity: c.rarity ?? (isKey ? 'common' : isCaps ? 'epic' : (i % 2 === 0 ? 'rare' : 'common')),
      category: 'upgrade',
      towerHint: t,
      branch: `${t}.${spec.branchTagSuffix}`,
      description: isKey
        ? `[KEYSTONE — locks ${spec.towerLabel} into ${spec.branchLabel}] ${c.description}`
        : isCaps
          ? `[CAPSTONE] ${c.description}`
          : c.description,
      apply: c.apply,
    };
    if (isKey) {
      card.excludes = otherKeystones.slice();
    } else {
      // requires keystone for branch picks
      card.requires = [ids[0]];
    }
    if (isCaps) {
      // capstone gates on keystone + cards 2 and 4 (by convention)
      card.requires = [ids[0], ids[2], ids[4]];
    }
    out.push(card);
  }
  return out;
}

// ==================== TOWER BRANCH SPECS ====================
//
// Tower IDs and branch keys per spec:
//   firewall      sup, brst, siege
//   honeypot      ven, con, vol
//   antivirus     mark, vol, pierce
//   quantum       super, col, obs
//   ice           blz, frz, shr
//   mine          brg, dem, scr   (artillery)
//   chain         strm, vlt, grd
//   railgun       sab, hyp, cap
//   pulse         frq, ovl, ion
//   sniper        mks, exe, spt
//   scrambler     dec, sab, crs
//   sentinel      fld, thr, plz
//   booster_node  amp, res, crt   (id prefix: booster)
//   data_miner    thr, eco, mta   (id prefix: dataminer)
//
// `otherKeys` values for excludes are precomputed below.

const BRANCH_SPECS: BranchSpec[] = [];

// ===== FIREWALL =====
{
  const T = 'firewall' as TowerId;
  const TL = 'FIREWALL';
  // Suppression — slow / CC focus
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'sup', branchLabel: 'SUPPRESSION', branchTagSuffix: 'suppression',
    cards: [
      { shortName: 'SUPPRESSION PROTOCOL', description: 'FIREWALL shots slow enemies 20% for 1.2s.',
        apply: (s) => { addEffect(s, T, 'firewall_sup_key'); addEffect(s, T, 'suppressor'); } },
      { shortName: 'TRACER ROUNDS', description: 'FIREWALL shots mark enemies — marked enemies take +30% from all sources for 2s.',
        apply: (s) => { addEffect(s, T, 'tracer'); } },
      { shortName: 'HUNTER INSTINCT', description: 'Tracer marks last 4s (was 2s) and grant +45% (was +30%).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'hunter_instinct'); } },
      { shortName: 'INCENDIARY.EXE', description: 'FIREWALL shots leave a small fire zone that burns nearby enemies.',
        apply: (s) => { addEffect(s, T, 'incendiary'); } },
      { shortName: 'CHILL CASCADE', description: 'FIREWALL slow effect strengthened to 35% and applies to ricochets.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'firewall_sup_chill'); } },
      { shortName: 'TOTAL LOCKDOWN', description: 'FIREWALL crits fully stop enemies for 0.4s.',
        apply: (s) => { addEffect(s, T, 'firewall_sup_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'brst', branchLabel: 'BURST', branchTagSuffix: 'burst',
    cards: [
      { shortName: 'BURST PROTOCOL', description: 'Every 4th FIREWALL shot fires a triple spread burst.',
        apply: (s) => { addEffect(s, T, 'firewall_brst_key'); addEffect(s, T, 'burst'); } },
      { shortName: 'FRAG ROUNDS', description: 'Burst spread shots detonate on impact (0.5-cell AoE).',
        apply: (s) => { addEffect(s, T, 'fragmentation'); } },
      { shortName: 'RICOCHET', description: 'FIREWALL shots ricochet to a 2nd nearby enemy for 55% damage.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'ricochet'); } },
      { shortName: 'BLAZE PROTOCOL', description: 'Every 3 FIREWALL kills within 5s triggers 2s of +25% fire rate.',
        apply: (s) => { addEffect(s, T, 'blazing'); } },
      { shortName: 'OVERDRIVE', description: 'Each kill shortens FIREWALL\'s next cooldown by 0.4s (crits 0.8s).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'overdrive'); } },
      { shortName: 'PENTA BURST', description: 'Every 4th FIREWALL shot is a 5-way burst spread.',
        apply: (s) => { addEffect(s, T, 'firewall_brst_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'siege', branchLabel: 'SIEGE', branchTagSuffix: 'siege',
    cards: [
      { shortName: 'SIEGE LOADOUT', description: 'FIREWALL +25% damage, +0.4 range. Heavy single-target build.',
        apply: (s) => { addEffect(s, T, 'firewall_siege_key'); bumpDmg(s, T, 0.25); bumpRange(s, T, 0.4); } },
      { shortName: 'HOLLOW POINT', description: 'FIREWALL shots ignore 5 armor on each hit.',
        apply: (s) => { addEffect(s, T, 'hollow_point'); } },
      { shortName: 'SIEGE CALIBRATION', description: 'FIREWALL +20% crit chance.', rarity: 'rare',
        apply: (s) => { bumpCrit(s, T, 0.20); addEffect(s, T, 'firewall_siege_calib'); } },
      { shortName: 'FOCUSED FIRE', description: 'FIREWALL +30% damage when targeting a single enemy in range.',
        apply: (s) => { bumpDmg(s, T, 0.15); addEffect(s, T, 'firewall_siege_focus'); } },
      { shortName: 'ARMOR CRUSHER', description: 'FIREWALL deals double damage to enemies above 75% HP.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'firewall_siege_crusher'); } },
      { shortName: 'OBLITERATE', description: 'FIREWALL shots deal 2× HP% damage to targets above 75% HP.',
        apply: (s) => { addEffect(s, T, 'firewall_siege_caps'); } },
    ],
  });
}

// ===== HONEYPOT =====
{
  const T = 'honeypot' as TowerId;
  const TL = 'HONEYPOT';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'ven', branchLabel: 'VENOM', branchTagSuffix: 'venom',
    cards: [
      { shortName: 'ACID BATH', description: 'HONEYPOT goo puddles burn enemies for 10 damage per second.',
        apply: (s) => { addEffect(s, T, 'honeypot_ven_key'); addEffect(s, T, 'acid'); } },
      { shortName: 'PERSISTENT PAYLOAD', description: 'HONEYPOT goo puddles last twice as long.',
        apply: (s) => { addEffect(s, T, 'persistent'); } },
      { shortName: 'VISCOUS PAYLOAD', description: 'HONEYPOT puddles slow enemies 55% (was 40%).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'viscous'); } },
      { shortName: 'SLOW DRAIN', description: 'HONEYPOT puddles last 50% longer (stacks with PERSISTENT).',
        apply: (s) => { addEffect(s, T, 'linger'); } },
      { shortName: 'TOXIC BLOOM', description: 'Enemies killed by acid burst into 3s micro-puddles (8 dps).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'toxic_bloom'); } },
      { shortName: 'CORROSION CASCADE', description: 'Acid puddle DPS doubled (20 dps) and acid stacks on enemies.',
        apply: (s) => { addEffect(s, T, 'honeypot_ven_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'con', branchLabel: 'CONTAINMENT', branchTagSuffix: 'containment',
    cards: [
      { shortName: 'CONTAINMENT FIELD', description: 'HONEYPOT puddles double in radius.',
        apply: (s) => { addEffect(s, T, 'honeypot_con_key'); addEffect(s, T, 'overflow'); } },
      { shortName: 'VIRAL COATING', description: 'Slowed enemies spread 50% slow to adjacent enemies on contact.',
        apply: (s) => { addEffect(s, T, 'coating'); } },
      { shortName: 'EXPANDED CACHE', description: 'HONEYPOT +30% range. Drops puddles farther afield.', rarity: 'rare',
        apply: (s) => { bumpRange(s, T, 0.3); addEffect(s, T, 'honeypot_con_cache'); } },
      { shortName: 'SOLID GOO', description: 'Slow strength inside puddles raised to 70%.',
        apply: (s) => { addEffect(s, T, 'honeypot_con_solid'); } },
      { shortName: 'NET OF LIES', description: 'HONEYPOT puddles last +75% longer when stacked over each other.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'linger'); } },
      { shortName: 'TARPIT', description: 'Enemies inside HONEYPOT puddles cannot leave for 2s after entering.',
        apply: (s) => { addEffect(s, T, 'honeypot_con_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'vol', branchLabel: 'VOLATILE', branchTagSuffix: 'volatile',
    cards: [
      { shortName: 'GOO DETONATION', description: 'When enemies die in HONEYPOT puddle they detonate for 80 AoE damage.',
        apply: (s) => { addEffect(s, T, 'honeypot_vol_key'); addEffect(s, T, 'detonation'); } },
      { shortName: 'VOLATILE MIXTURE', description: 'HONEYPOT puddles explode when they expire (30 AoE damage).',
        apply: (s) => { addEffect(s, T, 'volatile'); } },
      { shortName: 'CHAIN GOO', description: 'Detonations leave a 1.5s goo puddle at the explosion point.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'chain_goo'); } },
      { shortName: 'PRESSURE BUILD', description: 'HONEYPOT +20% damage, +0.2 range.',
        apply: (s) => { bumpDmg(s, T, 0.20); bumpRange(s, T, 0.2); addEffect(s, T, 'honeypot_vol_pressure'); } },
      { shortName: 'OVERPRESSURE', description: 'Detonation damage +60%.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'honeypot_vol_over'); } },
      { shortName: 'CHAIN DETONATION', description: 'A death in puddle ignites all adjacent puddles for chain detonations.',
        apply: (s) => { addEffect(s, T, 'honeypot_vol_caps'); } },
    ],
  });
}

// ===== ANTIVIRUS =====
{
  const T = 'antivirus' as TowerId;
  const TL = 'ANTIVIRUS';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'mark', branchLabel: 'MARK', branchTagSuffix: 'mark',
    cards: [
      { shortName: 'LOCKDOWN', description: 'ANTIVIRUS marks targets — marked enemies take +30% from all sources for 2s.',
        apply: (s) => { addEffect(s, T, 'antivirus_mark_key'); addEffect(s, T, 'lockdown'); } },
      { shortName: 'QUARANTINE', description: 'ANTIVIRUS hits apply 30% slow for 1.2s.',
        apply: (s) => { addEffect(s, T, 'quarantine'); } },
      { shortName: 'VIRAL MARK', description: 'When marked enemy dies, mark spreads to 2 nearby enemies.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'viral_mark'); } },
      { shortName: 'FOCUS FIRE', description: 'Consecutive hits on same enemy add +10% damage (max +30%).',
        apply: (s) => { addEffect(s, T, 'focus_fire'); } },
      { shortName: 'ADAPTIVE TARGETING', description: 'ANTIVIRUS deals +15% damage to enemies that have had armor stripped.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'adaptive'); } },
      { shortName: 'SURGICAL DOMINANCE', description: 'Marked enemies take +75% from all sources (was +30%).',
        apply: (s) => { addEffect(s, T, 'antivirus_mark_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'vol', branchLabel: 'VOLLEY', branchTagSuffix: 'volley',
    cards: [
      { shortName: 'TRIPLE SCAN', description: 'ANTIVIRUS fires 3 projectiles per shot instead of 2.',
        apply: (s) => { addEffect(s, T, 'antivirus_vol_key'); addEffect(s, T, 'triple'); } },
      { shortName: 'BURST MODE', description: 'ANTIVIRUS fires a 4th shot instantly after the burst.',
        apply: (s) => { addEffect(s, T, 'burst_mode'); } },
      { shortName: 'PRECISION TARGETING', description: 'ANTIVIRUS secondary shots always critically strike.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'precision'); } },
      { shortName: 'PRECISION BURST', description: 'Precision crits deal +50% bonus damage.',
        apply: (s) => { addEffect(s, T, 'precision_burst'); } },
      { shortName: 'OVERDRIVE SCAN', description: 'Every 3rd ANTIVIRUS kill triggers a free instant-crit shot.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'overdrive'); } },
      { shortName: 'PENTA VOLLEY', description: 'ANTIVIRUS fires 5 shots per volley.',
        apply: (s) => { addEffect(s, T, 'antivirus_vol_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'pierce', branchLabel: 'PIERCE', branchTagSuffix: 'pierce',
    cards: [
      { shortName: 'DEEP SCAN', description: 'ANTIVIRUS shots ignore 6 armor on hit.',
        apply: (s) => { addEffect(s, T, 'antivirus_pierce_key'); addEffect(s, T, 'antivirus_pierce_deep'); } },
      { shortName: 'ARMOR MELT', description: 'ANTIVIRUS hits permanently strip 1 armor per shot.',
        apply: (s) => { addEffect(s, T, 'antivirus_pierce_melt'); } },
      { shortName: 'BLAST CALIBRATION', description: 'ANTIVIRUS +20% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.20); addEffect(s, T, 'antivirus_pierce_blast'); } },
      { shortName: 'EXPLOIT WINDOW', description: 'Armor-stripped enemies take +25% from ANTIVIRUS shots.',
        apply: (s) => { addEffect(s, T, 'adaptive'); addEffect(s, T, 'antivirus_pierce_exploit'); } },
      { shortName: 'ULTRASONIC SHOT', description: 'ANTIVIRUS projectiles travel 60% faster, +0.4 range.', rarity: 'rare',
        apply: (s) => { bumpRange(s, T, 0.4); addEffect(s, T, 'antivirus_pierce_ultra'); } },
      { shortName: 'ARMOR ANNIHILATION', description: 'Each hit cracks 5 armor permanently.',
        apply: (s) => { addEffect(s, T, 'antivirus_pierce_caps'); } },
    ],
  });
}

// ===== QUANTUM =====
{
  const T = 'quantum' as TowerId;
  const TL = 'QUANTUM';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'super', branchLabel: 'SUPERPOSITION', branchTagSuffix: 'superposition',
    cards: [
      { shortName: 'SUPERPOSITION', description: 'QUANTUM has a 35% chance to fire twice per shot.',
        apply: (s) => { addEffect(s, T, 'quantum_super_key'); addEffect(s, T, 'double'); } },
      { shortName: 'UNSTABLE CORE', description: 'QUANTUM crit chance +8%.',
        apply: (s) => { addEffect(s, T, 'unstable'); } },
      { shortName: 'RESONANCE', description: 'When first QUANTUM shot crits, double-shot also crits.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'resonance'); } },
      { shortName: 'SUPERCHARGE', description: 'After a crit, next shot is guaranteed crit.',
        apply: (s) => { addEffect(s, T, 'supercharge'); } },
      { shortName: 'CRITICAL TUNE', description: 'QUANTUM +12% crit chance, +10% damage.', rarity: 'rare',
        apply: (s) => { bumpCrit(s, T, 0.12); bumpDmg(s, T, 0.10); addEffect(s, T, 'quantum_super_tune'); } },
      { shortName: 'DECOHERENCE OVERLOAD', description: 'QUANTUM crit chance pinned at +50%.',
        apply: (s) => { addEffect(s, T, 'quantum_super_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'col', branchLabel: 'COLLAPSE', branchTagSuffix: 'collapse',
    cards: [
      { shortName: 'WAVE COLLAPSE', description: 'QUANTUM hits reduce target armor 50% for 1.5s.',
        apply: (s) => { addEffect(s, T, 'quantum_col_key'); addEffect(s, T, 'collapse'); } },
      { shortName: 'PHASE SHIFT', description: 'QUANTUM shots ignore all enemy armor.',
        apply: (s) => { addEffect(s, T, 'phase'); } },
      { shortName: 'ANTIMATTER', description: 'Each crit permanently increases QUANTUM damage 2% (max +30%).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'antimatter'); } },
      { shortName: 'UNCERTAINTY', description: 'Entanglement arcs (if any) reduce target armor 25% for 2s.',
        apply: (s) => { addEffect(s, T, 'uncertainty'); } },
      { shortName: 'ENTANGLEMENT', description: 'QUANTUM critical hits arc to nearest enemy for 60% damage.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'entangle'); } },
      { shortName: 'PERMANENT COLLAPSE', description: 'COLLAPSE armor reduction is permanent — armor never restores.',
        apply: (s) => { addEffect(s, T, 'quantum_col_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'obs', branchLabel: 'OBSERVER', branchTagSuffix: 'observer',
    cards: [
      { shortName: 'OBSERVER EFFECT', description: 'QUANTUM charges while idle — 0.5s of inactivity adds +0.5 to next crit mult (max +3.0).',
        apply: (s) => { addEffect(s, T, 'quantum_obs_key'); addEffect(s, T, 'observer'); } },
      { shortName: 'PATIENT GAZE', description: 'Observer charges 50% faster.',
        apply: (s) => { addEffect(s, T, 'quantum_obs_patient'); } },
      { shortName: 'SCRY', description: 'QUANTUM +0.6 range, +20% damage.', rarity: 'rare',
        apply: (s) => { bumpRange(s, T, 0.6); bumpDmg(s, T, 0.2); addEffect(s, T, 'quantum_obs_scry'); } },
      { shortName: 'RESEARCHER', description: 'Observer charge cap +50% (extra +1.5 mult).',
        apply: (s) => { addEffect(s, T, 'quantum_obs_research'); } },
      { shortName: 'ANTIMATTER LENS', description: 'Observer-charged shots ignore all armor.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'quantum_obs_lens'); } },
      { shortName: 'ABSOLUTE OBSERVER', description: 'Observer max charge reaches +5.0 mult (~×8 crit total).',
        apply: (s) => { addEffect(s, T, 'quantum_obs_caps'); } },
    ],
  });
}

// ===== ICE-BREAKER =====
{
  const T = 'ice' as TowerId;
  const TL = 'ICE-BREAKER';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'blz', branchLabel: 'BLIZZARD', branchTagSuffix: 'blizzard',
    cards: [
      { shortName: 'BLIZZARD FIELD', description: 'ICE-BREAKER explosion radius is 70% wider.',
        apply: (s) => { addEffect(s, T, 'ice_blz_key'); addEffect(s, T, 'wide'); } },
      { shortName: 'GLACIAL FIELD', description: 'ICE-BREAKER explosions leave a 3s slow field (25%).',
        apply: (s) => { addEffect(s, T, 'glacial'); } },
      { shortName: 'ICE LANCE', description: 'ICE-BREAKER explosion radius +20% (stacks with BLIZZARD FIELD).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'ice_lance'); } },
      { shortName: 'BRITTLE COATING', description: 'Slowed/frozen enemies take +15% damage from ALL tower sources.',
        apply: (s) => { addEffect(s, T, 'brittle'); } },
      { shortName: 'PERMAFROST', description: 'Hits leave a cryo field for 3s that slows nearby enemies 20%.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'permafrost'); } },
      { shortName: 'GLACIAL CHAIN', description: 'ICE-BREAKER explosions chain to a nearby enemy for 60% damage.',
        apply: (s) => { addEffect(s, T, 'ice_blz_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'frz', branchLabel: 'DEEP FREEZE', branchTagSuffix: 'freeze',
    cards: [
      { shortName: 'ABSOLUTE ZERO', description: 'ICE-BREAKER stops enemies completely for 0.6s instead of slowing.',
        apply: (s) => { addEffect(s, T, 'ice_frz_key'); addEffect(s, T, 'freeze'); } },
      { shortName: 'DEEP FREEZE', description: 'Freeze duration increases to 1.0s (was 0.6s).',
        apply: (s) => { addEffect(s, T, 'absolute_zero_plus'); } },
      { shortName: 'AVALANCHE', description: 'ICE-BREAKER hitting a fully-stopped enemy explodes for 2× damage in a wider radius.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'avalanche'); } },
      { shortName: 'CRYO RECYCLE', description: 'ICE-BREAKER fires 20% faster.',
        apply: (s) => { bumpRate(s, T, 0.2); addEffect(s, T, 'ice_frz_recycle'); } },
      { shortName: 'FROST CORE', description: 'ICE-BREAKER +25% damage to slowed enemies.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'ice_frz_core'); } },
      { shortName: 'BOSS FREEZE', description: 'Slow-immune bosses can be frozen for 0.6s.',
        apply: (s) => { addEffect(s, T, 'ice_frz_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'shr', branchLabel: 'CRYO SHARD', branchTagSuffix: 'shard',
    cards: [
      { shortName: 'SHARD STORM', description: 'ICE-BREAKER blasts spawn 6 slow fields in a ring.',
        apply: (s) => { addEffect(s, T, 'ice_shr_key'); addEffect(s, T, 'shards'); } },
      { shortName: 'CRYO NOVA', description: 'Shard fields deal 8 dps in addition to slowing.',
        apply: (s) => { addEffect(s, T, 'cryo_nova'); } },
      { shortName: 'SHARP SHARDS', description: 'Shard field DPS doubled (16 dps).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'ice_shr_sharp'); } },
      { shortName: 'FROST KINETICS', description: 'ICE-BREAKER +0.5 range, +15% damage.',
        apply: (s) => { bumpRange(s, T, 0.5); bumpDmg(s, T, 0.15); addEffect(s, T, 'ice_shr_kinetic'); } },
      { shortName: 'SHARD ECHO', description: 'Shard fields last 50% longer.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'ice_shr_echo'); } },
      { shortName: 'OCTAGONAL SHARDS', description: 'Every shot releases 8 shard fields instead of 6.',
        apply: (s) => { addEffect(s, T, 'ice_shr_caps'); } },
    ],
  });
}

// ===== ARTILLERY (mine) =====
{
  const T = 'mine' as TowerId;
  const TL = 'ARTILLERY';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'brg', branchLabel: 'BARRAGE', branchTagSuffix: 'barrage',
    cards: [
      { shortName: 'CLUSTER MUNITIONS', description: 'Each ARTILLERY shot triggers 2 additional shells nearby.',
        apply: (s) => { addEffect(s, T, 'mine_brg_key'); addEffect(s, T, 'cluster'); } },
      { shortName: 'FRAGMENTATION ROUNDS', description: 'Each shell scatters 3 mini-blasts (40% damage each).',
        apply: (s) => { addEffect(s, T, 'frag_kit'); } },
      { shortName: 'CHAIN DETONATION', description: 'Cluster shells deal full damage (was 70%).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'chain_reaction'); } },
      { shortName: 'AUTO-LOADER', description: 'ARTILLERY fires 25% faster.',
        apply: (s) => { addEffect(s, T, 'resupply'); } },
      { shortName: 'ADVANCED TARGETING', description: 'ARTILLERY range +0.4 cells.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'pressure_fuse'); } },
      { shortName: 'TRIPLE BARRAGE', description: 'Every shot is a 3-shell volley.',
        apply: (s) => { addEffect(s, T, 'mine_brg_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'dem', branchLabel: 'DEMOLITION', branchTagSuffix: 'demolition',
    cards: [
      { shortName: 'HEAVY SHELLS', description: 'ARTILLERY explosion radius doubles.',
        apply: (s) => { addEffect(s, T, 'mine_dem_key'); addEffect(s, T, 'wide'); } },
      { shortName: 'DEMOLITION WARHEAD', description: 'Wide-radius shells deal +35% damage.',
        apply: (s) => { addEffect(s, T, 'demolition'); } },
      { shortName: 'SHOCKWAVE SHELLS', description: 'ARTILLERY explosions stun all enemies in blast for 1.2s.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'stun'); } },
      { shortName: 'PENETRATOR SHELLS', description: 'Explosions strip 10 armor from enemies in blast for 4s.',
        apply: (s) => { addEffect(s, T, 'armor_strip'); } },
      { shortName: 'WARHEAD TUNING', description: 'ARTILLERY +25% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.25); addEffect(s, T, 'mine_dem_tune'); } },
      { shortName: 'EARTH-SHAKER', description: 'Shell damage +80%, fire rate -20%.',
        apply: (s) => { bumpDmg(s, T, 0.8); bumpRate(s, T, -0.2); addEffect(s, T, 'mine_dem_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'scr', branchLabel: 'SCORCH', branchTagSuffix: 'scorch',
    cards: [
      { shortName: 'NANOBOT PAYLOAD', description: '35% chance ARTILLERY impact leaves an acid puddle (3s, 12 dps).',
        apply: (s) => { addEffect(s, T, 'mine_scr_key'); addEffect(s, T, 'nanobots'); } },
      { shortName: 'PHOSPHORUS LOAD', description: 'Nanobot puddle DPS doubled (24 dps).',
        apply: (s) => { addEffect(s, T, 'mine_scr_phos'); } },
      { shortName: 'EXTENDED BURN', description: 'Nanobot puddle duration doubled (6s).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'mine_scr_burn'); } },
      { shortName: 'INCENDIARY TARGETING', description: 'Nanobot proc chance raised to 100%.',
        apply: (s) => { addEffect(s, T, 'mine_scr_targeting'); } },
      { shortName: 'WIDE BURN', description: 'Nanobot puddle radius +50%.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'mine_scr_wide'); } },
      { shortName: 'INFERNO ZONE', description: 'Every impact leaves a 5s, 30 dps burn zone (always-on, large).',
        apply: (s) => { addEffect(s, T, 'mine_scr_caps'); } },
    ],
  });
}

// ===== CHAIN =====
{
  const T = 'chain' as TowerId;
  const TL = 'CHAIN';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'strm', branchLabel: 'STORM', branchTagSuffix: 'storm',
    cards: [
      { shortName: 'STORM SURGE', description: 'CHAIN arcs to 2 additional targets.',
        apply: (s) => { addEffect(s, T, 'chain_strm_key'); addEffect(s, T, 'storm'); } },
      { shortName: 'ARC NOVA', description: 'CHAIN arc reach doubles.',
        apply: (s) => { addEffect(s, T, 'nova'); } },
      { shortName: 'MEGAVOLT', description: 'Every 6th CHAIN shot fires a megavolt — no arc limit.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'megavolt'); } },
      { shortName: 'TESLA COIL', description: 'MEGAVOLT shots leave electric puddles (15 dps) at each hit.',
        apply: (s) => { addEffect(s, T, 'tesla_coil'); } },
      { shortName: 'STORM RANGE', description: 'CHAIN +0.6 range.', rarity: 'rare',
        apply: (s) => { bumpRange(s, T, 0.6); addEffect(s, T, 'chain_strm_range'); } },
      { shortName: 'TWELVE-FOLD', description: 'CHAIN base jump count raised to 12.',
        apply: (s) => { addEffect(s, T, 'chain_strm_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'vlt', branchLabel: 'VOLTAGE', branchTagSuffix: 'voltage',
    cards: [
      { shortName: 'FULL DISCHARGE', description: 'CHAIN jumps deal full damage with no falloff.',
        apply: (s) => { addEffect(s, T, 'chain_vlt_key'); addEffect(s, T, 'discharge'); } },
      { shortName: 'OVERCHARGE', description: 'CHAIN arcs deal +20% damage per jump.',
        apply: (s) => { addEffect(s, T, 'overcharge'); } },
      { shortName: 'CONDUCTOR', description: 'CHAIN deals +35% damage to slowed enemies.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'conductor'); } },
      { shortName: 'PERSISTENT ARC', description: 'Arcs leave a 0.6s electric burn (10 dps) at each hit.',
        apply: (s) => { addEffect(s, T, 'persistence'); } },
      { shortName: 'VOLTAGE TUNING', description: 'CHAIN +30% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.3); addEffect(s, T, 'chain_vlt_tune'); } },
      { shortName: 'MEGAVOLT GENERATOR', description: 'No falloff + +50% base damage.',
        apply: (s) => { bumpDmg(s, T, 0.5); addEffect(s, T, 'discharge'); addEffect(s, T, 'chain_vlt_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'grd', branchLabel: 'GROUND FAULT', branchTagSuffix: 'ground',
    cards: [
      { shortName: 'GROUND FAULT', description: 'CHAIN stuns each hit enemy for 0.35s.',
        apply: (s) => { addEffect(s, T, 'chain_grd_key'); addEffect(s, T, 'ground'); } },
      { shortName: 'FEEDBACK LOOP', description: 'Stunned enemies become marked for +30% from all sources.',
        apply: (s) => { addEffect(s, T, 'feedback_loop'); } },
      { shortName: 'GROUNDING SPIKE', description: 'CHAIN stun duration +0.25s.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'chain_grd_spike'); } },
      { shortName: 'FAULT STRESS', description: 'Stunned enemies take +25% damage from CHAIN.',
        apply: (s) => { addEffect(s, T, 'chain_grd_stress'); } },
      { shortName: 'EARTHED', description: 'CHAIN +20% damage and stun applies to first arc target also.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.2); addEffect(s, T, 'chain_grd_earthed'); } },
      { shortName: 'TOTAL GROUND', description: 'Every arc applies a 0.8s stun.',
        apply: (s) => { addEffect(s, T, 'chain_grd_caps'); } },
    ],
  });
}

// ===== RAILGUN =====
{
  const T = 'railgun' as TowerId;
  const TL = 'RAILGUN';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'sab', branchLabel: 'SABOT', branchTagSuffix: 'sabot',
    cards: [
      { shortName: 'SABOT ROUND', description: 'RAILGUN shots cause a small explosion at each enemy pierced.',
        apply: (s) => { addEffect(s, T, 'railgun_sab_key'); addEffect(s, T, 'sabot'); } },
      { shortName: 'SPLINTER ROUND', description: 'Sabot explosions deal +50% damage.',
        apply: (s) => { addEffect(s, T, 'splinter'); } },
      { shortName: 'PENETRATOR', description: 'RAILGUN pierce angle widens — finds more targets in path.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'penetrator'); } },
      { shortName: 'SHOCKWAVE', description: 'Pierced enemies are slowed 70% for 1.5s.',
        apply: (s) => { addEffect(s, T, 'shockwave'); } },
      { shortName: 'SABOT TUNING', description: 'RAILGUN +20% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.20); addEffect(s, T, 'railgun_sab_tune'); } },
      { shortName: 'WIDE SABOT', description: 'Sabot explosion radius increases to 1.5 cells.',
        apply: (s) => { addEffect(s, T, 'railgun_sab_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'hyp', branchLabel: 'HYPERSONIC', branchTagSuffix: 'hypersonic',
    cards: [
      { shortName: 'HYPERSONIC', description: 'RAILGUN projectile speed doubled.',
        apply: (s) => { addEffect(s, T, 'railgun_hyp_key'); addEffect(s, T, 'hypersonic'); } },
      { shortName: 'KILL FEEDBACK', description: 'Each kill reduces next shot cooldown by 0.6s.',
        apply: (s) => { addEffect(s, T, 'feedback'); } },
      { shortName: 'KILL CHAIN', description: 'RAILGUN kills reduce cooldown by 0.3s (stacks).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'kill_chain'); } },
      { shortName: 'ARMOR PIERCER', description: 'RAILGUN shots ignore 6 armor.',
        apply: (s) => { addEffect(s, T, 'armor_pierce'); } },
      { shortName: 'OVERCLOCK BARREL', description: 'RAILGUN +20% fire rate.', rarity: 'rare',
        apply: (s) => { bumpRate(s, T, 0.20); addEffect(s, T, 'railgun_hyp_overclock'); } },
      { shortName: 'CHAIN-FIRE', description: 'Each kill refunds 1.5s cooldown.',
        apply: (s) => { addEffect(s, T, 'railgun_hyp_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'cap', branchLabel: 'CAPACITOR', branchTagSuffix: 'capacitor',
    cards: [
      { shortName: 'CAPACITOR', description: 'RAILGUN charges for 8s then auto-fires a 5× damage mega shot.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'railgun_cap_key'); addEffect(s, T, 'capacitor'); } },
      { shortName: 'CHARGED BURST', description: 'Capacitor mega shot stuns all pierced targets for 1s.',
        apply: (s) => { addEffect(s, T, 'charged_mega'); } },
      { shortName: 'CHARGE COILS', description: 'Capacitor charges 25% faster (8s → 6s).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'railgun_cap_coils'); } },
      { shortName: 'MEGA RANGE', description: 'RAILGUN +0.6 range.',
        apply: (s) => { bumpRange(s, T, 0.6); addEffect(s, T, 'railgun_cap_range'); } },
      { shortName: 'OVERCAP', description: 'Capacitor mega damage +50% (×7.5 instead of ×5).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'railgun_cap_overcap'); } },
      { shortName: 'RAPID CAPACITOR', description: 'Mega shots fire every 4s instead of 8s.',
        apply: (s) => { addEffect(s, T, 'railgun_cap_caps'); } },
    ],
  });
}

// ===== EMP ARRAY (pulse) =====
{
  const T = 'pulse' as TowerId;
  const TL = 'EMP';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'frq', branchLabel: 'FREQUENCY', branchTagSuffix: 'frequency',
    cards: [
      { shortName: 'HIGH FREQUENCY', description: 'EMP burst recharge reduced by 0.7s.',
        apply: (s) => { addEffect(s, T, 'pulse_frq_key'); addEffect(s, T, 'frequency'); } },
      { shortName: 'RAPID RESONANCE', description: 'Recharge reduced by additional 0.4s.',
        apply: (s) => { addEffect(s, T, 'rapid_resonance'); } },
      { shortName: 'AMPLIFIER', description: 'EMP range +0.6 cells.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'amplify'); } },
      { shortName: 'CONCUSSIVE PULSE', description: 'Bursts push enemies 0.12 cells back toward start.',
        apply: (s) => { addEffect(s, T, 'concussive'); } },
      { shortName: 'CASCADE', description: 'Bursts push enemies 0.15 cells back toward path entrance.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'cascade'); } },
      { shortName: 'STROBE BURST', description: 'EMP burst fires every 0.8s.',
        apply: (s) => { addEffect(s, T, 'pulse_frq_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'ovl', branchLabel: 'OVERLOAD', branchTagSuffix: 'overload',
    cards: [
      { shortName: 'OVERLOAD PULSE', description: 'Every 4th EMP burst is an overload dealing 3× damage.',
        apply: (s) => { addEffect(s, T, 'pulse_ovl_key'); addEffect(s, T, 'overload'); } },
      { shortName: 'OVERLOAD SHOCK', description: 'Overload bursts also slow all hit enemies 40% for 1.5s.',
        apply: (s) => { addEffect(s, T, 'overload_shock'); } },
      { shortName: 'POWER CAPACITOR', description: 'EMP burst damage +15%.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'capacitor_boost'); } },
      { shortName: 'STUN BURST', description: 'EMP bursts stun every enemy hit for 0.5s.',
        apply: (s) => { addEffect(s, T, 'stun'); } },
      { shortName: 'OVERLOAD AMP', description: 'EMP +20% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.20); addEffect(s, T, 'pulse_ovl_amp'); } },
      { shortName: 'ETERNAL OVERLOAD', description: 'Every burst is now an overload.',
        apply: (s) => { addEffect(s, T, 'pulse_ovl_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'ion', branchLabel: 'IONIC', branchTagSuffix: 'ionic',
    cards: [
      { shortName: 'IONIC CHARGE', description: 'EMP burst damage ignores all enemy armor.',
        apply: (s) => { addEffect(s, T, 'pulse_ion_key'); addEffect(s, T, 'ionic'); } },
      { shortName: 'STUN COIL', description: 'EMP bursts stun every enemy for 0.5s.',
        apply: (s) => { addEffect(s, T, 'stun'); } },
      { shortName: 'IONIC TUNE', description: 'EMP +25% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.25); addEffect(s, T, 'pulse_ion_tune'); } },
      { shortName: 'STATIC FIELD', description: 'EMP +0.4 range and pierces shielded enemies.',
        apply: (s) => { bumpRange(s, T, 0.4); addEffect(s, T, 'pulse_ion_static'); } },
      { shortName: 'CHARGED IONS', description: 'EMP bursts also strip 2 armor on hit.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'pulse_ion_charged'); } },
      { shortName: 'PERMANENT STRIP', description: 'EMP bursts also strip 4 armor permanently.',
        apply: (s) => { addEffect(s, T, 'pulse_ion_caps'); } },
    ],
  });
}

// ===== OVERWATCH (sniper) =====
{
  const T = 'sniper' as TowerId;
  const TL = 'OVERWATCH';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'mks', branchLabel: 'MARKSMAN', branchTagSuffix: 'marksman',
    cards: [
      { shortName: 'CALLOUT', description: 'OVERWATCH marks targets — marked take +30% from all sources for 3s.',
        apply: (s) => { addEffect(s, T, 'sniper_mks_key'); addEffect(s, T, 'callout'); } },
      { shortName: 'INCENDIARY ROUND', description: 'OVERWATCH shots burn marked targets — 12 dps for 2s.',
        apply: (s) => { addEffect(s, T, 'incendiary_round'); } },
      { shortName: 'MARKSMAN TUNE', description: 'OVERWATCH +20% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.2); addEffect(s, T, 'sniper_mks_tune'); } },
      { shortName: 'GHOST ROUND', description: 'OVERWATCH shots ignore 5 armor.',
        apply: (s) => { addEffect(s, T, 'ghost_round'); } },
      { shortName: 'PERSISTENT MARK', description: 'Marks last 50% longer.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'sniper_mks_persist'); } },
      { shortName: 'BRAND OF DEATH', description: 'Marks placed by OVERWATCH last the rest of the run on hit enemies.',
        apply: (s) => { addEffect(s, T, 'sniper_mks_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'exe', branchLabel: 'EXECUTIONER', branchTagSuffix: 'executioner',
    cards: [
      { shortName: 'EXECUTE', description: 'OVERWATCH deals triple damage to enemies below 25% HP.',
        apply: (s) => { addEffect(s, T, 'sniper_exe_key'); addEffect(s, T, 'execute'); } },
      { shortName: 'DEADEYE', description: 'Execute threshold raises to 35% HP.',
        apply: (s) => { addEffect(s, T, 'deadeye'); } },
      { shortName: 'ONE SHOT', description: 'OVERWATCH crits against marked enemies kill non-bosses below 40% HP.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'oneshot'); } },
      { shortName: 'APEX PREDATOR', description: 'ONE SHOT threshold raises to 50% HP.',
        apply: (s) => { addEffect(s, T, 'apex_predator'); } },
      { shortName: 'RAPID SCAN', description: 'Each OVERWATCH kill reduces next shot cooldown by 0.8s.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'rapidfire'); } },
      { shortName: 'EXECUTIONER\'S MARK', description: 'Execute threshold raises to 50% HP.',
        apply: (s) => { addEffect(s, T, 'sniper_exe_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'spt', branchLabel: 'SPOTTER', branchTagSuffix: 'spotter',
    cards: [
      { shortName: 'THERMAL SCOPE', description: 'OVERWATCH reveals stealth enemies in full range — permanently visible.',
        apply: (s) => { addEffect(s, T, 'sniper_spt_key'); addEffect(s, T, 'reveal'); } },
      { shortName: 'SPOTTER PROTOCOL', description: 'Reveals + marks stealth enemies for 1.5s on reveal.',
        apply: (s) => { addEffect(s, T, 'spotter_mark'); } },
      { shortName: 'WIDE SCOPE', description: 'OVERWATCH +0.8 range.', rarity: 'rare',
        apply: (s) => { bumpRange(s, T, 0.8); addEffect(s, T, 'sniper_spt_wide'); } },
      { shortName: 'TEAM CALLOUT', description: 'OVERWATCH callouts also reveal hidden enemies in range.',
        apply: (s) => { addEffect(s, T, 'sniper_spt_team'); } },
      { shortName: 'TACTICAL SCAN', description: 'OVERWATCH +15% damage and reveals refresh every 5s.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.15); addEffect(s, T, 'sniper_spt_tac'); } },
      { shortName: 'ECHO MARK', description: 'Revealed enemies take +30% from ALL towers.',
        apply: (s) => { addEffect(s, T, 'sniper_spt_caps'); } },
    ],
  });
}

// ===== DISRUPTOR (scrambler) =====
{
  const T = 'scrambler' as TowerId;
  const TL = 'DISRUPTOR';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'dec', branchLabel: 'DECRYPT', branchTagSuffix: 'decrypt',
    cards: [
      { shortName: 'DEEP SCAN', description: 'DISRUPTOR strips 6 armor per hit instead of 3.',
        apply: (s) => { addEffect(s, T, 'scrambler_dec_key'); addEffect(s, T, 'deep_scan'); } },
      { shortName: 'DEEP HACK', description: 'DISRUPTOR strips +2 additional armor per hit.',
        apply: (s) => { addEffect(s, T, 'deep_hack'); } },
      { shortName: 'BROADCAST', description: 'DISRUPTOR pulses apply armor strip to ALL enemies in range.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'broadcast'); } },
      { shortName: 'NULL FIELD', description: 'BROADCAST pulse also slows all hit enemies 20% for 1.5s.',
        apply: (s) => { addEffect(s, T, 'null_field'); } },
      { shortName: 'DECRYPT TUNE', description: 'DISRUPTOR +0.4 range, +20% fire rate.', rarity: 'rare',
        apply: (s) => { bumpRange(s, T, 0.4); bumpRate(s, T, 0.2); addEffect(s, T, 'scrambler_dec_tune'); } },
      { shortName: 'TOTAL DECRYPT', description: 'DISRUPTOR strips 12 armor per hit.',
        apply: (s) => { addEffect(s, T, 'scrambler_dec_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'sab', branchLabel: 'SABOTAGE', branchTagSuffix: 'sabotage',
    cards: [
      { shortName: 'CRIPPLE', description: 'Debuffed enemies move 30% slower for the debuff duration.',
        apply: (s) => { addEffect(s, T, 'scrambler_sab_key'); addEffect(s, T, 'cripple'); } },
      { shortName: 'SIGNAL FEEDBACK', description: 'DISRUPTOR +0.5 fire rate per debuffed enemy in range.',
        apply: (s) => { addEffect(s, T, 'feedback'); } },
      { shortName: 'EXPLOIT CHAIN', description: 'Consecutive hits stack +8% damage (max +40%).', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'exploit_chain'); } },
      { shortName: 'SIGNAL BREAK', description: 'Hits slow armor-stripped enemies 20% for 1.5s.',
        apply: (s) => { addEffect(s, T, 'signal_break'); } },
      { shortName: 'SABOTAGE TUNE', description: 'DISRUPTOR +20% damage.', rarity: 'rare',
        apply: (s) => { bumpDmg(s, T, 0.2); addEffect(s, T, 'scrambler_sab_tune'); } },
      { shortName: 'TOTAL SABOTAGE', description: 'Debuffed enemies take 2× damage from all sources.',
        apply: (s) => { addEffect(s, T, 'scrambler_sab_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'crs', branchLabel: 'CRASH', branchTagSuffix: 'crash',
    cards: [
      { shortName: 'OVERWRITE', description: '20% chance each hit completely nullifies target armor for 2.5s.',
        apply: (s) => { addEffect(s, T, 'scrambler_crs_key'); addEffect(s, T, 'overwrite'); } },
      { shortName: 'SYSTEM CRASH', description: 'OVERWRITE-nullified enemies become marked for +40% from all sources.',
        apply: (s) => { addEffect(s, T, 'system_crash'); } },
      { shortName: 'OVERWRITE BOOST', description: 'OVERWRITE proc chance raised to 35%.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'scrambler_crs_boost'); } },
      { shortName: 'CRASH RANGE', description: 'DISRUPTOR +0.6 range.',
        apply: (s) => { bumpRange(s, T, 0.6); addEffect(s, T, 'scrambler_crs_range'); } },
      { shortName: 'CASCADE FAILURE', description: 'OVERWRITE-nullified enemies emit a small EMP burst.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'scrambler_crs_cascade'); } },
      { shortName: 'KERNEL PANIC', description: 'Every 5th DISRUPTOR hit fully nullifies the target (0 armor, 50% slow, 3s).',
        apply: (s) => { addEffect(s, T, 'scrambler_crs_caps'); } },
    ],
  });
}

// ===== SENTINEL =====
{
  const T = 'sentinel' as TowerId;
  const TL = 'SENTINEL';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'fld', branchLabel: 'FIELD', branchTagSuffix: 'field',
    cards: [
      { shortName: 'REINFORCED FIELD', description: 'SENTINEL field damage increases to 20 per second.',
        apply: (s) => { addEffect(s, T, 'sentinel_fld_key'); addEffect(s, T, 'reinforced'); } },
      { shortName: 'EXPANDED GRID', description: 'SENTINEL range increases by 0.8 cells.',
        apply: (s) => { addEffect(s, T, 'expanded'); } },
      { shortName: 'OVERCLOCKED FIELD', description: 'SENTINEL field damage +8 dps.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'overclocked'); } },
      { shortName: 'NODE BROADCAST', description: 'SENTINEL range +0.5 more cells.',
        apply: (s) => { addEffect(s, T, 'node_broadcast'); } },
      { shortName: 'TRAUMA PROTOCOL', description: 'Enemies inside field take +20% from all sources.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'trauma_protocol'); } },
      { shortName: 'INCANDESCENT FIELD', description: 'SENTINEL field damage to 40 dps base.',
        apply: (s) => { addEffect(s, T, 'sentinel_fld_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'thr', branchLabel: 'THORNS', branchTagSuffix: 'thorns',
    cards: [
      { shortName: 'THORN PROTOCOL', description: 'Enemies attacking towers take 2× damage retaliation.',
        apply: (s) => { addEffect(s, T, 'sentinel_thr_key'); addEffect(s, T, 'thorns'); } },
      { shortName: 'ANCHOR FIELD', description: 'SENTINEL slow increases to 45% and affects slow-immune at 20%.',
        apply: (s) => { addEffect(s, T, 'anchor'); } },
      { shortName: 'TOTAL SUPPRESSION', description: 'Slow-immune enemies are now affected at 35%.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'total_suppression'); } },
      { shortName: 'SHIELD WALL', description: 'SENTINEL +0.4 range and trauma marks last 0.5s longer.',
        apply: (s) => { bumpRange(s, T, 0.4); addEffect(s, T, 'sentinel_thr_shield'); } },
      { shortName: 'BARBED FIELD', description: 'Field DPS +6 dps and reflects 10% damage automatically.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'sentinel_thr_barbed'); } },
      { shortName: 'RETALIATION FIELD', description: 'Enemies in field reflect 30% damage taken back to themselves.',
        apply: (s) => { addEffect(s, T, 'sentinel_thr_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'plz', branchLabel: 'PULSE SURGE', branchTagSuffix: 'pulse',
    cards: [
      { shortName: 'PULSE LINK', description: 'Every 5s SENTINEL emits a pulse marking all enemies in range for 2s.',
        apply: (s) => { addEffect(s, T, 'sentinel_plz_key'); addEffect(s, T, 'pulse_link'); } },
      { shortName: 'SURGE EVENT', description: 'Every 5s, field surges to 5× damage for 0.5s.',
        apply: (s) => { addEffect(s, T, 'surge_event'); } },
      { shortName: 'CHARGED PULSE', description: 'PULSE LINK fires every 3s instead of 5s.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'sentinel_plz_charged'); } },
      { shortName: 'WIDE PULSE', description: 'SENTINEL +0.5 range.',
        apply: (s) => { bumpRange(s, T, 0.5); addEffect(s, T, 'sentinel_plz_wide'); } },
      { shortName: 'PULSE STORM', description: 'PULSE LINK marks last 4s instead of 2s.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'sentinel_plz_storm'); } },
      { shortName: 'MEGA SURGE', description: 'Surge events do 10× damage instead of 5×, every 4s.',
        apply: (s) => { addEffect(s, T, 'sentinel_plz_caps'); } },
    ],
  });
}

// ===== BOOSTER NODE =====
{
  const T = 'booster_node' as TowerId;
  const TL = 'BOOSTER';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'amp', branchLabel: 'AMPLIFIER', branchTagSuffix: 'amplifier',
    cards: [
      { shortName: 'AMPLIFIER', description: 'BOOSTER NODE aura range +0.5 cells.',
        apply: (s) => { addEffect(s, T, 'booster_amp_key'); addEffect(s, T, 'amplify'); } },
      { shortName: 'OVERCHARGE', description: 'Stronger aura: +35% damage / +25% fire rate.',
        apply: (s) => { addEffect(s, T, 'overcharge'); } },
      { shortName: 'FOCUS BEAM', description: 'BOOSTER aura targets ALL turrets regardless of distance.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'focus_beam'); } },
      { shortName: 'AMPLIFIER TUNE', description: 'All towers gain +5% damage globally.',
        apply: (s) => { s.mods.globalDamagePct += 0.05; addEffect(s, T, 'booster_amp_tune'); } },
      { shortName: 'WIDE BAND', description: 'Aura range +0.8 more cells.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'booster_amp_wide'); } },
      { shortName: 'GLOBAL AURA', description: 'BOOSTER aura covers the whole map (auto-includes FOCUS BEAM).',
        apply: (s) => { addEffect(s, T, 'focus_beam'); addEffect(s, T, 'booster_amp_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'res', branchLabel: 'RESONATOR', branchTagSuffix: 'resonator',
    cards: [
      { shortName: 'RESONANCE', description: 'BOOSTER counts as 2 unique types in subnet diversity calculations.',
        apply: (s) => { addEffect(s, T, 'booster_res_key'); addEffect(s, T, 'resonance'); } },
      { shortName: 'DUAL WAVE', description: 'Buffed turrets gain +10% crit chance from aura.',
        apply: (s) => { addEffect(s, T, 'dual_wave'); s.mods.globalCritChance += 0.10; } },
      { shortName: 'SUBNET HARMONICS', description: 'All subnet bonuses are 25% stronger.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'booster_res_harm'); } },
      { shortName: 'AURA RESONANCE', description: 'BOOSTER aura range +0.4 cells.',
        apply: (s) => { addEffect(s, T, 'booster_res_aura'); } },
      { shortName: 'CHANNELED ENERGY', description: 'All towers gain +8% damage globally.', rarity: 'rare',
        apply: (s) => { s.mods.globalDamagePct += 0.08; addEffect(s, T, 'booster_res_channel'); } },
      { shortName: 'NETLINK MASTER', description: 'Activates ALL subnet-pair synergies — pair towers don\'t need adjacency.',
        apply: (s) => { addEffect(s, T, 'booster_res_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'crt', branchLabel: 'CRITICAL', branchTagSuffix: 'critical',
    cards: [
      { shortName: 'CRITICAL AURA', description: 'Adjacent turrets gain +5% crit chance.',
        apply: (s) => { addEffect(s, T, 'booster_crt_key'); addEffect(s, T, 'booster_crt_aura'); s.mods.globalCritChance += 0.05; } },
      { shortName: 'CRIT AMPLIFIER', description: 'All towers gain +5% crit chance.',
        apply: (s) => { s.mods.globalCritChance += 0.05; addEffect(s, T, 'booster_crt_amp'); } },
      { shortName: 'PRECISION FIELD', description: 'All towers gain +6% damage.', rarity: 'rare',
        apply: (s) => { s.mods.globalDamagePct += 0.06; addEffect(s, T, 'booster_crt_prec'); } },
      { shortName: 'BURST AURA', description: 'All towers gain +6% fire rate.',
        apply: (s) => { s.mods.globalRatePct += 0.06; addEffect(s, T, 'booster_crt_burst'); } },
      { shortName: 'EAGLE EYE', description: 'All towers gain +5% range.', rarity: 'rare',
        apply: (s) => { s.mods.globalRangePct += 0.05; addEffect(s, T, 'booster_crt_eye'); } },
      { shortName: 'CRITICAL OVERLOAD', description: '+20% crit chance aura applied globally.',
        apply: (s) => { s.mods.globalCritChance += 0.20; addEffect(s, T, 'booster_crt_caps'); } },
    ],
  });
}

// ===== DATA MINER =====
{
  const T = 'data_miner' as TowerId;
  const TL = 'DATA MINER';
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'thr', branchLabel: 'THROUGHPUT', branchTagSuffix: 'throughput',
    cards: [
      { shortName: 'HIGH THROUGHPUT', description: 'DATA MINER XP rate increases to 1 per second.',
        apply: (s) => { addEffect(s, T, 'dataminer_thr_key'); addEffect(s, T, 'throughput'); } },
      { shortName: 'COMPRESSION', description: 'All enemy kills grant +20% bonus XP.',
        apply: (s) => { addEffect(s, T, 'compress'); s.mods.xpMult *= 1.2; } },
      { shortName: 'UPLINK', description: 'DATA MINER XP rate ×1.5 during waves.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'uplink'); } },
      { shortName: 'RECURSIVE LEARNING', description: 'DATA MINER XP rate increases to 2 per second.',
        apply: (s) => { addEffect(s, T, 'recursive'); } },
      { shortName: 'XP AMPLIFIER', description: 'All XP gains +15%.', rarity: 'rare',
        apply: (s) => { s.mods.xpMult *= 1.15; addEffect(s, T, 'dataminer_thr_amp'); } },
      { shortName: 'OVERCLOCKED MINE', description: 'DATA MINER XP rate floors at 2.5/s (3/s hard cap with UPLINK).',
        apply: (s) => { addEffect(s, T, 'dataminer_thr_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'eco', branchLabel: 'ECONOMY', branchTagSuffix: 'economy',
    cards: [
      { shortName: 'PROTOCOL EXTRACTOR', description: 'DATA MINER extracts +1 PROTOCOL per wave cleared.',
        apply: (s) => { addEffect(s, T, 'dataminer_eco_key'); addEffect(s, T, 'protocol_mine'); } },
      { shortName: 'AUDIT', description: 'All XP gains +10%.',
        apply: (s) => { s.mods.xpMult *= 1.1; addEffect(s, T, 'dataminer_eco_audit'); } },
      { shortName: 'BANDWIDTH', description: 'All XP gains +20%.', rarity: 'rare',
        apply: (s) => { s.mods.xpMult *= 1.2; addEffect(s, T, 'dataminer_eco_bw'); } },
      { shortName: 'PROTOCOL OVERCLOCK', description: 'DATA MINER extracts +2 PROTOCOLS per wave.',
        apply: (s) => { addEffect(s, T, 'dataminer_eco_over'); } },
      { shortName: 'BOSS HARVEST', description: 'Boss kills grant +5 protocols.', rarity: 'rare',
        apply: (s) => { s.mods.bossProtocolBonus = (s.mods.bossProtocolBonus ?? 0) + 5; addEffect(s, T, 'dataminer_eco_boss'); } },
      { shortName: 'PROTOCOL FLOOD', description: '+50% protocols earned this run (applied at end).',
        apply: (s) => { addEffect(s, T, 'dataminer_eco_caps'); } },
    ],
  });
  BRANCH_SPECS.push({
    tower: T, towerLabel: TL, branchKey: 'mta', branchLabel: 'META', branchTagSuffix: 'meta',
    cards: [
      { shortName: 'META LEARNING', description: 'All towers gain +2% damage per placed turret.',
        apply: (s) => { addEffect(s, T, 'dataminer_mta_key'); addEffect(s, T, 'dataminer_mta_learn'); } },
      { shortName: 'META RATE', description: 'All towers gain +2% fire rate per placed turret.',
        apply: (s) => { addEffect(s, T, 'dataminer_mta_rate'); } },
      { shortName: 'META RANGE', description: 'All towers gain +1% range per placed turret.', rarity: 'rare',
        apply: (s) => { addEffect(s, T, 'dataminer_mta_range'); } },
      { shortName: 'META BUFF', description: 'Global +5% damage flat.',
        apply: (s) => { s.mods.globalDamagePct += 0.05; addEffect(s, T, 'dataminer_mta_buff'); } },
      { shortName: 'META CRIT', description: 'Global +5% crit chance.', rarity: 'rare',
        apply: (s) => { s.mods.globalCritChance += 0.05; addEffect(s, T, 'dataminer_mta_crit'); } },
      { shortName: 'OMNISCIENCE', description: 'All META bonuses double.',
        apply: (s) => { addEffect(s, T, 'dataminer_mta_caps'); } },
    ],
  });
}

// Build all branch cards
function buildAllBranches(): CardDef[] {
  const out: CardDef[] = [];
  // group specs by tower for excludes precomputation
  const byTower: Map<TowerId, BranchSpec[]> = new Map();
  for (const sp of BRANCH_SPECS) {
    if (!byTower.has(sp.tower)) byTower.set(sp.tower, []);
    byTower.get(sp.tower)!.push(sp);
  }
  for (const [tower, specs] of byTower) {
    // Determine the id-prefix used in keystone IDs (booster_node uses 'booster', data_miner uses 'dataminer')
    let prefix: string = tower as string;
    if (tower === 'booster_node') prefix = 'booster';
    if (tower === 'data_miner') prefix = 'dataminer';
    for (const sp of specs) {
      const others = specs
        .filter((o) => o.branchKey !== sp.branchKey)
        .map((o) => `${prefix}_${o.branchKey}_key`);
      // Patch the id-prefix on the spec's branch tower id (keystone id uses prefix)
      const patched: BranchSpec = { ...sp, tower: tower };
      const cards = buildBranch(patched, others);
      // Re-write IDs to use the proper prefix (since buildBranch uses tower as-is)
      for (const c of cards) {
        c.id = c.id.replace(new RegExp(`^${tower}_`), `${prefix}_`);
        if (c.requires) c.requires = c.requires.map((r) => r.replace(new RegExp(`^${tower}_`), `${prefix}_`));
        if (c.excludes) c.excludes = c.excludes.map((e) => e.replace(new RegExp(`^${tower}_`), `${prefix}_`));
      }
      out.push(...cards);
    }
  }
  return out;
}

const BRANCH_CARDS: CardDef[] = buildAllBranches();

// ==================== EXISTING SYNERGY CARDS (kept — referenced by maps.ts rewards) ====================

const LEGACY_SYNERGY: CardDef[] = [
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

// ==================== NEW NETLINK SUBNET-PAIR SYNERGY CARDS (8) ====================
//
// These activate at runtime via hasSubnetLink(s, A, B). Engine checks each tag in
// the relevant tower's hit/burst loop and only applies the bonus when both towers
// are placed AND share a connected subnet component.

const NETLINKS: CardDef[] = [
  {
    id: 'netlink_fw_hp', name: 'NETLINK: NODE SLOW', rarity: 'rare', category: 'upgrade',
    towerHint: 'firewall', towerHint2: 'honeypot',
    description: '[NETLINK FIREWALL+HONEYPOT, must subnet-link] FIREWALL shots inherit 20% slow for 1.2s.',
    apply: (s) => {
      addEffect(s, 'firewall', 'netlink_firewall_honeypot');
      addEffect(s, 'honeypot', 'netlink_firewall_honeypot');
    },
  },
  {
    id: 'netlink_av_qm', name: 'NETLINK: PRECISION NET', rarity: 'rare', category: 'upgrade',
    towerHint: 'antivirus', towerHint2: 'quantum',
    description: '[NETLINK ANTIVIRUS+QUANTUM, must subnet-link] ANTIVIRUS gains +15% crit chance.',
    apply: (s) => {
      addEffect(s, 'antivirus', 'netlink_antivirus_quantum');
      addEffect(s, 'quantum', 'netlink_antivirus_quantum');
    },
  },
  {
    id: 'netlink_ch_se', name: 'NETLINK: CHAIN FIELD', rarity: 'rare', category: 'upgrade',
    towerHint: 'chain', towerHint2: 'sentinel',
    description: '[NETLINK CHAIN+SENTINEL, must subnet-link] CHAIN arcs deal +20% damage to enemies in SENTINEL field.',
    apply: (s) => {
      addEffect(s, 'chain', 'netlink_chain_sentinel');
      addEffect(s, 'sentinel', 'netlink_chain_sentinel');
    },
  },
  {
    id: 'netlink_ic_sc', name: 'NETLINK: CRYO DECRYPT', rarity: 'rare', category: 'upgrade',
    towerHint: 'ice', towerHint2: 'scrambler',
    description: '[NETLINK ICE+DISRUPTOR, must subnet-link] ICE explosions strip 2 armor from enemies hit.',
    apply: (s) => {
      addEffect(s, 'ice', 'netlink_ice_scrambler');
      addEffect(s, 'scrambler', 'netlink_ice_scrambler');
    },
  },
  {
    id: 'netlink_rl_sn', name: 'NETLINK: RAIL SIGHT', rarity: 'rare', category: 'upgrade',
    towerHint: 'railgun', towerHint2: 'sniper',
    description: '[NETLINK RAILGUN+OVERWATCH, must subnet-link] RAILGUN crits refund 30% of cooldown.',
    apply: (s) => {
      addEffect(s, 'railgun', 'netlink_railgun_sniper');
      addEffect(s, 'sniper', 'netlink_railgun_sniper');
    },
  },
  {
    id: 'netlink_ps_bn', name: 'NETLINK: RESONANT BURST', rarity: 'rare', category: 'upgrade',
    towerHint: 'pulse', towerHint2: 'booster_node',
    description: '[NETLINK EMP+BOOSTER, must subnet-link] PULSE bursts proc twice per cycle.',
    apply: (s) => {
      addEffect(s, 'pulse', 'netlink_pulse_booster_node');
      addEffect(s, 'booster_node', 'netlink_pulse_booster_node');
    },
  },
  {
    id: 'netlink_mn_hp', name: 'NETLINK: NAPALM STRIKE', rarity: 'rare', category: 'upgrade',
    towerHint: 'mine', towerHint2: 'honeypot',
    description: '[NETLINK ARTILLERY+HONEYPOT, must subnet-link] Artillery impacts in honeypot puddles burn 15 dps for 3s.',
    apply: (s) => {
      addEffect(s, 'mine', 'netlink_mine_honeypot');
      addEffect(s, 'honeypot', 'netlink_mine_honeypot');
    },
  },
  {
    id: 'netlink_qm_dm', name: 'NETLINK: QUANTUM MINING', rarity: 'rare', category: 'upgrade',
    towerHint: 'quantum', towerHint2: 'data_miner',
    description: '[NETLINK QUANTUM+DATA MINER, must subnet-link] QUANTUM crits generate +3 XP.',
    apply: (s) => {
      addEffect(s, 'quantum', 'netlink_quantum_data_miner');
      addEffect(s, 'data_miner', 'netlink_quantum_data_miner');
    },
  },
];

// ==================== UPGRADE ARRAY (assembled) ====================

const UPGRADE: CardDef[] = [
  ...BRANCH_CARDS,
  ...LEGACY_SYNERGY,
  ...NETLINKS,
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

// Fresh-save unlocks. Three starter towers (firewall + honeypot + antivirus) plus
// their common/rare upgrades — every other tower and its upgrade cards are earned
// through map clears (see maps.ts rewards and finishRun() which auto-unlocks a tower's
// common/rare upgrades on unlock).
export const STARTING_UNLOCKED_CARDS = [
  'deploy_firewall',
  'deploy_honeypot',
  'deploy_antivirus',
  // Common/rare branch upgrades for the three starter towers (no synergies — those are earned later)
  ...UPGRADE.filter((c) =>
    (c.rarity === 'common' || c.rarity === 'rare') &&
    !c.towerHint2 &&
    (c.towerHint === 'firewall' || c.towerHint === 'honeypot' || c.towerHint === 'antivirus')
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
  // Tower IDs the player currently holds a deploy token for. Singleton rule makes
  // a second deploy token for the same tower useless, so we filter those cards
  // out of the draft pool (fixes the 'draft offers deploy_firewall on wave 1'
  // bug players hit with the NEURAL BOOSTER starting-level perk).
  tokensHeld?: Set<TowerId>;
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
    // Deploy cards filtered out for already-placed singleton tower types,
    // OR when the player already holds a deploy token for that tower (the
    // singleton rule means a second token is wasted — e.g. the first draft
    // shouldn't offer deploy_firewall because every run starts with one).
    if (c.category === 'deploy' && c.towerHint) {
      if (context.placedTowerTypes.has(c.towerHint)) return false;
      if (context.tokensHeld?.has(c.towerHint)) return false;
    }
    // Non-deploy cards already picked this run are excluded (no duplicates)
    if (c.category !== 'deploy' && pickedIds.includes(c.id)) return false;
    // Cards with requires: all prerequisite card IDs must already be picked
    if (c.requires && !c.requires.every(r => pickedIds.includes(r))) return false;
    // Cards with excludes: any picked card in the excludes list locks this one out
    // (branch commitment — once you take SUPPRESSION keystone, BURST/SIEGE cards vanish)
    if (c.excludes && c.excludes.some(x => pickedIds.includes(x))) return false;
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
