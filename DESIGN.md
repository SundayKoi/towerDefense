# NETRUNNER — DESIGN BLUEPRINT

Canonical reference for turret stats, enemy stats, subnet math, upgrade branches, and sector/reward progression. Every balance decision should trace back to this document.

Legend
- **DMG** = base damage, **RNG** = tiles, **RATE** = shots/sec, **AOE** = tile radius
- **SUB** = subnet eligible (all turrets are, currently)
- Subnet formula: `mult = min(1.6, 1 + 0.08·(size−1) + 0.12·(uniqueTypes−1))`

---

## 1. TURRETS

### 1.1 Attack turrets

| Tower | DMG | RNG | RATE | DPS | Type | Special |
|---|---|---|---|---|---|---|
| FIREWALL | 14 | 2.4 | 1.30 | 18.2 | kinetic | cheap kinetic frontline |
| HONEYPOT | 4 | 2.0 | 1.80 | 7.2 | energy | 45% slow 1.8s + drops puddles on hit |
| ANTIVIRUS | 60 | 3.8 | 0.55 | 33.0 | pierce | fires 2 projectiles (3 with TRIPLE) |
| QUANTUM | 24 | 2.8 | 1.40 | 33.6 | energy | 35% crit @ 3.5× |
| ICE-BREAKER | 40 | 2.6 | 0.85 | 34.0 | aoe | AoE r=1.1, 35% slow 1.0s |
| ARTILLERY | 60 | 5.5 | 0.55 | 33.0 | aoe | long-range AoE r=1.6 |
| CHAIN | 30 | 2.8 | 1.00 | 30.0 | chain | 3 jumps, 80% falloff |
| RAILGUN | 140 | 4.5 | 0.45 | 63.0 | pierce | pierces every enemy in path |
| EMP ARRAY | 18 | 3.0 | — | — | energy | radial burst every 2.5s |
| OVERWATCH | 85 | 5.8 | 0.40 | 34.0 | pierce | 40% crit @ 4× |
| DISRUPTOR | 8 | 2.8 | 1.50 | 12.0 | energy | strips 3 armor/hit |

### 1.2 Support turrets

| Tower | Role | Effect |
|---|---|---|
| SENTINEL | passive field | 12 dps + 20% slow, radius=tower range |
| BOOSTER NODE | aura buff | +25% damage / +15% rate within 1.5 cells |
| DATA MINER | XP generator | 0.33 XP/sec base, wave-only, capped at 3/s with upgrades |

---

## 2. ENEMIES

| ID | Name | Threat | HP | SPD | DMG | XP | Armor | Flags | Resistances |
|---|---|---|---|---|---|---|---|---|---|
| worm | BITCRAWLER | LOW | 12 | 1.0 | 1 | 3 | — | — | — |
| spider | CRAWLER | LOW | 16 | 1.2 | 1 | 4 | — | — | — |
| trojan | TROJAN | MEDIUM | 55 | 0.8 | 2 | 8 | 4 | — | pierce 0.7 |
| rootkit | ROOTKIT | MEDIUM | 42 | 1.0 | 2 | 7 | — | infects towers every 4s | chain 0.6 |
| phantom | PHANTOM | HIGH | 35 | 1.4 | 3 | 10 | — | invisChance 0.3 | crit ignores resist |
| wraith | WRAITH | HIGH | 65 | 1.3 | 3 | 12 | 2 | invisChance 0.2 | energy 0.5 |
| leech | LEECH | MEDIUM | 80 | 0.9 | 2 | 10 | — | — | kinetic 0.6 |
| bomber | BOMBER | HIGH | 45 | 1.1 | 4 | 11 | — | — | aoe 0.4 |
| stealth | STEALTH | HIGH | 50 | 1.5 | 2 | 11 | — | invisChance 0.5 | — |
| kernel | KERNEL (boss) | BOSS | — | 0.6 | 5 | 25 | 8 | bossScale | pierce 0.8 |
| daemon | DAEMON (boss) | BOSS | — | 0.9 | 6 | 30 | 6 | bossScale | energy 0.7 |
| leviathan | LEVIATHAN (boss) | MEGA | — | 0.5 | 10 | 60 | 12 | bossScale, slowImmune | aoe 0.5, kinetic 0.6 |
| voidlord | VOIDLORD (boss) | MEGA | — | 0.8 | 12 | 80 | 10 | bossScale, slowImmune | chain 0.3, energy 0.5 |
| swarm | SWARM (boss) | BOSS | — | 1.3 | 4 | 35 | — | bossScale | aoe 0.4 |
| corruptor | CORRUPTOR (final) | FINAL | — | 0.7 | 15 | 100 | 14 | bossScale, slowImmune | pierce 0.5, energy 0.5, chain 0.4 |
| glitch | GLITCH | HIGH | 30 | 1.6 | 3 | 12 | — | splits into 2 worms on death | — |
| juggernaut | JUGGERNAUT | EXTREME | 180 | 0.55 | 6 | 35 | 10 | — | kinetic 0.5, chain 0.5 |
| parasite | PARASITE | MEDIUM | 14 | 1.7 | 0 | 6 | — | attaches to nearest tower, infects | — |

### 2.1 Counter matrix

| Counter this | With |
|---|---|
| Armor (trojan/juggernaut/bosses) | DISRUPTOR (strip) / QUANTUM (phase) / ANTIVIRUS (pierce) |
| Invisibility (phantom/stealth) | OVERWATCH (reveal) / SENTINEL (field damages regardless of stealth) |
| Slow-immune bosses | ICE-BREAKER (freeze via `freeze` card) / SENTINEL (anchor hits them) |
| Swarm waves (many weak) | PULSE (AoE) / CHAIN / ICE (wide) |
| High-HP single targets | RAILGUN / OVERWATCH execute / QUANTUM observer |
| Replicating waves (Sector 5) | kill-source absorbs: CHAIN, PULSE, CHAIN (jumps catch offspring) |
| Encrypted shields (Sector 3) | QUANTUM (burst) / RAILGUN / ANTIVIRUS triple |

---

## 3. SUBNET SYSTEM

Adjacent turrets (≤ 1 cell, includes diagonals) form a connected **subnet**. Each subnet member gets:

```
mult = min(1.6, 1 + 0.08·(size − 1) + 0.12·(uniqueTypes − 1))
```

**Examples**
- Solo: ×1.00
- 2 same-type: ×1.08
- 2 different: ×1.20
- 4 nodes / 4 unique: ×1.60 (cap)

### 3.1 Subnet-pair synergies (NEW — via cards)

Cards that activate only when specific tower pairs share a subnet. Tag format: `netlink_<pair>`. Requires both towers placed AND adjacent. See §4.

Planned pairs (picked for interesting mechanics):

| Pair | Effect |
|---|---|
| FIREWALL + HONEYPOT | FIREWALL shots inherit 20% slow on hit |
| ANTIVIRUS + QUANTUM | ANTIVIRUS shots gain +15% crit chance |
| CHAIN + SENTINEL | CHAIN arcs deal +20% damage to enemies in SENTINEL field |
| ICE + DISRUPTOR | ICE explosions strip 2 armor |
| RAILGUN + OVERWATCH | RAILGUN crits refund 30% of cooldown |
| PULSE + BOOSTER | PULSE bursts proc twice per cycle |
| ARTILLERY + HONEYPOT | Shells dropped in HONEYPOT puddles burn for 15 dps |
| QUANTUM + DATA MINER | QUANTUM crits generate +3 XP |

---

## 4. UPGRADE BRANCH SYSTEM (REWORK)

### 4.1 Mechanic

Each turret has **3 branches**. Each branch contains **6 cards**: 1 keystone + 4 branch cards + 1 capstone.

- **Keystone**: first card in a branch. Excludes the OTHER 2 keystones of the same tower.
- **Branch cards**: require the keystone of the branch; don't appear until you've committed.
- **Capstone**: require 3+ branch cards already picked from the same branch.

New `CardDef.excludes?: string[]` field. `drawDraft` filters cards whose `excludes` intersects `cardsPicked`.

Net effect: once you pick a keystone, the other branches vanish for that tower. You commit to a build.

### 4.2 Branch roster

Per-tower branches (keystone in bold):

**FIREWALL**
- **SUPPRESSION** — slow-focused: `fw_sup_keystone` unlocks, cards add slow/mark/CC. Capstone: 100% slow 0.4s on crit hit.
- **BURST** — rapid multi-shot: `fw_brst_keystone`, cards add triple/ricochet/spread. Capstone: every 4th shot is a 5-way burst.
- **SIEGE** — high single-target: `fw_siege_keystone`, cards add crit/armor-pierce. Capstone: shots deal 2× HP% damage to targets >75% HP.

**HONEYPOT**
- **VENOM** — DoT: `hp_ven_keystone`, acid stacks, toxic bloom. Capstone: puddles deal 25% max HP over their duration.
- **CONTAINMENT** — CC: `hp_con_keystone`, larger/longer puddles, coating. Capstone: enemies can't leave puddles for 2s.
- **VOLATILE** — explosive: `hp_vol_keystone`, detonation/chain-goo. Capstone: dead enemies ignite adjacent puddles for chain detonations.

**ANTIVIRUS**
- **MARK** — targeting: `av_mark_keystone`, lockdown/surgical. Capstone: marked enemies take +75% (was 30%).
- **VOLLEY** — multi-shot: `av_vol_keystone`, triple/burst-mode/scan. Capstone: fires 5 shots per volley.
- **PIERCE** — armor crush: `av_pierce_keystone`, deep scan/armor melt. Capstone: each hit cracks 5 armor permanently.

**QUANTUM**
- **SUPERPOSITION** — crit chance stacker: `qm_super_keystone`, double/resonance. Capstone: crit chance 85%.
- **COLLAPSE** — armor/debuff: `qm_col_keystone`, collapse/uncertainty. Capstone: crit armor reduction is permanent.
- **OBSERVER** — alpha strike: `qm_obs_keystone`, observer/antimatter. Capstone: max observer charge reaches ×8 crit.

**ICE-BREAKER**
- **BLIZZARD** — wide AoE: `ic_blz_keystone`, wide/shards. Capstone: explosions chain between enemies.
- **DEEP FREEZE** — hard CC: `ic_frz_keystone`, freeze/absolute-zero. Capstone: bosses can be frozen for 0.6s.
- **CRYO SHARD** — projectile emphasis: `ic_shr_keystone`, shards/permafrost. Capstone: every shot releases 8 shards.

**ARTILLERY**
- **BARRAGE** — cluster: `ar_brg_keystone`, cluster/frag-kit. Capstone: triple-shot volley.
- **DEMOLITION** — heavy shell: `ar_dem_keystone`, heavy/demolition. Capstone: shell damage +80%, rate -20%.
- **SCORCH** — lingering: `ar_scr_keystone`, nanobots/burn fields. Capstone: impacts leave 5s 30dps burn zones.

**CHAIN**
- **STORM** — range/jumps: `ch_strm_keystone`, storm/nova. Capstone: 12 jumps base.
- **VOLTAGE** — damage: `ch_vlt_keystone`, discharge/overcharge. Capstone: no falloff + +50% base.
- **GROUND FAULT** — CC: `ch_grd_keystone`, ground/feedback-loop. Capstone: every arc applies 0.8s stun.

**RAILGUN**
- **SABOT** — explosive pierce: `rl_sab_keystone`, sabot/splinter. Capstone: sabot radius 1.5.
- **HYPERSONIC** — rate: `rl_hyp_keystone`, hypersonic/kill-chain. Capstone: each kill refunds 1.5s cooldown.
- **CAPACITOR** — charge shots: `rl_cap_keystone`, capacitor/charged-mega. Capstone: mega shots every 4s instead of 8s.

**EMP ARRAY**
- **FREQUENCY** — rate: `ps_frq_keystone`, frequency/rapid. Capstone: burst every 0.8s.
- **OVERLOAD** — spike damage: `ps_ovl_keystone`, overload/shock. Capstone: every burst is an overload.
- **IONIC** — armor-ignore + CC: `ps_ion_keystone`, ionic/stun. Capstone: bursts also strip 4 armor permanently.

**OVERWATCH**
- **MARKSMAN** — mark+damage: `sn_mks_keystone`, callout/surgical. Capstone: marks last the whole run for hit enemies.
- **EXECUTIONER** — low-HP: `sn_exe_keystone`, execute/deadeye. Capstone: execute threshold 50% HP.
- **SPOTTER** — team utility: `sn_spt_keystone`, reveal/spotter. Capstone: revealed enemies take +30% from all towers.

**DISRUPTOR**
- **DECRYPT** — armor strip: `sc_dec_keystone`, deep-scan/broadcast. Capstone: strip 12 armor per hit.
- **SABOTAGE** — stacking debuff: `sc_sab_keystone`, cripple/corruption. Capstone: debuffed enemies take 2× from all sources.
- **CRASH** — nullify: `sc_crs_keystone`, overwrite/null-field. Capstone: every 5th hit fully nullifies target.

**SENTINEL**
- **FIELD** — damage/range: `se_fld_keystone`, reinforced/expanded. Capstone: 40 dps base.
- **THORNS** — retaliation: `se_thr_keystone`, thorns/anchor. Capstone: enemies in field reflect 30% damage back.
- **PULSE SURGE** — periodic spike: `se_plz_keystone`, pulse-link/surge-event. Capstone: 10× surge every 4s.

**BOOSTER NODE**
- **AMPLIFIER** — bigger aura: `bn_amp_keystone`, amplify/focus-beam. Capstone: aura covers whole map.
- **RESONATOR** — subnet combos: `bn_res_keystone`, resonance/dual-wave. Capstone: unlocks ALL subnet-pair synergies automatically.
- **CRITICAL** — crit amplify: `bn_crt_keystone`, crit-chance/crit-damage aura. Capstone: +20% crit chance aura.

**DATA MINER**
- **THROUGHPUT** — more XP: `dm_thr_keystone`, throughput/recursive. Capstone: 5 XP/s. [BALANCE CHECK]
- **ECONOMY** — protocols: `dm_eco_keystone`, protocol-mine/audit. Capstone: +50% protocols earned this run.
- **META** — stat buffs: `dm_mta_keystone`, run-long small buffs (+2% dmg/rate/range per placed turret).

---

## 5. META (SHOP)

### 5.1 Rebalanced items

Over-strong items to nerf/remove:

| Item | Current | New |
|---|---|---|
| NEURAL BOOSTER | +1 starting level × 5 | **REMOVED** — skipping early drafts breaks the branch commitment curve |
| PROTOCOL AUDIT | +5% XP × 10 = +50% | +3% XP × 5 = +15% max |
| DATA HARVEST | +1 protocol/wave × 5 | +1 protocol/wave × 3 |
| CARD BANDWIDTH | +1 draft option × 2 | kept, but cost raised |
| REROLL CACHE | +1 reroll × 4 | kept |
| HARDENED CORE | +15 HP × 5 | kept |
| ADAPTIVE WEAPONS | +2% dmg × 20 | kept |

### 5.2 DATA MINER balance

Current: 0.33/s base, cap 3/s. Still too strong because passive XP lets you coast. New:
- Base 0.33/s but **only ticks when enemies are alive** (no wave = no XP, consistent with current; but also no XP during wave if nothing on field)
- Remove RECURSIVE LEARNING from epic pool (it was the 2/s upgrade) — replace with a niche effect
- Uplink stays at ×1.5

---

## 6. ENEMY / WAVE VARIETY (DESIGN INTENT)

New wave modifiers (future sectors beyond current 6):

- **SHIELDWALL wave** — all spawns get +8 armor. Forces DISRUPTOR / QUANTUM phase / RAILGUN.
- **SPRINT wave** — all spawns +50% speed. Forces slow/freeze.
- **STEALTH wave** — all spawns invisChance 0.7. Forces OVERWATCH reveal / SENTINEL.
- **REGEN wave** — enemies regen 1% max HP/sec. Forces burst damage.
- **ELITE single-target wave** — one enemy, 50× HP. Forces RAILGUN / OVERWATCH execute.

Bosses with mechanics (future):
- Phase transitions at HP thresholds (75%, 50%, 25%)
- Immunity windows (boss is immune to one damage type for 5s, rotates)

---

## 7. CARD COUNT TARGETS (POST-REWORK)

| Category | Count |
|---|---|
| Deploy cards | 14 (one per tower) |
| Upgrade cards | ~252 (14 towers × 3 branches × 6 cards) |
| Subnet-pair synergy | 8 |
| Heals | 4 |
| Exotics | 5 |
| **Total** | **~283** |

---

## 8. EFFECT TAG CONVENTIONS

- Keystone tags: `<tower>_<branch>_key` (e.g. `firewall_suppression_key`)
- Branch tags: `<tower>_<branch>_<effect>` (e.g. `firewall_suppression_chill`)
- Capstone tags: `<tower>_<branch>_caps` (e.g. `firewall_suppression_caps`)
- Subnet-pair tags: `netlink_<towerA>_<towerB>` (e.g. `netlink_firewall_honeypot`)

Engine checks `hasEffect(s, tower, tag)` — unchanged.
Subnet-pair check helper: `hasSubnetLink(s, towerA, towerB)` returns true if both placed AND in same subnet.
