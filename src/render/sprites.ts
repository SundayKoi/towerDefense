// Per-entity SVG sprites. Rendered once to offscreen canvases at boot (or lazily), then drawn to main canvas.
// SVG lets us keep assets tiny but pixel-crisp at any zoom. Each sprite is drawn to an HTMLCanvasElement
// at 128px for caching; the renderer scales as needed.

import type { EnemyId, TowerId } from '@/types';

const SIZE = 128;

// ---------- TOWER SPRITES ----------
// Each returns an SVG string. The renderer adds rotation/animation on top.

const towerSVG: Record<TowerId, () => string> = {
  // FIREWALL — tactical turret: hex base, armored housing, dual barrels, cooling fins, glowing core
  firewall: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='fw-core' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#ffffff'/>
          <stop offset='0.3' stop-color='#8ffaff'/>
          <stop offset='0.7' stop-color='#00fff0'/>
          <stop offset='1' stop-color='#004a50'/>
        </radialGradient>
        <linearGradient id='fw-body' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#2a5a66'/>
          <stop offset='0.4' stop-color='#0f2a34'/>
          <stop offset='1' stop-color='#040d12'/>
        </linearGradient>
        <linearGradient id='fw-barrel' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0' stop-color='#3a6a78'/>
          <stop offset='0.5' stop-color='#0a1a20'/>
          <stop offset='1' stop-color='#1a3a44'/>
        </linearGradient>
        <filter id='fw-glow' x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur stdDeviation='2.5'/>
          <feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge>
        </filter>
      </defs>
      <!-- Base shadow -->
      <ellipse cx='64' cy='112' rx='42' ry='5' fill='#000' opacity='0.5'/>
      <!-- Hex base platform -->
      <polygon points='64,18 104,40 104,88 64,110 24,88 24,40' fill='#0a1820' stroke='#1a3a44' stroke-width='1.5'/>
      <polygon points='64,26 96,44 96,84 64,102 32,84 32,44' fill='url(#fw-body)' stroke='#2a5a66' stroke-width='1'/>
      <!-- Panel lines -->
      <g stroke='#0a3040' stroke-width='0.5' fill='none'>
        <line x1='64' y1='26' x2='64' y2='44'/>
        <line x1='64' y1='84' x2='64' y2='102'/>
        <line x1='32' y1='64' x2='42' y2='64'/>
        <line x1='86' y1='64' x2='96' y2='64'/>
      </g>
      <!-- Rivets -->
      <g>
        <circle cx='32' cy='44' r='1.8' fill='#0a1820' stroke='#00fff0' stroke-width='0.4'/>
        <circle cx='96' cy='44' r='1.8' fill='#0a1820' stroke='#00fff0' stroke-width='0.4'/>
        <circle cx='32' cy='84' r='1.8' fill='#0a1820' stroke='#00fff0' stroke-width='0.4'/>
        <circle cx='96' cy='84' r='1.8' fill='#0a1820' stroke='#00fff0' stroke-width='0.4'/>
      </g>
      <!-- Cooling fins (side) -->
      <g>
        <rect x='18' y='54' width='12' height='20' rx='1.5' fill='#0a1820' stroke='#2a5a66' stroke-width='0.5'/>
        <line x1='20' y1='58' x2='28' y2='58' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <line x1='20' y1='62' x2='28' y2='62' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <line x1='20' y1='66' x2='28' y2='66' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <line x1='20' y1='70' x2='28' y2='70' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <rect x='98' y='54' width='12' height='20' rx='1.5' fill='#0a1820' stroke='#2a5a66' stroke-width='0.5'/>
        <line x1='100' y1='58' x2='108' y2='58' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <line x1='100' y1='62' x2='108' y2='62' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <line x1='100' y1='66' x2='108' y2='66' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
        <line x1='100' y1='70' x2='108' y2='70' stroke='#00fff0' stroke-width='0.5' opacity='0.6'/>
      </g>
      <!-- Turret housing -->
      <circle cx='64' cy='64' r='24' fill='url(#fw-body)' stroke='#2a5a66' stroke-width='1.5'/>
      <circle cx='64' cy='64' r='20' fill='none' stroke='#0a3040' stroke-width='0.5'/>
      <!-- Dual forward barrels -->
      <rect x='57' y='12' width='5' height='38' rx='1' fill='url(#fw-barrel)' stroke='#0a1820' stroke-width='0.5'/>
      <rect x='66' y='12' width='5' height='38' rx='1' fill='url(#fw-barrel)' stroke='#0a1820' stroke-width='0.5'/>
      <!-- Barrel muzzle plates -->
      <rect x='55' y='10' width='9' height='4' fill='#0a1820' stroke='#2a5a66' stroke-width='0.5'/>
      <rect x='64' y='10' width='9' height='4' fill='#0a1820' stroke='#2a5a66' stroke-width='0.5'/>
      <!-- Muzzle glow -->
      <circle cx='59.5' cy='12' r='1.5' fill='#00fff0' filter='url(#fw-glow)'/>
      <circle cx='68.5' cy='12' r='1.5' fill='#00fff0' filter='url(#fw-glow)'/>
      <!-- Central core -->
      <circle cx='64' cy='64' r='14' fill='url(#fw-core)' filter='url(#fw-glow)'/>
      <circle cx='64' cy='64' r='7' fill='#fff' opacity='0.95'/>
      <circle cx='64' cy='64' r='3' fill='#00fff0'/>
      <!-- HUD dashed ring -->
      <circle cx='64' cy='64' r='18' fill='none' stroke='#00fff0' stroke-width='0.5' stroke-dasharray='2 2' opacity='0.6'/>
      <!-- Top sensor -->
      <circle cx='64' cy='50' r='2' fill='#ff2d95' filter='url(#fw-glow)'/>
    </svg>`,

  // HONEYPOT — golden hex hive with internal comb cells, orbiting indicators
  honeypot: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='hp-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#ffed66'/>
          <stop offset='0.4' stop-color='#ffae00'/>
          <stop offset='1' stop-color='#3d1f00'/>
        </radialGradient>
        <radialGradient id='hp-core' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#fff'/>
          <stop offset='0.4' stop-color='#ffd600'/>
          <stop offset='1' stop-color='#aa5c00'/>
        </radialGradient>
        <filter id='hp-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='112' rx='42' ry='4' fill='#000' opacity='0.5'/>
      <!-- Outer hex -->
      <polygon points='64,14 106,38 106,90 64,114 22,90 22,38' fill='#1a1000' stroke='#ffae00' stroke-width='1.5'/>
      <polygon points='64,22 98,42 98,86 64,106 30,86 30,42' fill='url(#hp-body)' stroke='#ffd600' stroke-width='1'/>
      <!-- Internal hex comb cells -->
      <g fill='#3d2500' stroke='#ffae00' stroke-width='0.5' opacity='0.8'>
        <polygon points='64,36 76,42 76,54 64,60 52,54 52,42'/>
        <polygon points='44,50 56,56 56,68 44,74 32,68 32,56'/>
        <polygon points='84,50 96,56 96,68 84,74 72,68 72,56'/>
        <polygon points='64,64 76,70 76,82 64,88 52,82 52,70'/>
      </g>
      <!-- Central cell glow -->
      <polygon points='64,52 74,58 74,70 64,76 54,70 54,58' fill='url(#hp-core)' filter='url(#hp-glow)'/>
      <!-- Orbital dots (indicators) -->
      <g filter='url(#hp-glow)'>
        <circle cx='64' cy='22' r='3' fill='#ffd600'/>
        <circle cx='98' cy='42' r='3' fill='#ffd600'/>
        <circle cx='98' cy='86' r='3' fill='#ffd600'/>
        <circle cx='64' cy='106' r='3' fill='#ffd600'/>
        <circle cx='30' cy='86' r='3' fill='#ffd600'/>
        <circle cx='30' cy='42' r='3' fill='#ffd600'/>
      </g>
      <!-- Inner ring -->
      <circle cx='64' cy='64' r='26' fill='none' stroke='#ffae00' stroke-width='0.5' stroke-dasharray='3 3' opacity='0.5'/>
    </svg>`,

  // ANTIVIRUS — sniper rifle with scope, tripod, laser sight
  antivirus: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='av-barrel' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0' stop-color='#6d1040'/>
          <stop offset='0.5' stop-color='#2a0015'/>
          <stop offset='1' stop-color='#4d0028'/>
        </linearGradient>
        <radialGradient id='av-body' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#6d1040'/>
          <stop offset='1' stop-color='#1a000a'/>
        </radialGradient>
        <filter id='av-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='114' rx='42' ry='5' fill='#000' opacity='0.5'/>
      <!-- Tripod base legs -->
      <g stroke='#4d0028' stroke-width='3' stroke-linecap='round'>
        <line x1='30' y1='106' x2='55' y2='86'/>
        <line x1='98' y1='106' x2='73' y2='86'/>
        <line x1='64' y1='112' x2='64' y2='86'/>
      </g>
      <g fill='#1a000a' stroke='#ff2d95' stroke-width='1'>
        <circle cx='30' cy='106' r='4'/>
        <circle cx='98' cy='106' r='4'/>
        <circle cx='64' cy='112' r='4'/>
      </g>
      <!-- Main body (pivot platform) -->
      <circle cx='64' cy='78' r='16' fill='url(#av-body)' stroke='#ff2d95' stroke-width='1.5'/>
      <circle cx='64' cy='78' r='10' fill='none' stroke='#ff2d95' stroke-width='0.5' opacity='0.6'/>
      <!-- Rifle stock -->
      <rect x='56' y='60' width='16' height='20' rx='2' fill='#2a0015' stroke='#ff2d95' stroke-width='1'/>
      <!-- Scope on top -->
      <rect x='55' y='38' width='18' height='12' rx='2' fill='#1a000a' stroke='#ff2d95' stroke-width='1'/>
      <circle cx='64' cy='44' r='4' fill='#ff2d95' filter='url(#av-glow)'/>
      <circle cx='64' cy='44' r='2' fill='#fff'/>
      <!-- Scope mount -->
      <rect x='60' y='50' width='8' height='10' fill='#2a0015' stroke='#ff2d95' stroke-width='0.5'/>
      <!-- Barrel (long) -->
      <rect x='60' y='8' width='8' height='34' fill='url(#av-barrel)' stroke='#1a000a' stroke-width='0.5'/>
      <!-- Barrel reinforcements -->
      <rect x='58' y='14' width='12' height='3' fill='#ff2d95' opacity='0.7'/>
      <rect x='58' y='22' width='12' height='3' fill='#ff2d95' opacity='0.7'/>
      <rect x='58' y='30' width='12' height='3' fill='#ff2d95' opacity='0.7'/>
      <!-- Muzzle -->
      <rect x='57' y='6' width='14' height='5' fill='#1a000a' stroke='#ff2d95' stroke-width='0.8'/>
      <circle cx='64' cy='8' r='2.5' fill='#ff2d95' filter='url(#av-glow)'/>
      <!-- Laser sight line -->
      <line x1='64' y1='10' x2='64' y2='0' stroke='#ff2d95' stroke-width='1' opacity='0.8' filter='url(#av-glow)'/>
      <!-- Power indicator LEDs -->
      <circle cx='58' cy='68' r='1.2' fill='#ff2d95' filter='url(#av-glow)'/>
      <circle cx='64' cy='68' r='1.2' fill='#ff2d95' filter='url(#av-glow)'/>
      <circle cx='70' cy='68' r='1.2' fill='#2a0015'/>
    </svg>`,

  // QUANTUM — glowing crystal orb in a caged frame with orbital particles
  quantum: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='qt-core' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#fff'/>
          <stop offset='0.3' stop-color='#e0a8ff'/>
          <stop offset='0.7' stop-color='#b847ff'/>
          <stop offset='1' stop-color='#2a0055'/>
        </radialGradient>
        <radialGradient id='qt-body' cx='50%' cy='70%'>
          <stop offset='0' stop-color='#3a0a5c'/>
          <stop offset='1' stop-color='#0a0014'/>
        </radialGradient>
        <filter id='qt-glow'><feGaussianBlur stdDeviation='3.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='112' rx='42' ry='5' fill='#000' opacity='0.5'/>
      <!-- Base platform -->
      <ellipse cx='64' cy='104' rx='34' ry='6' fill='#0a0014' stroke='#b847ff' stroke-width='1'/>
      <ellipse cx='64' cy='102' rx='28' ry='4' fill='url(#qt-body)'/>
      <!-- Support pillars -->
      <g stroke='#4a1a66' stroke-width='3' fill='#1a0022'>
        <rect x='30' y='56' width='4' height='50'/>
        <rect x='94' y='56' width='4' height='50'/>
        <rect x='62' y='96' width='4' height='10'/>
      </g>
      <!-- Orb frame (caged diamond) -->
      <g fill='none' stroke='#b847ff' stroke-width='1.5' filter='url(#qt-glow)'>
        <ellipse cx='64' cy='60' rx='36' ry='14'/>
        <ellipse cx='64' cy='60' rx='36' ry='14' transform='rotate(60 64 60)'/>
        <ellipse cx='64' cy='60' rx='36' ry='14' transform='rotate(120 64 60)'/>
      </g>
      <!-- Cage struts -->
      <g stroke='#b847ff' stroke-width='1' opacity='0.7'>
        <line x1='32' y1='46' x2='32' y2='74'/>
        <line x1='96' y1='46' x2='96' y2='74'/>
        <line x1='64' y1='24' x2='64' y2='28'/>
        <line x1='64' y1='92' x2='64' y2='96'/>
      </g>
      <!-- Glowing orb -->
      <circle cx='64' cy='60' r='18' fill='url(#qt-core)' filter='url(#qt-glow)'/>
      <circle cx='64' cy='60' r='12' fill='#e0a8ff' opacity='0.6'/>
      <circle cx='64' cy='60' r='6' fill='#fff'/>
      <!-- Orbital particles -->
      <g filter='url(#qt-glow)'>
        <circle cx='28' cy='60' r='2.5' fill='#b847ff'/>
        <circle cx='100' cy='60' r='2.5' fill='#b847ff'/>
        <circle cx='64' cy='24' r='2.5' fill='#b847ff'/>
        <circle cx='64' cy='96' r='2.5' fill='#b847ff'/>
      </g>
      <!-- Energy discharge -->
      <g stroke='#fff' stroke-width='0.5' opacity='0.6' fill='none'>
        <path d='M46 50 L52 56 L48 60 L54 64'/>
        <path d='M82 50 L76 56 L80 60 L74 64'/>
      </g>
    </svg>`,

  // ICE-BREAKER — angular ice crystal with radiating prongs and frost mist
  ice: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='ib-crystal' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#c0f0ff'/>
          <stop offset='0.5' stop-color='#00aaff'/>
          <stop offset='1' stop-color='#003060'/>
        </linearGradient>
        <radialGradient id='ib-base' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#003060'/>
          <stop offset='1' stop-color='#000a1a'/>
        </radialGradient>
        <filter id='ib-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='112' rx='42' ry='5' fill='#000' opacity='0.5'/>
      <!-- Frozen base -->
      <circle cx='64' cy='64' r='48' fill='url(#ib-base)' stroke='#00aaff' stroke-width='1.5' opacity='0.9'/>
      <!-- Frost pattern ring -->
      <g stroke='#00aaff' stroke-width='0.5' fill='none' opacity='0.4'>
        <circle cx='64' cy='64' r='42'/>
        <circle cx='64' cy='64' r='36'/>
      </g>
      <!-- Four outer crystal prongs (N/E/S/W) -->
      <g stroke='#c0f0ff' stroke-width='0.8'>
        <polygon points='64,14 70,30 64,38 58,30' fill='url(#ib-crystal)'/>
        <polygon points='114,64 98,70 90,64 98,58' fill='url(#ib-crystal)'/>
        <polygon points='64,114 58,98 64,90 70,98' fill='url(#ib-crystal)'/>
        <polygon points='14,64 30,58 38,64 30,70' fill='url(#ib-crystal)'/>
      </g>
      <!-- Four diagonal prongs (smaller) -->
      <g fill='#00aaff' stroke='#c0f0ff' stroke-width='0.5' opacity='0.9' filter='url(#ib-glow)'>
        <polygon points='28,28 42,38 40,42 36,40 38,36'/>
        <polygon points='100,28 90,38 92,42 96,40 94,36'/>
        <polygon points='28,100 42,90 40,86 36,88 38,92'/>
        <polygon points='100,100 90,90 92,86 96,88 94,92'/>
      </g>
      <!-- Central glowing crystal -->
      <polygon points='64,44 78,58 78,70 64,84 50,70 50,58' fill='url(#ib-crystal)' stroke='#c0f0ff' stroke-width='1' filter='url(#ib-glow)'/>
      <polygon points='64,52 72,60 72,68 64,76 56,68 56,60' fill='#c0f0ff' opacity='0.8'/>
      <!-- Fracture lines -->
      <g stroke='#fff' stroke-width='0.3' opacity='0.8' fill='none'>
        <line x1='64' y1='44' x2='64' y2='84'/>
        <line x1='50' y1='58' x2='78' y2='70'/>
        <line x1='50' y1='70' x2='78' y2='58'/>
      </g>
      <!-- Bright core -->
      <circle cx='64' cy='64' r='4' fill='#fff' filter='url(#ib-glow)'/>
    </svg>`,

  // MINE — proximity bomb with LED array, warning stripes
  mine: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='mn-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#ffed66'/>
          <stop offset='0.6' stop-color='#aa6000'/>
          <stop offset='1' stop-color='#2a1800'/>
        </radialGradient>
        <filter id='mn-glow'><feGaussianBlur stdDeviation='2.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='98' rx='32' ry='4' fill='#000' opacity='0.5'/>
      <!-- Disk body -->
      <ellipse cx='64' cy='80' rx='36' ry='10' fill='#1a1000' stroke='#aa6000' stroke-width='1'/>
      <ellipse cx='64' cy='74' rx='36' ry='10' fill='url(#mn-body)' stroke='#ffd600' stroke-width='1.5'/>
      <!-- Warning chevrons on side -->
      <g fill='#000' stroke='#ffd600' stroke-width='0.5'>
        <polygon points='34,74 38,78 34,82 30,78'/>
        <polygon points='94,74 98,78 94,82 90,78'/>
      </g>
      <!-- Top dome -->
      <ellipse cx='64' cy='64' rx='30' ry='12' fill='url(#mn-body)' stroke='#ffd600' stroke-width='1'/>
      <!-- LED array -->
      <g filter='url(#mn-glow)'>
        <circle cx='50' cy='62' r='2.5' fill='#ff2d95'/>
        <circle cx='64' cy='60' r='2.5' fill='#ffd600'/>
        <circle cx='78' cy='62' r='2.5' fill='#00ff88'/>
      </g>
      <!-- Center warning -->
      <circle cx='64' cy='60' r='8' fill='#1a1000' stroke='#ffd600' stroke-width='1'/>
      <text x='64' y='64' font-family='monospace' font-size='10' font-weight='bold' text-anchor='middle' fill='#ffd600'>!</text>
      <!-- Antennas -->
      <g stroke='#ffd600' stroke-width='1'>
        <line x1='44' y1='54' x2='40' y2='44'/>
        <line x1='84' y1='54' x2='88' y2='44'/>
        <circle cx='40' cy='44' r='1.5' fill='#ff2d95' filter='url(#mn-glow)'/>
        <circle cx='88' cy='44' r='1.5' fill='#ff2d95' filter='url(#mn-glow)'/>
      </g>
    </svg>`,

  // CHAIN LIGHTNING — tesla coil with arcing bolts between prongs
  chain: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='ch-coil' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#8ffaff'/>
          <stop offset='0.5' stop-color='#00fff0'/>
          <stop offset='1' stop-color='#002530'/>
        </linearGradient>
        <radialGradient id='ch-base' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#1a4d50'/>
          <stop offset='1' stop-color='#001a1a'/>
        </radialGradient>
        <filter id='ch-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='114' rx='42' ry='5' fill='#000' opacity='0.5'/>
      <!-- Base plate -->
      <ellipse cx='64' cy='104' rx='38' ry='8' fill='url(#ch-base)' stroke='#00fff0' stroke-width='1'/>
      <!-- Central coil tower -->
      <rect x='56' y='34' width='16' height='66' rx='3' fill='#002530' stroke='#00fff0' stroke-width='1'/>
      <!-- Coil windings -->
      <g stroke='#00fff0' stroke-width='0.6' fill='none' opacity='0.9'>
        <path d='M56 42 Q64 40 72 42 T56 46 Q64 44 72 46 T56 50 Q64 48 72 50 T56 54 Q64 52 72 54 T56 58 Q64 56 72 58 T56 62 Q64 60 72 62 T56 66 Q64 64 72 66 T56 70 Q64 68 72 70 T56 74 Q64 72 72 74 T56 78 Q64 76 72 78 T56 82 Q64 80 72 82 T56 86 Q64 84 72 86 T56 90 Q64 88 72 90 T56 94 Q64 92 72 94'/>
      </g>
      <!-- Top sphere (primary) -->
      <circle cx='64' cy='30' r='14' fill='url(#ch-coil)' stroke='#00fff0' stroke-width='1.5' filter='url(#ch-glow)'/>
      <circle cx='64' cy='30' r='8' fill='#8ffaff' opacity='0.8'/>
      <circle cx='64' cy='30' r='3' fill='#fff'/>
      <!-- Corner prongs (arc targets) -->
      <g fill='#00fff0' filter='url(#ch-glow)'>
        <circle cx='24' cy='70' r='4'/>
        <circle cx='104' cy='70' r='4'/>
        <circle cx='16' cy='40' r='3'/>
        <circle cx='112' cy='40' r='3'/>
      </g>
      <!-- Arcing bolts -->
      <g stroke='#fff' stroke-width='1' fill='none' opacity='0.9' filter='url(#ch-glow)'>
        <path d='M56 32 Q40 40 26 42 L24 40 L28 38 L16 40'/>
        <path d='M72 32 Q88 40 102 42 L104 40 L100 38 L112 40'/>
        <path d='M58 38 L48 50 L52 58 L30 68'/>
        <path d='M70 38 L80 50 L76 58 L98 68'/>
      </g>
      <!-- Sparks -->
      <g fill='#fff' filter='url(#ch-glow)'>
        <circle cx='40' cy='42' r='1'/>
        <circle cx='88' cy='42' r='1'/>
        <circle cx='50' cy='54' r='0.8'/>
        <circle cx='78' cy='54' r='0.8'/>
      </g>
    </svg>`,

  // RAILGUN — massive electromagnetic barrel with coils, power conduits, muzzle brake
  railgun: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='rg-barrel' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0' stop-color='#4d3300'/>
          <stop offset='0.5' stop-color='#1a1000'/>
          <stop offset='1' stop-color='#3d2a00'/>
        </linearGradient>
        <linearGradient id='rg-body' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#5a3c00'/>
          <stop offset='1' stop-color='#0a0600'/>
        </linearGradient>
        <filter id='rg-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='114' rx='42' ry='5' fill='#000' opacity='0.5'/>
      <!-- Breech/base -->
      <ellipse cx='64' cy='100' rx='34' ry='8' fill='url(#rg-body)' stroke='#ffd600' stroke-width='1.5'/>
      <ellipse cx='64' cy='96' rx='30' ry='7' fill='none' stroke='#ffd600' stroke-width='0.5' opacity='0.5'/>
      <!-- Power core housing -->
      <rect x='48' y='72' width='32' height='26' rx='2' fill='url(#rg-body)' stroke='#ffd600' stroke-width='1'/>
      <!-- Power conduits -->
      <g stroke='#ffd600' stroke-width='1.5' filter='url(#rg-glow)'>
        <line x1='52' y1='80' x2='52' y2='94' opacity='0.9'/>
        <line x1='60' y1='80' x2='60' y2='94' opacity='0.7'/>
        <line x1='68' y1='80' x2='68' y2='94' opacity='0.7'/>
        <line x1='76' y1='80' x2='76' y2='94' opacity='0.9'/>
      </g>
      <!-- Barrel (long, tapered) -->
      <rect x='58' y='10' width='12' height='68' fill='url(#rg-barrel)' stroke='#ffd600' stroke-width='1'/>
      <!-- Electromagnetic coils along barrel -->
      <g fill='#ffd600' stroke='#1a1000' stroke-width='0.5'>
        <rect x='55' y='18' width='18' height='4' rx='1' opacity='0.9'/>
        <rect x='55' y='30' width='18' height='4' rx='1' opacity='0.9'/>
        <rect x='55' y='42' width='18' height='4' rx='1' opacity='0.9'/>
        <rect x='55' y='54' width='18' height='4' rx='1' opacity='0.9'/>
        <rect x='55' y='66' width='18' height='4' rx='1' opacity='0.9'/>
      </g>
      <!-- Coil glow accents -->
      <g fill='#fff' filter='url(#rg-glow)'>
        <circle cx='55' cy='20' r='0.8'/>
        <circle cx='73' cy='20' r='0.8'/>
        <circle cx='55' cy='32' r='0.8'/>
        <circle cx='73' cy='32' r='0.8'/>
        <circle cx='55' cy='44' r='0.8'/>
        <circle cx='73' cy='44' r='0.8'/>
        <circle cx='55' cy='56' r='0.8'/>
        <circle cx='73' cy='56' r='0.8'/>
        <circle cx='55' cy='68' r='0.8'/>
        <circle cx='73' cy='68' r='0.8'/>
      </g>
      <!-- Muzzle brake -->
      <rect x='54' y='6' width='20' height='6' fill='#1a1000' stroke='#ffd600' stroke-width='1'/>
      <rect x='56' y='4' width='16' height='3' fill='#1a1000' stroke='#ffd600' stroke-width='0.5'/>
      <!-- Muzzle charge glow -->
      <circle cx='64' cy='9' r='3' fill='#fff' filter='url(#rg-glow)' opacity='0.9'/>
      <!-- Targeting sensor -->
      <circle cx='64' cy='76' r='4' fill='#ffd600' stroke='#fff' stroke-width='0.5' filter='url(#rg-glow)'/>
    </svg>`,

  pulse: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='ps-core' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#ffcc44'/>
          <stop offset='0.5' stop-color='#ff9900'/>
          <stop offset='1' stop-color='#3d2000'/>
        </radialGradient>
        <filter id='ps-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='116' rx='38' ry='5' fill='#000' opacity='0.5'/>
      <!-- Base plate -->
      <rect x='24' y='90' width='80' height='18' rx='4' fill='#1a0a00' stroke='#ff9900' stroke-width='1.5'/>
      <!-- EMP dish array -->
      <ellipse cx='64' cy='72' rx='38' ry='8' fill='#2a1400' stroke='#ff9900' stroke-width='2'/>
      <!-- Dish ribs -->
      <g stroke='#ff9900' stroke-width='1' opacity='0.7'>
        <line x1='64' y1='72' x2='30' y2='56'/>
        <line x1='64' y1='72' x2='98' y2='56'/>
        <line x1='64' y1='72' x2='64' y2='50'/>
        <line x1='64' y1='72' x2='42' y2='52'/>
        <line x1='64' y1='72' x2='86' y2='52'/>
      </g>
      <!-- Emitter rings -->
      <ellipse cx='64' cy='56' rx='28' ry='6' fill='none' stroke='#ff9900' stroke-width='2' filter='url(#ps-glow)'/>
      <ellipse cx='64' cy='50' rx='20' ry='4' fill='none' stroke='#ffcc44' stroke-width='1.5' opacity='0.8'/>
      <!-- Core charge ball -->
      <circle cx='64' cy='56' r='10' fill='url(#ps-core)' filter='url(#ps-glow)'/>
      <circle cx='64' cy='56' r='4' fill='#fff' opacity='0.9'/>
      <!-- Pulse arcs -->
      <g stroke='#ff9900' stroke-width='1' fill='none' opacity='0.6' filter='url(#ps-glow)'>
        <path d='M36,56 Q64,30 92,56'/>
        <path d='M42,56 Q64,36 86,56'/>
      </g>
      <!-- Status indicators -->
      <g fill='#ff9900' filter='url(#ps-glow)'>
        <rect x='28' y='95' width='6' height='6' rx='1'/>
        <rect x='38' y='95' width='6' height='6' rx='1' opacity='0.7'/>
        <rect x='84' y='95' width='6' height='6' rx='1' opacity='0.7'/>
        <rect x='94' y='95' width='6' height='6' rx='1'/>
      </g>
    </svg>`,

  sniper: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='sn-barrel' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#003311'/>
          <stop offset='0.5' stop-color='#001a08'/>
          <stop offset='1' stop-color='#002a10'/>
        </linearGradient>
        <filter id='sn-glow'><feGaussianBlur stdDeviation='2.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='116' rx='30' ry='5' fill='#000' opacity='0.5'/>
      <!-- Base -->
      <ellipse cx='64' cy='106' rx='32' ry='7' fill='#001a08' stroke='#00ff88' stroke-width='1.5'/>
      <!-- Bipod legs -->
      <line x1='48' y1='100' x2='38' y2='114' stroke='#00ff88' stroke-width='2'/>
      <line x1='80' y1='100' x2='90' y2='114' stroke='#00ff88' stroke-width='2'/>
      <!-- Body receiver -->
      <rect x='50' y='74' width='28' height='30' rx='2' fill='url(#sn-barrel)' stroke='#00ff88' stroke-width='1.5'/>
      <!-- Trigger guard -->
      <path d='M56 96 Q64 108 72 96' fill='none' stroke='#00ff88' stroke-width='1.5'/>
      <!-- Scope / optics rail -->
      <rect x='58' y='70' width='12' height='8' fill='#002a10' stroke='#00ff88' stroke-width='1'/>
      <rect x='60' y='66' width='8' height='6' rx='1' fill='#004422' stroke='#00ff88' stroke-width='0.5'/>
      <!-- Scope lens glow -->
      <circle cx='64' cy='69' r='3' fill='#00ff88' filter='url(#sn-glow)' opacity='0.7'/>
      <!-- Long barrel -->
      <rect x='61' y='4' width='6' height='70' fill='url(#sn-barrel)' stroke='#00ff88' stroke-width='0.8'/>
      <!-- Barrel vents -->
      <g fill='none' stroke='#00ff88' stroke-width='0.5' opacity='0.7'>
        <line x1='59' y1='20' x2='69' y2='20'/>
        <line x1='59' y1='30' x2='69' y2='30'/>
        <line x1='59' y1='40' x2='69' y2='40'/>
        <line x1='59' y1='50' x2='69' y2='50'/>
      </g>
      <!-- Muzzle suppressor -->
      <rect x='58' y='2' width='12' height='6' rx='2' fill='#001a08' stroke='#00ff88' stroke-width='1'/>
      <!-- Muzzle energy charge -->
      <circle cx='64' cy='5' r='2.5' fill='#00ff88' filter='url(#sn-glow)' opacity='0.9'/>
      <!-- Targeting reticle indicator -->
      <circle cx='64' cy='84' r='5' fill='none' stroke='#00ff88' stroke-width='1' filter='url(#sn-glow)'/>
      <circle cx='64' cy='84' r='1.5' fill='#00ff88'/>
    </svg>`,

  scrambler: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='sc-body' cx='50%' cy='60%'>
          <stop offset='0' stop-color='#660033'/>
          <stop offset='1' stop-color='#1a0010'/>
        </radialGradient>
        <filter id='sc-glow'><feGaussianBlur stdDeviation='2'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='116' rx='36' ry='5' fill='#000' opacity='0.5'/>
      <!-- Base ring -->
      <ellipse cx='64' cy='102' rx='36' ry='8' fill='#1a0010' stroke='#ff2d95' stroke-width='2'/>
      <!-- Emitter array body -->
      <rect x='44' y='62' width='40' height='42' rx='3' fill='url(#sc-body)' stroke='#ff2d95' stroke-width='1.5'/>
      <!-- Signal dish cluster (4 small dishes) -->
      <g stroke='#ff2d95' stroke-width='1.5' fill='none' filter='url(#sc-glow)'>
        <ellipse cx='52' cy='52' rx='10' ry='4'/>
        <ellipse cx='76' cy='52' rx='10' ry='4'/>
        <ellipse cx='52' cy='36' rx='7' ry='3'/>
        <ellipse cx='76' cy='36' rx='7' ry='3'/>
      </g>
      <!-- Dish spines -->
      <g stroke='#ff2d95' stroke-width='1' opacity='0.7'>
        <line x1='52' y1='52' x2='52' y2='30'/>
        <line x1='76' y1='52' x2='76' y2='30'/>
        <line x1='48' y1='52' x2='40' y2='44'/>
        <line x1='80' y1='52' x2='88' y2='44'/>
      </g>
      <!-- Signal burst arcs -->
      <g stroke='#ff2d95' stroke-width='0.8' fill='none' opacity='0.5' filter='url(#sc-glow)'>
        <path d='M42,44 Q52,28 62,44'/>
        <path d='M66,44 Q76,28 86,44'/>
      </g>
      <!-- Core emitter glows -->
      <circle cx='52' cy='36' r='4' fill='#ff2d95' filter='url(#sc-glow)' opacity='0.8'/>
      <circle cx='76' cy='36' r='4' fill='#ff2d95' filter='url(#sc-glow)' opacity='0.8'/>
      <!-- Status panel -->
      <rect x='50' y='70' width='28' height='20' rx='2' fill='#0d0008' stroke='#ff2d95' stroke-width='0.5'/>
      <g fill='#ff2d95' opacity='0.9'>
        <rect x='53' y='73' width='4' height='3' rx='0.5'/>
        <rect x='60' y='73' width='4' height='3' rx='0.5'/>
        <rect x='67' y='73' width='4' height='3' rx='0.5'/>
        <rect x='53' y='80' width='18' height='2' rx='0.5'/>
      </g>
    </svg>`,

  sentinel: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='se-core' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#cc88ff'/>
          <stop offset='0.5' stop-color='#b847ff'/>
          <stop offset='1' stop-color='#1a0029'/>
        </radialGradient>
        <filter id='se-glow'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='116' rx='40' ry='5' fill='#000' opacity='0.5'/>
      <!-- Outer field projector ring -->
      <circle cx='64' cy='64' r='52' fill='none' stroke='#b847ff' stroke-width='0.5' opacity='0.4'/>
      <circle cx='64' cy='64' r='46' fill='none' stroke='#b847ff' stroke-width='1' opacity='0.3'/>
      <!-- Base pillar -->
      <rect x='52' y='82' width='24' height='28' rx='2' fill='#0d0018' stroke='#b847ff' stroke-width='1.5'/>
      <!-- Pillar accents -->
      <g stroke='#b847ff' stroke-width='0.5' opacity='0.7'>
        <line x1='56' y1='86' x2='56' y2='106'/>
        <line x1='64' y1='86' x2='64' y2='106'/>
        <line x1='72' y1='86' x2='72' y2='106'/>
      </g>
      <!-- Main emitter node -->
      <circle cx='64' cy='64' r='24' fill='#0d0018' stroke='#b847ff' stroke-width='2' filter='url(#se-glow)'/>
      <!-- Inner hexagonal field grid -->
      <polygon points='64,46 78,55 78,73 64,82 50,73 50,55' fill='none' stroke='#b847ff' stroke-width='1.5' opacity='0.7'/>
      <!-- Core energy orb -->
      <circle cx='64' cy='64' r='14' fill='url(#se-core)' filter='url(#se-glow)'/>
      <circle cx='64' cy='64' r='6' fill='#fff' opacity='0.9'/>
      <!-- Field emanation lines -->
      <g stroke='#b847ff' stroke-width='1' opacity='0.5' filter='url(#se-glow)'>
        <line x1='64' y1='40' x2='64' y2='30'/>
        <line x1='64' y1='88' x2='64' y2='98'/>
        <line x1='40' y1='64' x2='30' y2='64'/>
        <line x1='88' y1='64' x2='98' y2='64'/>
        <line x1='47' y1='47' x2='40' y2='40'/>
        <line x1='81' y1='47' x2='88' y2='40'/>
        <line x1='47' y1='81' x2='40' y2='88'/>
        <line x1='81' y1='81' x2='88' y2='88'/>
      </g>
    </svg>`,
};

// ---------- ENEMY SPRITES ----------
const enemySVG: Record<EnemyId, () => string> = {
  // WORM — segmented body with shaded spheres, glowing eyes, jagged maw
  worm: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='wm-seg' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#8fffbc'/>
          <stop offset='0.5' stop-color='#3eff9c'/>
          <stop offset='1' stop-color='#005a2e'/>
        </radialGradient>
        <filter id='wm-g'><feGaussianBlur stdDeviation='1.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <!-- Shadow -->
      <ellipse cx='64' cy='88' rx='44' ry='4' fill='#000' opacity='0.4'/>
      <!-- Tail segments (smaller → larger toward head) -->
      <circle cx='22' cy='64' r='10' fill='url(#wm-seg)' stroke='#006b3a' stroke-width='0.5'/>
      <circle cx='38' cy='64' r='13' fill='url(#wm-seg)' stroke='#006b3a' stroke-width='0.5'/>
      <circle cx='58' cy='64' r='16' fill='url(#wm-seg)' stroke='#006b3a' stroke-width='0.5'/>
      <circle cx='82' cy='64' r='18' fill='url(#wm-seg)' stroke='#006b3a' stroke-width='0.5'/>
      <!-- Segmentation marks -->
      <g stroke='#005a2e' stroke-width='0.8' opacity='0.6' fill='none'>
        <ellipse cx='22' cy='64' rx='10' ry='3'/>
        <ellipse cx='38' cy='64' rx='13' ry='4'/>
        <ellipse cx='58' cy='64' rx='16' ry='5'/>
        <ellipse cx='82' cy='64' rx='18' ry='6'/>
      </g>
      <!-- Head (larger segment) -->
      <ellipse cx='102' cy='64' rx='18' ry='19' fill='url(#wm-seg)' stroke='#006b3a' stroke-width='0.8'/>
      <!-- Eyes (glowing) -->
      <circle cx='108' cy='56' r='3.5' fill='#ff2d95' filter='url(#wm-g)'/>
      <circle cx='108' cy='72' r='3.5' fill='#ff2d95' filter='url(#wm-g)'/>
      <circle cx='109' cy='55' r='1' fill='#fff'/>
      <circle cx='109' cy='71' r='1' fill='#fff'/>
      <!-- Maw/mouth (jagged) -->
      <path d='M112 64 L118 60 L116 64 L120 66 L116 68 L118 68 L112 64' fill='#1a0012' stroke='#ff2d95' stroke-width='0.5'/>
      <!-- Highlight sheen on back -->
      <ellipse cx='80' cy='56' rx='20' ry='3' fill='#8fffbc' opacity='0.5'/>
    </svg>`,

  // CRAWLER (spider) — 8 articulated legs, bulbous body, red eyes, mandibles
  spider: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='cr-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#ffee99'/>
          <stop offset='0.6' stop-color='#ffae00'/>
          <stop offset='1' stop-color='#5a3a00'/>
        </radialGradient>
        <filter id='cr-g'><feGaussianBlur stdDeviation='1.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='92' rx='30' ry='4' fill='#000' opacity='0.4'/>
      <!-- Legs (8, articulated with joints) -->
      <g stroke='#5a3a00' stroke-width='3' stroke-linecap='round' fill='none'>
        <path d='M48 58 L28 40 L14 48'/>
        <path d='M50 64 L24 64 L10 70'/>
        <path d='M50 72 L28 82 L14 88'/>
        <path d='M52 80 L36 94 L28 108'/>
        <path d='M80 58 L100 40 L114 48'/>
        <path d='M78 64 L104 64 L118 70'/>
        <path d='M78 72 L100 82 L114 88'/>
        <path d='M76 80 L92 94 L100 108'/>
      </g>
      <!-- Leg joints -->
      <g fill='#ffae00'>
        <circle cx='28' cy='40' r='2'/>
        <circle cx='24' cy='64' r='2'/>
        <circle cx='28' cy='82' r='2'/>
        <circle cx='36' cy='94' r='2'/>
        <circle cx='100' cy='40' r='2'/>
        <circle cx='104' cy='64' r='2'/>
        <circle cx='100' cy='82' r='2'/>
        <circle cx='92' cy='94' r='2'/>
      </g>
      <!-- Abdomen -->
      <ellipse cx='64' cy='76' rx='24' ry='16' fill='url(#cr-body)' stroke='#5a3a00' stroke-width='1'/>
      <!-- Abdomen pattern -->
      <g stroke='#5a3a00' stroke-width='0.6' fill='none' opacity='0.7'>
        <ellipse cx='64' cy='78' rx='14' ry='10'/>
        <line x1='64' y1='66' x2='64' y2='90'/>
      </g>
      <!-- Cephalothorax -->
      <ellipse cx='64' cy='56' rx='18' ry='14' fill='url(#cr-body)' stroke='#5a3a00' stroke-width='1'/>
      <!-- Eyes (cluster of 6 red) -->
      <g fill='#ff2d95' filter='url(#cr-g)'>
        <circle cx='55' cy='50' r='2'/>
        <circle cx='61' cy='48' r='2'/>
        <circle cx='67' cy='48' r='2'/>
        <circle cx='73' cy='50' r='2'/>
        <circle cx='58' cy='56' r='1.5'/>
        <circle cx='70' cy='56' r='1.5'/>
      </g>
      <g fill='#fff'>
        <circle cx='55.5' cy='49.5' r='0.6'/>
        <circle cx='61.5' cy='47.5' r='0.6'/>
        <circle cx='66.5' cy='47.5' r='0.6'/>
        <circle cx='72.5' cy='49.5' r='0.6'/>
      </g>
      <!-- Mandibles -->
      <path d='M56 62 L50 68 L54 66' fill='#3a2200' stroke='#ffae00' stroke-width='0.5'/>
      <path d='M72 62 L78 68 L74 66' fill='#3a2200' stroke='#ffae00' stroke-width='0.5'/>
      <!-- Highlight -->
      <ellipse cx='60' cy='50' rx='6' ry='2' fill='#fff' opacity='0.3'/>
    </svg>`,

  // TROJAN — armored hex carapace with armor plating, warning runes, cracks
  trojan: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='tr-body' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#ff8c33'/>
          <stop offset='0.4' stop-color='#ff6600'/>
          <stop offset='1' stop-color='#3d1500'/>
        </linearGradient>
        <linearGradient id='tr-plate' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#aa3c00'/>
          <stop offset='1' stop-color='#1a0800'/>
        </linearGradient>
        <filter id='tr-g'><feGaussianBlur stdDeviation='2'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='120' rx='40' ry='4' fill='#000' opacity='0.5'/>
      <!-- Outer hex shell -->
      <polygon points='64,8 110,34 110,94 64,120 18,94 18,34' fill='url(#tr-body)' stroke='#ff2d95' stroke-width='2' filter='url(#tr-g)'/>
      <!-- Armor panel lines -->
      <g stroke='#1a0800' stroke-width='1.5' fill='none'>
        <line x1='64' y1='8' x2='64' y2='64'/>
        <line x1='64' y1='64' x2='18' y2='34'/>
        <line x1='64' y1='64' x2='110' y2='34'/>
        <line x1='64' y1='64' x2='64' y2='120'/>
      </g>
      <!-- Plate bevels (highlights) -->
      <g stroke='#ffb366' stroke-width='0.5' fill='none' opacity='0.7'>
        <line x1='18' y1='34' x2='64' y2='8'/>
        <line x1='64' y1='8' x2='110' y2='34'/>
      </g>
      <!-- Inner hex -->
      <polygon points='64,28 92,44 92,84 64,100 36,84 36,44' fill='url(#tr-plate)' stroke='#ff2d95' stroke-width='1.5'/>
      <!-- Rivets at corners -->
      <g fill='#3d1500' stroke='#ff2d95' stroke-width='0.5'>
        <circle cx='36' cy='44' r='2.5'/>
        <circle cx='92' cy='44' r='2.5'/>
        <circle cx='36' cy='84' r='2.5'/>
        <circle cx='92' cy='84' r='2.5'/>
      </g>
      <!-- Central trojan warning sigil -->
      <polygon points='64,40 80,64 64,88 48,64' fill='#ff2d95' opacity='0.9' filter='url(#tr-g)'/>
      <text x='64' y='70' font-family='monospace' font-size='18' font-weight='bold' text-anchor='middle' fill='#1a0800'>T</text>
      <!-- Small damage cracks -->
      <g stroke='#1a0800' stroke-width='0.5' fill='none' opacity='0.8'>
        <path d='M30 50 L38 54 L36 58'/>
        <path d='M98 70 L92 72 L94 76'/>
      </g>
      <!-- Glowing eye slits (hostile) -->
      <rect x='44' y='38' width='8' height='3' fill='#ff2d95' filter='url(#tr-g)' opacity='0.9'/>
      <rect x='76' y='38' width='8' height='3' fill='#ff2d95' filter='url(#tr-g)' opacity='0.9'/>
    </svg>`,

  // ROOTKIT — spiked armored sphere with tendrils, heavy purple/pink
  rootkit: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='rk-body' cx='45%' cy='40%'>
          <stop offset='0' stop-color='#ee80ff'/>
          <stop offset='0.4' stop-color='#b847ff'/>
          <stop offset='1' stop-color='#1a0033'/>
        </radialGradient>
        <filter id='rk-g'><feGaussianBlur stdDeviation='2.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='114' rx='42' ry='4' fill='#000' opacity='0.5'/>
      <!-- Outer tendrils/spikes (8-way) -->
      <g stroke='#ff2d95' stroke-width='3.5' stroke-linecap='round' filter='url(#rk-g)'>
        <line x1='64' y1='26' x2='64' y2='4'/>
        <line x1='64' y1='102' x2='64' y2='124'/>
        <line x1='26' y1='64' x2='4' y2='64'/>
        <line x1='102' y1='64' x2='124' y2='64'/>
        <line x1='36' y1='36' x2='20' y2='20'/>
        <line x1='92' y1='36' x2='108' y2='20'/>
        <line x1='36' y1='92' x2='20' y2='108'/>
        <line x1='92' y1='92' x2='108' y2='108'/>
      </g>
      <!-- Spike tips -->
      <g fill='#ff2d95' filter='url(#rk-g)'>
        <polygon points='64,4 68,14 60,14'/>
        <polygon points='64,124 68,114 60,114'/>
        <polygon points='4,64 14,68 14,60'/>
        <polygon points='124,64 114,68 114,60'/>
      </g>
      <!-- Core sphere -->
      <circle cx='64' cy='64' r='40' fill='url(#rk-body)' stroke='#b847ff' stroke-width='2'/>
      <!-- Armor plates -->
      <g stroke='#1a0033' stroke-width='1' fill='none' opacity='0.8'>
        <path d='M38 64 A26 26 0 0 1 64 38'/>
        <path d='M64 38 A26 26 0 0 1 90 64'/>
        <path d='M38 64 A26 26 0 0 0 64 90'/>
        <path d='M64 90 A26 26 0 0 0 90 64'/>
      </g>
      <!-- Rivets on armor -->
      <g fill='#1a0033' stroke='#ff2d95' stroke-width='0.5'>
        <circle cx='48' cy='48' r='2'/>
        <circle cx='80' cy='48' r='2'/>
        <circle cx='48' cy='80' r='2'/>
        <circle cx='80' cy='80' r='2'/>
      </g>
      <!-- Inner pulsing core -->
      <circle cx='64' cy='64' r='18' fill='#ff2d95' filter='url(#rk-g)' opacity='0.9'/>
      <circle cx='64' cy='64' r='10' fill='#fff' opacity='0.7'/>
      <circle cx='64' cy='64' r='4' fill='#ff2d95'/>
      <!-- Circuit tracery -->
      <g stroke='#ff2d95' stroke-width='0.6' fill='none' opacity='0.7'>
        <path d='M44 44 L52 52 M84 44 L76 52 M44 84 L52 76 M84 84 L76 76'/>
      </g>
    </svg>`,

  // PHANTOM — translucent ghostly form with inner mist swirl, dual eyes
  phantom: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='ph-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#c0f0ff' stop-opacity='0.9'/>
          <stop offset='0.5' stop-color='#00aaff' stop-opacity='0.7'/>
          <stop offset='1' stop-color='#001a40' stop-opacity='0.4'/>
        </radialGradient>
        <filter id='ph-g'><feGaussianBlur stdDeviation='4'/></filter>
        <filter id='ph-sharp'><feGaussianBlur stdDeviation='1'/></filter>
      </defs>
      <!-- Outer halo glow -->
      <g filter='url(#ph-g)' opacity='0.7'>
        <path d='M28 48 Q46 16 64 28 Q82 16 100 48 Q116 72 100 104 Q82 92 64 114 Q46 92 28 104 Q12 72 28 48' fill='#00aaff'/>
      </g>
      <!-- Inner body -->
      <path d='M30 50 Q48 20 64 30 Q80 20 98 50 Q112 72 98 102 Q80 92 64 112 Q48 92 30 102 Q16 72 30 50' fill='url(#ph-body)' stroke='#00fff0' stroke-width='1.5' filter='url(#ph-sharp)'/>
      <!-- Internal mist swirls -->
      <g stroke='#00fff0' stroke-width='0.5' fill='none' opacity='0.5'>
        <path d='M40 60 Q54 70 48 84 Q42 92 50 96'/>
        <path d='M88 60 Q74 70 80 84 Q86 92 78 96'/>
        <path d='M50 80 Q64 72 78 80'/>
      </g>
      <!-- Eye sockets -->
      <ellipse cx='52' cy='58' rx='6' ry='8' fill='#001a40'/>
      <ellipse cx='76' cy='58' rx='6' ry='8' fill='#001a40'/>
      <!-- Eyes -->
      <circle cx='52' cy='58' r='3' fill='#fff' filter='url(#ph-sharp)'/>
      <circle cx='76' cy='58' r='3' fill='#fff' filter='url(#ph-sharp)'/>
      <!-- Wispy tendrils at bottom -->
      <g stroke='#00aaff' stroke-width='1' fill='none' opacity='0.6'>
        <path d='M50 100 Q48 108 52 114'/>
        <path d='M64 108 Q64 114 66 118'/>
        <path d='M78 100 Q80 108 76 114'/>
      </g>
    </svg>`,

  // WRAITH — billowing cloak with skull-like face, trailing wisps
  wraith: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='wr-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#ff99c4'/>
          <stop offset='0.5' stop-color='#ff2d95'/>
          <stop offset='1' stop-color='#3d0022'/>
        </radialGradient>
        <filter id='wr-g'><feGaussianBlur stdDeviation='3.5'/></filter>
      </defs>
      <!-- Outer swirl aura -->
      <g filter='url(#wr-g)' opacity='0.6'>
        <path d='M18 78 Q28 18 64 28 Q100 18 110 78 Q104 114 64 104 Q24 114 18 78' fill='#ff2d95'/>
      </g>
      <!-- Inner body -->
      <path d='M20 80 Q30 20 64 30 Q98 20 108 80 Q98 110 64 100 Q30 110 20 80' fill='url(#wr-body)' stroke='#ff2d95' stroke-width='1.5'/>
      <!-- Cloak folds -->
      <g stroke='#8f0050' stroke-width='1' fill='none' opacity='0.7'>
        <path d='M30 50 Q40 70 36 90'/>
        <path d='M98 50 Q88 70 92 90'/>
        <path d='M50 90 Q52 96 48 104'/>
        <path d='M78 90 Q76 96 80 104'/>
      </g>
      <!-- Skull face hood shadow -->
      <ellipse cx='64' cy='60' rx='20' ry='18' fill='#1a0010' opacity='0.8'/>
      <!-- Glowing eye sockets -->
      <ellipse cx='56' cy='56' rx='4' ry='6' fill='#b847ff' filter='url(#wr-g)'/>
      <ellipse cx='72' cy='56' rx='4' ry='6' fill='#b847ff' filter='url(#wr-g)'/>
      <circle cx='56' cy='56' r='1.5' fill='#fff'/>
      <circle cx='72' cy='56' r='1.5' fill='#fff'/>
      <!-- Jagged mouth -->
      <path d='M54 74 L58 70 L62 74 L66 70 L70 74 L74 70' stroke='#1a0010' stroke-width='1.5' fill='none'/>
      <!-- Trailing wisps -->
      <g stroke='#ff2d95' stroke-width='1.5' fill='none' opacity='0.7' filter='url(#wr-g)'>
        <path d='M20 80 Q10 90 8 106'/>
        <path d='M108 80 Q118 90 120 106'/>
      </g>
    </svg>`,

  // LEECH — slug-like with suckers, feeding tube, glowing veins
  leech: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='lc-body' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#8fffbc'/>
          <stop offset='0.4' stop-color='#00ff88'/>
          <stop offset='1' stop-color='#004a2a'/>
        </linearGradient>
        <filter id='lc-g'><feGaussianBlur stdDeviation='2'/></filter>
      </defs>
      <ellipse cx='64' cy='90' rx='40' ry='3' fill='#000' opacity='0.4'/>
      <!-- Elongated body -->
      <ellipse cx='64' cy='64' rx='40' ry='20' fill='url(#lc-body)' stroke='#006b3a' stroke-width='1'/>
      <!-- Segmentation rings -->
      <g stroke='#006b3a' stroke-width='1' fill='none' opacity='0.7'>
        <ellipse cx='44' cy='64' rx='3' ry='18'/>
        <ellipse cx='56' cy='64' rx='3' ry='19'/>
        <ellipse cx='68' cy='64' rx='3' ry='20'/>
        <ellipse cx='80' cy='64' rx='3' ry='19'/>
      </g>
      <!-- Glowing veins (life-drain indicators) -->
      <g stroke='#3eff9c' stroke-width='0.8' fill='none' opacity='0.9' filter='url(#lc-g)'>
        <path d='M28 64 Q44 58 60 64 Q76 70 92 64'/>
        <path d='M28 64 Q44 70 60 64 Q76 58 92 64'/>
      </g>
      <!-- Head bulb -->
      <circle cx='94' cy='64' r='12' fill='url(#lc-body)' stroke='#006b3a' stroke-width='1'/>
      <!-- Feeding proboscis -->
      <path d='M104 60 L116 58 L118 62 L116 66 L104 68' fill='#1a3a22' stroke='#3eff9c' stroke-width='0.8'/>
      <!-- Suckers along underside -->
      <g fill='#1a3a22' stroke='#3eff9c' stroke-width='0.4'>
        <circle cx='36' cy='78' r='3'/>
        <circle cx='52' cy='80' r='3'/>
        <circle cx='68' cy='80' r='3'/>
        <circle cx='84' cy='78' r='3'/>
      </g>
      <!-- Dot pattern -->
      <g fill='#006b3a' opacity='0.8'>
        <circle cx='40' cy='56' r='1.5'/>
        <circle cx='56' cy='52' r='1.5'/>
        <circle cx='72' cy='52' r='1.5'/>
        <circle cx='88' cy='56' r='1.5'/>
      </g>
      <!-- Tail whip -->
      <path d='M24 64 Q12 60 8 50' stroke='#006b3a' stroke-width='3' fill='none' stroke-linecap='round'/>
    </svg>`,

  // BOMBER — angry red sphere with warning chevrons, exposed detonator
  bomber: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='bm-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#ff9999'/>
          <stop offset='0.5' stop-color='#ff3355'/>
          <stop offset='1' stop-color='#3d0010'/>
        </radialGradient>
        <filter id='bm-g'><feGaussianBlur stdDeviation='2.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='110' rx='38' ry='4' fill='#000' opacity='0.5'/>
      <!-- Body -->
      <circle cx='64' cy='64' r='40' fill='url(#bm-body)' stroke='#ff6600' stroke-width='2'/>
      <circle cx='64' cy='64' r='32' fill='none' stroke='#3d0010' stroke-width='1' opacity='0.7'/>
      <!-- Warning chevrons (4 corners) -->
      <g fill='#ffd600' stroke='#3d0010' stroke-width='0.5'>
        <polygon points='32,40 44,36 40,44'/>
        <polygon points='96,40 84,36 88,44'/>
        <polygon points='32,88 44,92 40,84'/>
        <polygon points='96,88 84,92 88,84'/>
      </g>
      <!-- Detonator dome on top -->
      <circle cx='64' cy='26' r='8' fill='#1a0000' stroke='#ff6600' stroke-width='1.5'/>
      <rect x='62' y='12' width='4' height='14' fill='#ff6600'/>
      <circle cx='64' cy='12' r='3' fill='#ffd600' filter='url(#bm-g)'/>
      <!-- Panel lines -->
      <g stroke='#3d0010' stroke-width='1' fill='none' opacity='0.8'>
        <path d='M40 50 L50 60 L50 68 L40 78'/>
        <path d='M88 50 L78 60 L78 68 L88 78'/>
      </g>
      <!-- Angry face / warning text -->
      <circle cx='50' cy='60' r='3' fill='#ffd600'/>
      <circle cx='78' cy='60' r='3' fill='#ffd600'/>
      <rect x='46' y='76' width='36' height='8' fill='#1a0000' stroke='#ff6600' stroke-width='0.8'/>
      <text x='64' y='83' font-family='monospace' font-size='10' font-weight='bold' text-anchor='middle' fill='#ffd600'>!!!</text>
      <!-- Pulsing core glow indicator -->
      <circle cx='64' cy='64' r='6' fill='#ffd600' filter='url(#bm-g)' opacity='0.8'/>
    </svg>`,

  // GHOST (stealth) — ghostly form with translucent body, glowing eyes
  stealth: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='gh-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#e0f4ff' stop-opacity='0.9'/>
          <stop offset='0.5' stop-color='#9cccff' stop-opacity='0.7'/>
          <stop offset='1' stop-color='#22446b' stop-opacity='0.4'/>
        </radialGradient>
        <filter id='gh-g'><feGaussianBlur stdDeviation='4'/></filter>
        <filter id='gh-s'><feGaussianBlur stdDeviation='1'/></filter>
      </defs>
      <!-- Outer haze -->
      <g filter='url(#gh-g)' opacity='0.6'>
        <path d='M30 54 Q46 30 64 38 Q82 30 98 54 Q98 88 84 104 L76 96 L64 108 L52 96 L44 104 Q30 88 30 54' fill='#9cccff'/>
      </g>
      <!-- Body -->
      <path d='M32 56 Q48 32 64 40 Q80 32 96 56 Q96 86 82 102 L74 94 L64 104 L54 94 L46 102 Q32 86 32 56' fill='url(#gh-body)' stroke='#9cccff' stroke-width='1.5' filter='url(#gh-s)'/>
      <!-- Ribs/internal structure -->
      <g stroke='#22446b' stroke-width='0.5' fill='none' opacity='0.5'>
        <path d='M44 56 Q64 50 84 56'/>
        <path d='M42 66 Q64 60 86 66'/>
        <path d='M42 78 Q64 72 86 78'/>
      </g>
      <!-- Hollow eyes -->
      <ellipse cx='54' cy='60' rx='5' ry='7' fill='#0a1a2a'/>
      <ellipse cx='74' cy='60' rx='5' ry='7' fill='#0a1a2a'/>
      <circle cx='54' cy='60' r='2' fill='#00fff0' filter='url(#gh-s)'/>
      <circle cx='74' cy='60' r='2' fill='#00fff0' filter='url(#gh-s)'/>
      <!-- Open mouth -->
      <ellipse cx='64' cy='78' rx='6' ry='4' fill='#0a1a2a'/>
      <!-- Phase distortion lines -->
      <g stroke='#9cccff' stroke-width='0.4' fill='none' opacity='0.4'>
        <line x1='34' y1='50' x2='94' y2='50'/>
        <line x1='32' y1='90' x2='96' y2='90'/>
      </g>
    </svg>`,

  // KERNEL (boss) — colossal data cube with rotating rings, circuit patterns, central eye
  kernel: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='kn-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#fff6b0'/>
          <stop offset='0.5' stop-color='#ffd600'/>
          <stop offset='1' stop-color='#3d2a00'/>
        </radialGradient>
        <linearGradient id='kn-cube' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#ff8800'/>
          <stop offset='1' stop-color='#2a1200'/>
        </linearGradient>
        <filter id='kn-g'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='118' rx='46' ry='5' fill='#000' opacity='0.6'/>
      <!-- Outer ring -->
      <circle cx='64' cy='64' r='54' fill='none' stroke='#ffd600' stroke-width='2' opacity='0.4'/>
      <!-- Body sphere -->
      <circle cx='64' cy='64' r='48' fill='url(#kn-body)' stroke='#ff6600' stroke-width='2' filter='url(#kn-g)'/>
      <!-- Equatorial ring -->
      <ellipse cx='64' cy='64' rx='46' ry='8' fill='none' stroke='#ff6600' stroke-width='1.5' opacity='0.7'/>
      <ellipse cx='64' cy='64' rx='44' ry='6' fill='none' stroke='#ffd600' stroke-width='0.5' stroke-dasharray='3 3' opacity='0.6'/>
      <!-- Circuit trace pattern -->
      <g stroke='#ff6600' stroke-width='0.5' fill='none' opacity='0.8'>
        <path d='M24 40 L40 40 L40 48 L30 48'/>
        <path d='M104 40 L88 40 L88 48 L98 48'/>
        <path d='M24 88 L40 88 L40 80 L30 80'/>
        <path d='M104 88 L88 88 L88 80 L98 80'/>
        <circle cx='30' cy='48' r='1.5' fill='#ffd600'/>
        <circle cx='98' cy='48' r='1.5' fill='#ffd600'/>
        <circle cx='30' cy='80' r='1.5' fill='#ffd600'/>
        <circle cx='98' cy='80' r='1.5' fill='#ffd600'/>
      </g>
      <!-- Inner cube -->
      <g>
        <polygon points='42,46 86,46 86,82 42,82' fill='url(#kn-cube)' stroke='#ffd600' stroke-width='1.5'/>
        <polygon points='42,46 52,38 96,38 86,46' fill='#ffa033' stroke='#ffd600' stroke-width='1'/>
        <polygon points='86,46 96,38 96,74 86,82' fill='#aa5500' stroke='#ffd600' stroke-width='1'/>
      </g>
      <!-- Central eye/core -->
      <ellipse cx='64' cy='64' rx='14' ry='10' fill='#1a0800' stroke='#ffd600' stroke-width='1.5'/>
      <ellipse cx='64' cy='64' rx='10' ry='6' fill='#ff6600'/>
      <circle cx='64' cy='64' r='4' fill='#fff' filter='url(#kn-g)'/>
      <circle cx='64' cy='64' r='1.5' fill='#1a0800'/>
      <!-- Antenna spikes -->
      <g stroke='#ffd600' stroke-width='2' stroke-linecap='round'>
        <line x1='64' y1='16' x2='64' y2='6'/>
        <line x1='16' y1='64' x2='6' y2='64'/>
        <line x1='112' y1='64' x2='122' y2='64'/>
      </g>
      <g fill='#ff6600' filter='url(#kn-g)'>
        <circle cx='64' cy='6' r='2'/>
        <circle cx='6' cy='64' r='2'/>
        <circle cx='122' cy='64' r='2'/>
      </g>
    </svg>`,

  // DAEMON (boss) — pentagonal menacing form with horns, fangs, evil eyes
  daemon: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='dm-body' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#aa0066'/>
          <stop offset='0.5' stop-color='#6d0044'/>
          <stop offset='1' stop-color='#1a000f'/>
        </linearGradient>
        <radialGradient id='dm-eye' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#fff'/>
          <stop offset='0.4' stop-color='#b847ff'/>
          <stop offset='1' stop-color='#2a0044'/>
        </radialGradient>
        <filter id='dm-g'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='114' rx='44' ry='5' fill='#000' opacity='0.6'/>
      <!-- Horns -->
      <path d='M26 38 L20 18 L32 26 L40 38' fill='url(#dm-body)' stroke='#ff2d95' stroke-width='1.5'/>
      <path d='M102 38 L108 18 L96 26 L88 38' fill='url(#dm-body)' stroke='#ff2d95' stroke-width='1.5'/>
      <!-- Main body (pentagonal) -->
      <polygon points='64,14 110,44 100,106 28,106 18,44' fill='url(#dm-body)' stroke='#ff2d95' stroke-width='2.5' filter='url(#dm-g)'/>
      <!-- Inner pentagonal plating -->
      <polygon points='64,26 96,48 88,94 40,94 32,48' fill='none' stroke='#ff2d95' stroke-width='1' opacity='0.6'/>
      <!-- Runic symbols on torso -->
      <g stroke='#ff2d95' stroke-width='1' fill='none' opacity='0.8'>
        <path d='M40 68 L48 68 L48 76 L44 76 L44 72'/>
        <path d='M88 68 L80 68 L80 76 L84 76 L84 72'/>
        <path d='M56 84 L64 80 L72 84'/>
      </g>
      <!-- Eye brows (angry slant) -->
      <path d='M36 44 L58 50' stroke='#ff2d95' stroke-width='2.5' stroke-linecap='round'/>
      <path d='M92 44 L70 50' stroke='#ff2d95' stroke-width='2.5' stroke-linecap='round'/>
      <!-- Glowing eyes -->
      <ellipse cx='50' cy='58' rx='7' ry='6' fill='url(#dm-eye)' filter='url(#dm-g)'/>
      <ellipse cx='78' cy='58' rx='7' ry='6' fill='url(#dm-eye)' filter='url(#dm-g)'/>
      <ellipse cx='50' cy='58' rx='2.5' ry='4' fill='#1a000f'/>
      <ellipse cx='78' cy='58' rx='2.5' ry='4' fill='#1a000f'/>
      <!-- Mouth with fangs -->
      <path d='M44 80 Q64 92 84 80 L80 88 L76 82 L72 88 L68 82 L64 88 L60 82 L56 88 L52 82 L48 88 L44 80' fill='#1a000f' stroke='#ff2d95' stroke-width='1.5'/>
      <!-- Chin detail -->
      <path d='M56 96 Q64 100 72 96' stroke='#ff2d95' stroke-width='1' fill='none'/>
      <!-- Side spike details -->
      <g fill='#ff2d95' opacity='0.8'>
        <polygon points='18,62 24,66 18,70'/>
        <polygon points='110,62 104,66 110,70'/>
      </g>
    </svg>`,

  // LEVIATHAN (mega boss) — massive ringed eye with layered rings and heat haze
  leviathan: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='lv-body' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#8ffaff'/>
          <stop offset='0.2' stop-color='#00fff0'/>
          <stop offset='0.6' stop-color='#00aaff'/>
          <stop offset='1' stop-color='#001a33'/>
        </radialGradient>
        <radialGradient id='lv-core' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#fff'/>
          <stop offset='0.5' stop-color='#00fff0'/>
          <stop offset='1' stop-color='#002540'/>
        </radialGradient>
        <filter id='lv-g'><feGaussianBlur stdDeviation='3.5'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='120' rx='50' ry='5' fill='#000' opacity='0.6'/>
      <!-- Heat shimmer -->
      <circle cx='64' cy='64' r='58' fill='none' stroke='#00aaff' stroke-width='1' opacity='0.3'/>
      <circle cx='64' cy='64' r='62' fill='none' stroke='#00fff0' stroke-width='0.5' opacity='0.2'/>
      <!-- Outer body -->
      <circle cx='64' cy='64' r='54' fill='url(#lv-body)' stroke='#00fff0' stroke-width='2.5' filter='url(#lv-g)'/>
      <!-- Armor plating ring 1 -->
      <g stroke='#00fff0' stroke-width='1.5' fill='none'>
        <circle cx='64' cy='64' r='48'/>
        <circle cx='64' cy='64' r='40'/>
        <circle cx='64' cy='64' r='32'/>
      </g>
      <!-- Nodes on outer ring -->
      <g fill='#00fff0' filter='url(#lv-g)'>
        <circle cx='64' cy='14' r='3'/>
        <circle cx='114' cy='64' r='3'/>
        <circle cx='64' cy='114' r='3'/>
        <circle cx='14' cy='64' r='3'/>
        <circle cx='99' cy='29' r='2'/>
        <circle cx='29' cy='29' r='2'/>
        <circle cx='99' cy='99' r='2'/>
        <circle cx='29' cy='99' r='2'/>
      </g>
      <!-- Dashed outer -->
      <circle cx='64' cy='64' r='52' fill='none' stroke='#8ffaff' stroke-width='0.5' stroke-dasharray='4 4' opacity='0.7'/>
      <!-- Inner circle / iris pattern -->
      <g stroke='#00fff0' stroke-width='1' fill='none' opacity='0.7'>
        <line x1='64' y1='32' x2='64' y2='96'/>
        <line x1='32' y1='64' x2='96' y2='64'/>
        <line x1='42' y1='42' x2='86' y2='86'/>
        <line x1='86' y1='42' x2='42' y2='86'/>
      </g>
      <!-- Core eye -->
      <circle cx='64' cy='64' r='18' fill='url(#lv-core)' filter='url(#lv-g)'/>
      <circle cx='64' cy='64' r='10' fill='#001a33' stroke='#00fff0' stroke-width='1'/>
      <ellipse cx='64' cy='64' rx='4' ry='8' fill='#00fff0'/>
      <ellipse cx='64' cy='64' rx='1.5' ry='5' fill='#000'/>
      <!-- Light sheen -->
      <circle cx='60' cy='60' r='1.5' fill='#fff'/>
    </svg>`,

  // VOID LORD (final boss) — dark chaotic form with multiple horns, central eye, energy tendrils
  voidlord: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='vl-body' cx='50%' cy='45%'>
          <stop offset='0' stop-color='#6d1090'/>
          <stop offset='0.5' stop-color='#2a0055'/>
          <stop offset='1' stop-color='#0a0014'/>
        </radialGradient>
        <radialGradient id='vl-eye' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#fff'/>
          <stop offset='0.3' stop-color='#ff2d95'/>
          <stop offset='1' stop-color='#3d0022'/>
        </radialGradient>
        <filter id='vl-g'><feGaussianBlur stdDeviation='4'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='122' rx='52' ry='5' fill='#000' opacity='0.7'/>
      <!-- Outer chaotic aura -->
      <g filter='url(#vl-g)' opacity='0.7'>
        <path d='M64 6 L90 20 L116 18 L112 44 L124 64 L112 84 L116 110 L90 108 L64 122 L38 108 L12 110 L16 84 L4 64 L16 44 L12 18 L38 20 Z' fill='#b847ff'/>
      </g>
      <!-- Main body shape -->
      <path d='M64 10 L88 22 L112 20 L108 46 L120 64 L108 82 L112 108 L88 106 L64 118 L40 106 L16 108 L20 82 L8 64 L20 46 L16 20 L40 22 Z' fill='url(#vl-body)' stroke='#b847ff' stroke-width='2.5' filter='url(#vl-g)'/>
      <!-- Armor hex plates -->
      <polygon points='64,20 90,38 90,82 64,100 38,82 38,38' fill='none' stroke='#ff2d95' stroke-width='1.5' opacity='0.8'/>
      <polygon points='64,32 78,42 78,72 64,82 50,72 50,42' fill='none' stroke='#ff2d95' stroke-width='1' opacity='0.6'/>
      <!-- Rune marks -->
      <g stroke='#ff2d95' stroke-width='0.7' fill='none' opacity='0.8'>
        <path d='M44 46 L44 52 L48 52'/>
        <path d='M84 46 L84 52 L80 52'/>
        <path d='M44 80 L44 74 L48 74'/>
        <path d='M84 80 L84 74 L80 74'/>
      </g>
      <!-- Central eye -->
      <ellipse cx='64' cy='60' rx='14' ry='12' fill='url(#vl-eye)' filter='url(#vl-g)'/>
      <ellipse cx='64' cy='60' rx='6' ry='10' fill='#1a000a'/>
      <ellipse cx='64' cy='60' rx='2' ry='8' fill='#ff2d95'/>
      <!-- Eye highlight -->
      <circle cx='62' cy='56' r='1.5' fill='#fff'/>
      <!-- Lower mouth/grate -->
      <g stroke='#ff2d95' stroke-width='1.5' fill='none'>
        <line x1='48' y1='78' x2='80' y2='78'/>
        <line x1='50' y1='82' x2='78' y2='82'/>
        <line x1='52' y1='86' x2='76' y2='86'/>
        <line x1='54' y1='90' x2='74' y2='90'/>
      </g>
      <!-- Energy tendrils -->
      <g stroke='#ff2d95' stroke-width='1.5' fill='none' opacity='0.8' filter='url(#vl-g)'>
        <path d='M20 40 Q16 30 22 18'/>
        <path d='M108 40 Q112 30 106 18'/>
        <path d='M20 90 Q16 100 22 110'/>
        <path d='M108 90 Q112 100 106 110'/>
      </g>
    </svg>`,

  // SWARM QUEEN (mega) — hive-mother orb with ringed abdomen and many small heads
  swarm: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='sw-body' cx='50%' cy='40%'>
          <stop offset='0' stop-color='#ffed66'/>
          <stop offset='0.5' stop-color='#ffae00'/>
          <stop offset='1' stop-color='#3d2a00'/>
        </radialGradient>
        <filter id='sw-g'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='118' rx='46' ry='5' fill='#000' opacity='0.5'/>
      <!-- Segmented legs (spider-like, 6-sided) -->
      <g stroke='#3d2a00' stroke-width='3.5' fill='none' stroke-linecap='round'>
        <path d='M38 48 L18 26 L8 36'/>
        <path d='M34 64 L10 64 L2 70'/>
        <path d='M38 80 L18 102 L8 92'/>
        <path d='M90 48 L110 26 L120 36'/>
        <path d='M94 64 L118 64 L126 70'/>
        <path d='M90 80 L110 102 L120 92'/>
      </g>
      <g fill='#ffae00'>
        <circle cx='18' cy='26' r='2.5'/>
        <circle cx='10' cy='64' r='2.5'/>
        <circle cx='18' cy='102' r='2.5'/>
        <circle cx='110' cy='26' r='2.5'/>
        <circle cx='118' cy='64' r='2.5'/>
        <circle cx='110' cy='102' r='2.5'/>
      </g>
      <!-- Queen body -->
      <circle cx='64' cy='64' r='46' fill='url(#sw-body)' stroke='#ff6600' stroke-width='2.5' filter='url(#sw-g)'/>
      <!-- Ringed segmentation -->
      <g fill='none' stroke='#3d2a00' stroke-width='1.5' opacity='0.7'>
        <ellipse cx='64' cy='64' rx='42' ry='10'/>
        <ellipse cx='64' cy='64' rx='38' ry='20'/>
        <ellipse cx='64' cy='64' rx='32' ry='30'/>
      </g>
      <!-- Brood chambers (visible eggs) -->
      <g fill='#3d2a00' stroke='#ffd600' stroke-width='0.5'>
        <ellipse cx='46' cy='56' rx='5' ry='4'/>
        <ellipse cx='82' cy='56' rx='5' ry='4'/>
        <ellipse cx='48' cy='74' rx='5' ry='4'/>
        <ellipse cx='80' cy='74' rx='5' ry='4'/>
      </g>
      <g fill='#ffd600' opacity='0.8'>
        <circle cx='46' cy='56' r='1.5'/>
        <circle cx='82' cy='56' r='1.5'/>
        <circle cx='48' cy='74' r='1.5'/>
        <circle cx='80' cy='74' r='1.5'/>
      </g>
      <!-- Head cluster -->
      <ellipse cx='64' cy='48' rx='20' ry='14' fill='url(#sw-body)' stroke='#3d2a00' stroke-width='1'/>
      <!-- Compound eyes -->
      <g fill='#ff2d95' filter='url(#sw-g)'>
        <circle cx='54' cy='44' r='3'/>
        <circle cx='74' cy='44' r='3'/>
      </g>
      <circle cx='54' cy='44' r='1' fill='#fff'/>
      <circle cx='74' cy='44' r='1' fill='#fff'/>
      <!-- Mandibles -->
      <path d='M52 56 L44 62 L48 58' fill='#3d2a00' stroke='#ffae00' stroke-width='0.5'/>
      <path d='M76 56 L84 62 L80 58' fill='#3d2a00' stroke='#ffae00' stroke-width='0.5'/>
      <!-- Antennae -->
      <g stroke='#3d2a00' stroke-width='1.5' fill='none'>
        <path d='M56 38 Q50 30 46 24'/>
        <path d='M72 38 Q78 30 82 24'/>
      </g>
      <circle cx='46' cy='24' r='1.5' fill='#ff2d95'/>
      <circle cx='82' cy='24' r='1.5' fill='#ff2d95'/>
    </svg>`,

  // CORRUPTOR (mega) — glitching chaotic form with data-corruption bands
  corruptor: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='co-body' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#ff6680'/>
          <stop offset='0.5' stop-color='#ff3355'/>
          <stop offset='1' stop-color='#3d0010'/>
        </radialGradient>
        <filter id='co-g'><feGaussianBlur stdDeviation='3'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='118' rx='46' ry='5' fill='#000' opacity='0.5'/>
      <!-- Outer glitch aura -->
      <circle cx='64' cy='64' r='54' fill='none' stroke='#ff6600' stroke-width='0.5' opacity='0.6'/>
      <circle cx='64' cy='64' r='58' fill='none' stroke='#ff3355' stroke-width='0.3' opacity='0.4'/>
      <!-- Body -->
      <circle cx='64' cy='64' r='50' fill='url(#co-body)' stroke='#ff6600' stroke-width='2.5' filter='url(#co-g)'/>
      <!-- Glitch bands (data corruption horizontal stripes) -->
      <g opacity='0.7'>
        <rect x='18' y='34' width='92' height='3' fill='#ff6600' opacity='0.6'/>
        <rect x='14' y='48' width='100' height='2' fill='#ff2d95' opacity='0.5'/>
        <rect x='22' y='62' width='84' height='4' fill='#00fff0' opacity='0.3'/>
        <rect x='16' y='78' width='96' height='3' fill='#ffd600' opacity='0.5'/>
        <rect x='20' y='92' width='88' height='2' fill='#ff6600' opacity='0.6'/>
      </g>
      <!-- Corruption paths -->
      <g stroke='#ff6600' stroke-width='1.5' fill='none' opacity='0.9' filter='url(#co-g)'>
        <path d='M14 44 Q34 24 58 44 T108 44'/>
        <path d='M14 84 Q34 64 58 84 T108 84'/>
      </g>
      <!-- Inner distorted hex -->
      <polygon points='64,28 92,44 92,84 64,100 36,84 36,44' fill='none' stroke='#ff2d95' stroke-width='1' opacity='0.8'/>
      <!-- Eye cluster (unsettling many eyes) -->
      <g fill='#ffd600' filter='url(#co-g)'>
        <circle cx='48' cy='54' r='3'/>
        <circle cx='80' cy='54' r='3'/>
        <circle cx='58' cy='66' r='2.5'/>
        <circle cx='70' cy='66' r='2.5'/>
        <circle cx='52' cy='76' r='2'/>
        <circle cx='76' cy='76' r='2'/>
      </g>
      <g fill='#1a0008'>
        <circle cx='48' cy='54' r='1'/>
        <circle cx='80' cy='54' r='1'/>
        <circle cx='58' cy='66' r='0.8'/>
        <circle cx='70' cy='66' r='0.8'/>
      </g>
      <!-- Central void core -->
      <circle cx='64' cy='64' r='12' fill='#1a0008' stroke='#ff2d95' stroke-width='1.5' filter='url(#co-g)'/>
      <circle cx='64' cy='64' r='6' fill='#ff3355'/>
      <circle cx='64' cy='64' r='2' fill='#fff'/>
      <!-- Glitch artifacts -->
      <g fill='#fff' opacity='0.7'>
        <rect x='32' y='40' width='3' height='1'/>
        <rect x='94' y='52' width='4' height='1'/>
        <rect x='26' y='68' width='2' height='1'/>
        <rect x='96' y='80' width='3' height='1'/>
      </g>
    </svg>`,

  glitch: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='gl-body' cx='50%' cy='50%'>
          <stop offset='0' stop-color='#66ffdd'/>
          <stop offset='0.6' stop-color='#00ffcc'/>
          <stop offset='1' stop-color='#003322'/>
        </radialGradient>
        <filter id='gl-g'><feGaussianBlur stdDeviation='2'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='110' rx='36' ry='5' fill='#000' opacity='0.4'/>
      <!-- Glitch body — slightly angular/distorted circle -->
      <polygon points='64,18 96,38 108,72 90,104 38,104 20,72 32,38' fill='url(#gl-body)' stroke='#00ffcc' stroke-width='2' filter='url(#gl-g)'/>
      <!-- Data corruption stripes -->
      <g opacity='0.6'>
        <rect x='28' y='50' width='72' height='3' fill='#00ffcc'/>
        <rect x='20' y='66' width='88' height='2' fill='#00ff88'/>
        <rect x='32' y='82' width='64' height='2' fill='#00ffcc'/>
      </g>
      <!-- Glitch artifacts (offset squares) -->
      <rect x='24' y='56' width='8' height='4' fill='#66ffdd' opacity='0.8'/>
      <rect x='96' y='60' width='6' height='3' fill='#66ffdd' opacity='0.8'/>
      <rect x='30' y='76' width='5' height='3' fill='#00ff88' opacity='0.7'/>
      <!-- Core split indicator -->
      <line x1='64' y1='30' x2='64' y2='100' stroke='#fff' stroke-width='1' stroke-dasharray='4,4' opacity='0.5'/>
      <!-- Eyes (glitchy — asymmetric) -->
      <circle cx='50' cy='62' r='5' fill='#fff' filter='url(#gl-g)'/>
      <circle cx='78' cy='60' r='4' fill='#fff' filter='url(#gl-g)'/>
      <circle cx='50' cy='62' r='2' fill='#003322'/>
      <circle cx='78' cy='60' r='1.5' fill='#003322'/>
      <!-- Error indicator -->
      <text x='64' y='90' text-anchor='middle' font-size='10' font-family='monospace' fill='#fff' opacity='0.8'>ERR</text>
    </svg>`,

  juggernaut: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <linearGradient id='jg-body' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stop-color='#884422'/>
          <stop offset='0.5' stop-color='#cc4400'/>
          <stop offset='1' stop-color='#331500'/>
        </linearGradient>
        <filter id='jg-g'><feGaussianBlur stdDeviation='2'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='118' rx='50' ry='6' fill='#000' opacity='0.5'/>
      <!-- Armored legs -->
      <rect x='30' y='88' width='22' height='28' rx='2' fill='#331500' stroke='#cc4400' stroke-width='2'/>
      <rect x='76' y='88' width='22' height='28' rx='2' fill='#331500' stroke='#cc4400' stroke-width='2'/>
      <!-- Heavy torso armor plates -->
      <rect x='24' y='40' width='80' height='54' rx='4' fill='url(#jg-body)' stroke='#cc4400' stroke-width='2.5' filter='url(#jg-g)'/>
      <!-- Chest plate bolts -->
      <g fill='#cc4400' stroke='#331500' stroke-width='0.5'>
        <circle cx='34' cy='52' r='3'/>
        <circle cx='94' cy='52' r='3'/>
        <circle cx='34' cy='82' r='3'/>
        <circle cx='94' cy='82' r='3'/>
      </g>
      <!-- Armor ridge lines -->
      <g stroke='#884422' stroke-width='1.5' opacity='0.6'>
        <line x1='24' y1='60' x2='104' y2='60'/>
        <line x1='24' y1='74' x2='104' y2='74'/>
      </g>
      <!-- Shoulder pauldrons -->
      <ellipse cx='22' cy='52' rx='14' ry='18' fill='#cc4400' stroke='#ff6600' stroke-width='2'/>
      <ellipse cx='106' cy='52' rx='14' ry='18' fill='#cc4400' stroke='#ff6600' stroke-width='2'/>
      <!-- Head/visor -->
      <rect x='42' y='12' width='44' height='32' rx='4' fill='#331500' stroke='#cc4400' stroke-width='2'/>
      <rect x='46' y='18' width='36' height='16' rx='2' fill='#ff4400' opacity='0.3'/>
      <!-- Visor slit -->
      <rect x='46' y='24' width='36' height='6' rx='1' fill='#ff6600' filter='url(#jg-g)'/>
      <!-- Core energy vent -->
      <rect x='50' y='56' width='28' height='12' rx='2' fill='#ff4400' opacity='0.4' filter='url(#jg-g)'/>
    </svg>`,

  parasite: () => `
    <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
      <defs>
        <radialGradient id='pa-body' cx='50%' cy='45%'>
          <stop offset='0' stop-color='#aaffaa'/>
          <stop offset='0.5' stop-color='#88ff00'/>
          <stop offset='1' stop-color='#1a2d00'/>
        </radialGradient>
        <filter id='pa-g'><feGaussianBlur stdDeviation='2'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <ellipse cx='64' cy='112' rx='28' ry='4' fill='#000' opacity='0.4'/>
      <!-- Trailing tendrils -->
      <g stroke='#88ff00' stroke-width='1.5' fill='none' opacity='0.6'>
        <path d='M44 90 Q30 100 20 108'/>
        <path d='M54 94 Q46 106 38 114'/>
        <path d='M74 94 Q82 106 90 114'/>
        <path d='M84 90 Q98 100 108 108'/>
      </g>
      <!-- Main body — teardrop/leech shape -->
      <ellipse cx='64' cy='60' rx='30' ry='40' fill='url(#pa-body)' stroke='#88ff00' stroke-width='2' filter='url(#pa-g)'/>
      <!-- Infection probe (sharp front appendage) -->
      <polygon points='64,16 70,30 58,30' fill='#44aa00' stroke='#88ff00' stroke-width='1.5'/>
      <!-- Suction pads along body -->
      <g fill='#44aa00' stroke='#88ff00' stroke-width='0.5'>
        <circle cx='48' cy='55' r='4'/>
        <circle cx='80' cy='55' r='4'/>
        <circle cx='44' cy='70' r='3.5'/>
        <circle cx='84' cy='70' r='3.5'/>
        <circle cx='50' cy='84' r='3'/>
        <circle cx='78' cy='84' r='3'/>
      </g>
      <!-- Neural eye cluster -->
      <circle cx='60' cy='44' r='5' fill='#fff' filter='url(#pa-g)'/>
      <circle cx='68' cy='44' r='5' fill='#fff' filter='url(#pa-g)'/>
      <circle cx='60' cy='44' r='2' fill='#1a2d00'/>
      <circle cx='68' cy='44' r='2' fill='#1a2d00'/>
      <!-- Infection pulse indicator -->
      <circle cx='64' cy='64' r='8' fill='none' stroke='#aaffaa' stroke-width='1' opacity='0.6' filter='url(#pa-g)'/>
    </svg>`,
};

// ---------- API ----------
// Each sprite is rasterized to an offscreen HTMLCanvasElement at boot.
// Canvas→canvas drawImage is 100% reliable, no decode-timing issues.

const towerSprites = new Map<TowerId, HTMLCanvasElement>();
const enemySprites = new Map<EnemyId, HTMLCanvasElement>();
// Images too, for DOM usage (tower palette portraits).
const towerDataUrls = new Map<TowerId, string>();

export function preloadSprites(): Promise<void> {
  const loads: Promise<void>[] = [];
  for (const id of Object.keys(towerSVG) as TowerId[]) {
    const svg = towerSVG[id]();
    towerDataUrls.set(id, svgToDataUrl(svg));
    loads.push(rasterize(svg).then((canvas) => { towerSprites.set(id, canvas); }));
  }
  for (const id of Object.keys(enemySVG) as EnemyId[]) {
    loads.push(rasterize(enemySVG[id]()).then((canvas) => { enemySprites.set(id, canvas); }));
  }
  return Promise.all(loads).then(() => undefined);
}

function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

function rasterize(svg: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.width = SIZE;
    img.height = SIZE;
    const url = svgToDataUrl(svg);
    const finish = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      try { ctx.drawImage(img, 0, 0, SIZE, SIZE); } catch { /* fallback: blank */ }
      resolve(canvas);
    };
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(finish).catch(finish);
      else finish();
    };
    img.onerror = finish;
    img.src = url;
  });
}

export function getTowerSprite(id: TowerId): HTMLCanvasElement | undefined { return towerSprites.get(id); }
export function getEnemySprite(id: EnemyId): HTMLCanvasElement | undefined { return enemySprites.get(id); }
export function getTowerDataUrl(id: TowerId): string | undefined { return towerDataUrls.get(id); }
