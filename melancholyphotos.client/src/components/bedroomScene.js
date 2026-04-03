import * as THREE from 'three';

export const PLAYER_HEIGHT = 1.7;
export const MOVE_SPEED = 4.5;

// Room dimensions
const ROOM_W = 9.0;
const ROOM_H = 3.5;
const ROOM_D = 12.0;
const HW = ROOM_W / 2; // 4.5
const HD = ROOM_D / 2; // 6.0

// Cyberpunk palette
const C = {
    floor:     0x0c0c1a,
    wall:      0x080810,
    ceiling:   0x060608,
    neonCyan:  0x00ffff,
    neonMag:   0xff00bb,
    neonPurp:  0x9900ff,
    bedFrame:  0x14101e,
    deskBody:  0x181828,
    monFrame:  0x0a0a14,
};

function mat(color, emissive = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity, side: THREE.DoubleSide });
}

function neonMat(color) {
    return new THREE.MeshLambertMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 3.0,
    });
}

// Emissive thin box used as a neon light strip.
// lengthX/Y/Z: pass the desired length along each axis; unused axes are set to 0.04 (tube thickness).
function addNeonStrip(scene, x, y, z, lengthX, lengthY, lengthZ, color, lightIntensity = 1.2, lightDist = 5) {
    const lx = Math.max(lengthX, 0.04);
    const ly = Math.max(lengthY, 0.04);
    const lz = Math.max(lengthZ, 0.04);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(lx, ly, lz), neonMat(color));
    strip.position.set(x, y, z);
    scene.add(strip);

    const light = new THREE.PointLight(color, lightIntensity, lightDist);
    light.position.set(x, y, z);
    scene.add(light);
}

// ── Procedural textures ────────────────────────────────────────────────────────

function createFloorTexture() {
    const W = 512, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0c0c1a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,80,180,0.35)';
    ctx.lineWidth = 1;
    const CELL = 64;
    for (let gx = 0; gx <= W; gx += CELL) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += CELL) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Dot at intersections
    for (let gx = 0; gx <= W; gx += CELL) {
        for (let gy = 0; gy <= H; gy += CELL) {
            ctx.fillStyle = 'rgba(0,150,255,0.2)';
            ctx.fillRect(gx - 2, gy - 2, 4, 4);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4);
    return tex;
}

function createCityTexture() {
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#010108');
    sky.addColorStop(0.65, '#08052a');
    sky.addColorStop(1, '#0f0535');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let s = 0; s < 200; s++) {
        const sx = Math.random() * W, sy = Math.random() * H * 0.55;
        ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`;
        ctx.fillRect(sx, sy, 1, 1);
    }

    // Rain streaks
    ctx.strokeStyle = 'rgba(80,120,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 100; i++) {
        const rx = Math.random() * W, ry = Math.random() * H;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 18); ctx.stroke();
    }

    // Back-layer buildings
    for (let b = 0; b < 20; b++) {
        const bw = 25 + Math.random() * 85;
        const bh = 90 + Math.random() * 310;
        const bx = b * (W / 17) - 10 + Math.random() * 25;
        const by = H - bh;
        ctx.fillStyle = '#04041a';
        ctx.fillRect(bx, by, bw, bh);
        for (let wy = by + 6; wy < H - 6; wy += 9) {
            for (let wx = bx + 3; wx < bx + bw - 3; wx += 9) {
                if (Math.random() > 0.55) {
                    const r = Math.random();
                    ctx.fillStyle = r > 0.5 ? 'rgba(80,180,255,0.65)' : r > 0.25 ? 'rgba(255,130,50,0.5)' : 'rgba(255,60,160,0.55)';
                    ctx.fillRect(wx, wy, 4, 5);
                }
            }
        }
    }

    // Front-layer buildings
    for (let b = 0; b < 10; b++) {
        const bw = 55 + Math.random() * 110;
        const bh = 70 + Math.random() * 190;
        const bx = b * (W / 8) - 25 + Math.random() * 40;
        const by = H - bh;
        ctx.fillStyle = '#020210';
        ctx.fillRect(bx, by, bw, bh);
        for (let wy = by + 8; wy < H - 8; wy += 12) {
            for (let wx = bx + 5; wx < bx + bw - 5; wx += 12) {
                if (Math.random() > 0.6) {
                    ctx.fillStyle = 'rgba(0,200,255,0.7)';
                    ctx.fillRect(wx, wy, 5, 6);
                }
            }
        }
    }

    // Neon signs
    const signs = [
        { x: 90,  y: 185, text: 'CYBER',    color: '#ff00cc' },
        { x: 270, y: 215, text: '電気',      color: '#00ffff' },
        { x: 510, y: 170, text: 'NEON',     color: '#ffcc00' },
        { x: 720, y: 195, text: 'VOID',     color: '#ff0066' },
        { x: 900, y: 180, text: 'RUN',      color: '#00ff88' },
    ];
    for (const sign of signs) {
        ctx.shadowColor = sign.color;
        ctx.shadowBlur = 22;
        ctx.fillStyle = sign.color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(sign.text, sign.x, sign.y);
    }
    ctx.shadowBlur = 0;

    // Horizon glow
    const hg = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.83);
    hg.addColorStop(0, 'rgba(255,0,180,0)');
    hg.addColorStop(0.5, 'rgba(255,0,180,0.38)');
    hg.addColorStop(1, 'rgba(0,150,255,0.22)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, H * 0.62, W, H * 0.38);

    // Wet-ground reflections
    const refl = ctx.createLinearGradient(0, H * 0.86, 0, H);
    refl.addColorStop(0, 'rgba(0,0,0,0)');
    refl.addColorStop(0.5, 'rgba(255,0,180,0.22)');
    refl.addColorStop(1, 'rgba(0,200,255,0.18)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, H * 0.86, W, H * 0.14);

    return new THREE.CanvasTexture(canvas);
}

function createMonitorTexture(seed) {
    const W = 512, H = 320;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000608';
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    for (let sy = 0; sy < H; sy += 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, sy, W, 1);
    }

    if (seed % 2 === 0) {
        // Code terminal
        const lines = [
            '> NEURAL_LINK established',
            '> scanning perimeter...',
            '  [████████░░░░] 68%',
            '> anomaly at node 7',
            '> override? [Y/n] _',
            '',
            'MEM  47.2 GB / 64 GB',
            'NET  847 Mbps ↑  1.2 Gbps ↓',
            '>>> running decrypt.exe',
            '  key fragments: 3/7 found',
            '  WARNING: entity detected',
        ];
        ctx.font = '13px monospace';
        lines.forEach((line, i) => {
            ctx.fillStyle = i === 4 ? '#00ff88' : i % 3 === 0 ? '#00ccff' : '#007744';
            ctx.fillText(line, 12, 28 + i * 24);
        });
        // Blinking cursor block
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(12, 28 + 4 * 24 + 6, 10, 14);
    } else {
        // Waveform / frequency graph
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let gx = 0; gx < W; gx++) {
            const gy = H / 2 + Math.sin(gx * 0.04 + seed) * 65 + Math.sin(gx * 0.11 + seed * 2) * 28;
            gx === 0 ? ctx.moveTo(gx, gy) : ctx.lineTo(gx, gy);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ff00aa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = 0; gx < W; gx++) {
            const gy = H / 2 + Math.cos(gx * 0.06 + seed * 1.3) * 42 + Math.sin(gx * 0.15) * 18;
            gx === 0 ? ctx.moveTo(gx, gy) : ctx.lineTo(gx, gy);
        }
        ctx.stroke();

        ctx.font = '11px monospace';
        ctx.fillStyle = '#00ffcc';
        ctx.fillText('FREQ ANALYSIS', 12, 18);
        ctx.fillStyle = '#ff00aa';
        ctx.fillText('NEURAL PATTERN', 12, 34);
    }

    // Screen vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    return new THREE.CanvasTexture(canvas);
}

function createPosterTexture(type) {
    const W = 256, H = 384;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (type === 0) {
        // "Ghost in the Net" — concentric rings
        ctx.fillStyle = '#080012'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(0,255,255,0.25)'; ctx.lineWidth = 0.5;
        for (let gx = 0; gx < W; gx += 16) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (let gy = 0; gy < H; gy += 16) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
        for (let r = 1; r <= 8; r++) {
            ctx.strokeStyle = `rgba(0,${160 + r * 11},255,${0.25 + r * 0.07})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(W / 2, H * 0.5, 14 + r * 19, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#ff00cc'; ctx.shadowColor = '#ff00cc'; ctx.shadowBlur = 14;
        ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('GHOST IN', W / 2, 40); ctx.fillText('THE NET', W / 2, 66);
        ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10;
        ctx.font = 'bold 13px monospace'; ctx.fillText('NEURAL DRIFT', W / 2, H - 28);
        ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(0,255,255,0.6)'; ctx.fillText('Vol. III', W / 2, H - 12);
        ctx.shadowBlur = 0;

    } else if (type === 1) {
        // Neon City — perspective grid
        ctx.fillStyle = '#010108'; ctx.fillRect(0, 0, W, H);
        const vp = { x: W / 2, y: H * 0.65 };
        ctx.strokeStyle = 'rgba(0,80,255,0.3)'; ctx.lineWidth = 0.7;
        for (let gi = 0; gi <= 12; gi++) {
            const gfx = gi * (W / 12);
            ctx.beginPath(); ctx.moveTo(gfx, H); ctx.lineTo(vp.x, vp.y); ctx.stroke();
        }
        for (let gi = 0; gi <= 8; gi++) {
            const t = gi / 8;
            const gy = vp.y + t * (H - vp.y);
            const spread = t * W / 2;
            ctx.beginPath(); ctx.moveTo(vp.x - spread, gy); ctx.lineTo(vp.x + spread, gy); ctx.stroke();
        }
        [[10, 70, H * 0.6], [55, 50, H * 0.5], [100, 30, H * 0.4], [160, 50, H * 0.52], [205, 60, H * 0.57]].forEach(([bx, bw, top]) => {
            ctx.fillStyle = '#020215'; ctx.fillRect(bx, top, bw, vp.y - top);
        });
        const hg = ctx.createLinearGradient(0, vp.y - 22, 0, vp.y + 12);
        hg.addColorStop(0, 'rgba(255,0,180,0)'); hg.addColorStop(1, 'rgba(255,0,180,0.85)');
        ctx.fillStyle = hg; ctx.fillRect(0, vp.y - 22, W, 34);
        ctx.fillStyle = '#ff00cc'; ctx.shadowColor = '#ff00cc'; ctx.shadowBlur = 22;
        ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
        ctx.fillText('NEON', W / 2, 50); ctx.fillText('CITY', W / 2, 86);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,0,180,0.5)'; ctx.font = '9px monospace';
        ctx.fillText('2087  ◈  CYBERPUNK ERA', W / 2, H - 14);

    } else {
        // Glitch art
        ctx.fillStyle = '#03000a'; ctx.fillRect(0, 0, W, H);
        for (let g = 0; g < 22; g++) {
            const gy = Math.random() * H, gh = 1 + Math.random() * 5;
            const goff = Math.random() * 20 - 10;
            ctx.fillStyle = g % 3 === 0 ? 'rgba(0,255,255,0.7)' : g % 3 === 1 ? 'rgba(255,0,200,0.6)' : 'rgba(150,0,255,0.5)';
            ctx.fillRect(goff, gy, W, gh);
        }
        ctx.font = 'bold 52px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ['rgba(255,0,200,0.2)', 'rgba(0,255,255,0.2)', 'rgba(255,255,255,0.9)'].forEach((col, i) => {
            ctx.fillStyle = col; ctx.fillText('ER ROR', W / 2 + (i - 1) * 3, H / 2 + (i - 1) * 3);
        });
        ctx.textBaseline = 'alphabetic'; ctx.font = '11px monospace';
        ctx.fillStyle = '#9900ff'; ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 8;
        ctx.fillText('0xDEAD BEEF', W / 2, H / 2 + 70);
        ctx.fillText('SEGFAULT AT 0x7FFF', W / 2, H / 2 + 90);
        ctx.shadowBlur = 0;
    }

    return new THREE.CanvasTexture(canvas);
}

function createHoloTexture() {
    const W = 512, H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000a0f'; ctx.fillRect(0, 0, W, H);

    // Hex grid
    const HEX_R = 22;
    const rows = Math.ceil(H / (HEX_R * 1.73)) + 1;
    const cols = Math.ceil(W / (HEX_R * 2)) + 1;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cx = col * HEX_R * 2 + (row % 2) * HEX_R;
            const cy = row * HEX_R * 1.73;
            const alpha = 0.08 + Math.random() * 0.14;
            ctx.strokeStyle = `rgba(0,255,255,${alpha})`; ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const angle = v * Math.PI / 3;
                const vx = cx + Math.cos(angle) * HEX_R * 0.88;
                const vy = cy + Math.sin(angle) * HEX_R * 0.88;
                v === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
            }
            ctx.closePath(); ctx.stroke();
            if (Math.random() > 0.92) {
                ctx.fillStyle = `rgba(0,255,255,${0.04 + Math.random() * 0.08})`; ctx.fill();
            }
        }
    }

    ctx.fillStyle = 'rgba(0,255,255,0.8)'; ctx.font = 'bold 17px monospace'; ctx.textAlign = 'center';
    ctx.fillText('◈  SYSTEM STATUS  ◈', W / 2, 34);
    ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(0,200,255,0.65)';
    ctx.fillText('UPTIME: 847h 23m', W / 2, 70);
    ctx.fillText('NET LATENCY: 2ms', W / 2, 92);
    ctx.fillText('THREATS: NEUTRALIZED', W / 2, 114);
    ctx.fillText('NEURAL SYNC: 97.4%', W / 2, 136);

    return new THREE.CanvasTexture(canvas);
}

// ── Scene builder ──────────────────────────────────────────────────────────────

export function buildBedroomScene(scene) {

    // Lighting: dim cool ambient + accent point lights from neons
    scene.add(new THREE.AmbientLight(0x0a0820, 10.0));

    // ── Overhead ceiling light (warm-white pendant, center of room) ────────────
    const pendantY = ROOM_H - 0.06;

    // Pendant fixture housing (small flattened cylinder)
    const pendantHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.12, 16),
        new THREE.MeshLambertMaterial({ color: 0x1a1a28 })
    );
    pendantHousing.position.set(0, pendantY - 0.06, 0);
    scene.add(pendantHousing);

    // Emissive bulb disk (faces downward)
    const bulbDisk = new THREE.Mesh(
        new THREE.CircleGeometry(0.14, 16),
        new THREE.MeshLambertMaterial({
            color: 0xfff0cc,
            emissive: new THREE.Color(0xfff0cc),
            emissiveIntensity: 4.0,
        })
    );
    bulbDisk.rotation.x = Math.PI / 2;
    bulbDisk.position.set(0, pendantY - 0.13, 0);
    scene.add(bulbDisk);

    // Main overhead light — warm white, fills the whole room
    const overheadLight = new THREE.PointLight(0xffe8cc, 40, ROOM_D * 2);
    overheadLight.position.set(0, pendantY - 0.18, 0);
    scene.add(overheadLight);

    // Softer fill light slightly forward to reduce harsh shadows near desk/bed
    const fillLight = new THREE.PointLight(0xffe0bb, 18, ROOM_D * 1.5);
    fillLight.position.set(0, ROOM_H * 0.6, 0);
    scene.add(fillLight);

    // ── Floor ──────────────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_W, ROOM_D),
        new THREE.MeshLambertMaterial({ map: createFloorTexture(), side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    scene.add(floor);

    // ── Ceiling ────────────────────────────────────────────────────────────────
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mat(C.ceiling));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, ROOM_H, 0);
    scene.add(ceil);

    // ── Walls ──────────────────────────────────────────────────────────────────
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), mat(C.wall));
    backWall.position.set(0, ROOM_H / 2, -HD);
    scene.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), mat(C.wall));
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(0, ROOM_H / 2, HD);
    scene.add(frontWall);

    // ── Exit door (front wall, center) ────────────────────────────────────────
    const DOOR_X = 0, DOOR_W = 1.05, DOOR_H = 2.25;
    const DOOR_Z = HD - 0.04; // just inside the front wall

    // Door frame
    const doorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_W + 0.16, DOOR_H + 0.12, 0.08),
        mat(0x0a0a18)
    );
    doorFrame.position.set(DOOR_X, DOOR_H / 2, DOOR_Z);
    scene.add(doorFrame);

    // Door panel
    const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.06),
        mat(0x070710)
    );
    doorPanel.position.set(DOOR_X, DOOR_H / 2, DOOR_Z - 0.01);
    scene.add(doorPanel);

    // Cyan neon frame trim
    addNeonStrip(scene, DOOR_X, DOOR_H + 0.07, DOOR_Z, DOOR_W + 0.20, 0.04, 0.04, C.neonCyan, 0.9, 3);
    addNeonStrip(scene, DOOR_X, 0.04,           DOOR_Z, DOOR_W + 0.20, 0.04, 0.04, C.neonCyan, 0.6, 2);
    addNeonStrip(scene, DOOR_X - DOOR_W / 2 - 0.08, DOOR_H / 2, DOOR_Z, 0.04, DOOR_H + 0.16, 0.04, C.neonCyan, 0.8, 2);
    addNeonStrip(scene, DOOR_X + DOOR_W / 2 + 0.08, DOOR_H / 2, DOOR_Z, 0.04, DOOR_H + 0.16, 0.04, C.neonCyan, 0.8, 2);

    // Magenta horizontal accent lines on door panel
    addNeonStrip(scene, DOOR_X, DOOR_H * 0.33, DOOR_Z - 0.04, DOOR_W - 0.12, 0.03, 0.03, C.neonMag, 0.35, 1.5);
    addNeonStrip(scene, DOOR_X, DOOR_H * 0.66, DOOR_Z - 0.04, DOOR_W - 0.12, 0.03, 0.03, C.neonMag, 0.35, 1.5);

    // Door handle
    const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.13, 0.045),
        new THREE.MeshLambertMaterial({ color: 0x334444, emissive: new THREE.Color(0x00aaaa), emissiveIntensity: 0.6 })
    );
    handle.position.set(DOOR_X + 0.38, DOOR_H / 2, DOOR_Z - 0.055);
    scene.add(handle);

    const exitDoor = { x: DOOR_X, z: DOOR_Z };

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), mat(C.wall));
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-HW, ROOM_H / 2, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), mat(C.wall));
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(HW, ROOM_H / 2, 0);
    scene.add(rightWall);

    // ── City window on back wall (left of center) ──────────────────────────────
    const WIN_W = 3.6, WIN_H = 1.9, WIN_X = -1.2;
    const WIN_Y_BOT = 1.1; // bottom edge above floor
    const WIN_Y_CEN = WIN_Y_BOT + WIN_H / 2;
    const WEPS = -HD + 0.02; // z epsilon in front of wall

    const windowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(WIN_W, WIN_H),
        new THREE.MeshLambertMaterial({
            map: createCityTexture(),
            emissive: new THREE.Color(0x1a0a30),
            emissiveIntensity: 1.0,
        })
    );
    windowMesh.position.set(WIN_X, WIN_Y_CEN, WEPS);
    scene.add(windowMesh);

    // Cyan neon frame around window (horizontal strips along X, vertical strips along Y)
    addNeonStrip(scene, WIN_X, WIN_Y_BOT + WIN_H + 0.04, WEPS, WIN_W + 0.2, 0.04, 0.04, C.neonCyan, 0.7, 3);
    addNeonStrip(scene, WIN_X, WIN_Y_BOT - 0.04,         WEPS, WIN_W + 0.2, 0.04, 0.04, C.neonCyan, 0.7, 3);
    addNeonStrip(scene, WIN_X - WIN_W / 2 - 0.04, WIN_Y_CEN, WEPS, 0.04, WIN_H + 0.12, 0.04, C.neonCyan, 0.7, 3);
    addNeonStrip(scene, WIN_X + WIN_W / 2 + 0.04, WIN_Y_CEN, WEPS, 0.04, WIN_H + 0.12, 0.04, C.neonCyan, 0.7, 3);

    // Cool purple/blue glow from the city window
    const winLight = new THREE.PointLight(0x4020b0, 3.0, 9);
    winLight.position.set(WIN_X, WIN_Y_CEN, -HD + 1.2);
    scene.add(winLight);

    // ── Ceiling neon strips ────────────────────────────────────────────────────
    const STRIP_Y = ROOM_H - 0.05;
    const INSET = 0.15;
    // Front & back (run along X)
    addNeonStrip(scene, 0, STRIP_Y,  HD - INSET, ROOM_W - 0.3, 0.04, 0.04, C.neonCyan, 1.0, 7);
    addNeonStrip(scene, 0, STRIP_Y, -HD + INSET, ROOM_W - 0.3, 0.04, 0.04, C.neonMag,  1.0, 7);
    // Left & right (run along Z)
    addNeonStrip(scene, -HW + INSET, STRIP_Y, 0, 0.04, 0.04, ROOM_D - 0.3, C.neonMag,  0.9, 7);
    addNeonStrip(scene,  HW - INSET, STRIP_Y, 0, 0.04, 0.04, ROOM_D - 0.3, C.neonCyan, 0.9, 7);

    // Floor accent strips along front and back walls
    addNeonStrip(scene, 0, 0.02,  HD - INSET, ROOM_W - 0.3, 0.04, 0.04, C.neonPurp, 0.45, 3);
    addNeonStrip(scene, 0, 0.02, -HD + INSET, ROOM_W - 0.3, 0.04, 0.04, C.neonPurp, 0.45, 3);

    // ── Bed (against left wall, center-left of room) ───────────────────────────
    const BED_W = 2.0, BED_L = 3.8, BED_PLAT_H = 0.32;
    const BED_X = -HW + BED_W / 2 + 0.08;
    const BED_Z = -0.8;

    // Platform
    const bedPlatform = new THREE.Mesh(new THREE.BoxGeometry(BED_W, BED_PLAT_H, BED_L), mat(C.bedFrame));
    bedPlatform.position.set(BED_X, BED_PLAT_H / 2, BED_Z);
    scene.add(bedPlatform);

    // Mattress
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(BED_W - 0.08, 0.18, BED_L - 0.08), mat(0x1a0a2a));
    mattress.position.set(BED_X, BED_PLAT_H + 0.09, BED_Z);
    scene.add(mattress);

    // Pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(BED_W - 0.32, 0.13, 0.52), mat(0x2a1040));
    pillow.position.set(BED_X, BED_PLAT_H + 0.22, BED_Z - BED_L / 2 + 0.35);
    scene.add(pillow);

    // Headboard (against left wall, faces +X into room)
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, BED_L), mat(C.bedFrame));
    headboard.position.set(BED_X - BED_W / 2 - 0.045, BED_PLAT_H + 0.375, BED_Z);
    scene.add(headboard);

    // Cyan under-bed neon
    addNeonStrip(scene, BED_X, 0.04, BED_Z, BED_W - 0.2, 0.04, 0.04, C.neonCyan, 0.9, 4);
    // Magenta strip along front edge of platform
    addNeonStrip(scene, BED_X, BED_PLAT_H / 2, BED_Z + BED_L / 2, BED_W - 0.2, 0.04, 0.04, C.neonMag, 0.6, 3);

    // Crumpled blanket (simple box, slightly raised/rotated)
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(BED_W - 0.1, 0.07, BED_L * 0.55), mat(0x2a0a3a));
    blanket.rotation.z = 0.04;
    blanket.position.set(BED_X, BED_PLAT_H + 0.22, BED_Z + 0.4);
    scene.add(blanket);

    // ── Desk (back-right, against back wall) ───────────────────────────────────
    const DESK_W = 3.4, DESK_D = 0.9, DESK_H = 0.78;
    const DESK_X = HW / 2 + 0.7;
    const DESK_Z = -HD + DESK_D / 2 + 0.08;

    // Desk top
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(DESK_W, 0.055, DESK_D), mat(C.deskBody));
    deskTop.position.set(DESK_X, DESK_H, DESK_Z);
    scene.add(deskTop);

    // Legs
    [
        [DESK_X - DESK_W / 2 + 0.1, DESK_Z - DESK_D / 2 + 0.09],
        [DESK_X + DESK_W / 2 - 0.1, DESK_Z - DESK_D / 2 + 0.09],
        [DESK_X - DESK_W / 2 + 0.1, DESK_Z + DESK_D / 2 - 0.09],
        [DESK_X + DESK_W / 2 - 0.1, DESK_Z + DESK_D / 2 - 0.09],
    ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, DESK_H - 0.03, 0.06), mat(0x0f0f1e));
        leg.position.set(lx, (DESK_H - 0.03) / 2, lz);
        scene.add(leg);
    });

    // Desk front neon strip
    addNeonStrip(scene, DESK_X, DESK_H + 0.04, DESK_Z + DESK_D / 2, DESK_W, 0.04, 0.04, C.neonMag, 0.7, 3);

    // ── Monitors ───────────────────────────────────────────────────────────────
    const MON_THICK = 0.055;
    const BACK_WALL_Z = -HD + MON_THICK / 2 + 0.09;

    // Main monitor (center-left on desk)
    const mon1Tex = createMonitorTexture(0);
    const mon1W = 1.1, mon1H = 0.7;
    addMonitor(scene, DESK_X - 0.75, DESK_H + mon1H / 2 + 0.05, BACK_WALL_Z, mon1W, mon1H, MON_THICK, mon1Tex, 0x0033aa);

    // Second monitor (right, slightly angled)
    const mon2Tex = createMonitorTexture(1);
    const mon2W = 0.95, mon2H = 0.62;
    addMonitor(scene, DESK_X + 0.75, DESK_H + mon2H / 2 + 0.05, BACK_WALL_Z, mon2W, mon2H, MON_THICK, mon2Tex, 0xaa0055, -0.22);

    // Keyboard
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.3), mat(0x0c0c18));
    keyboard.position.set(DESK_X - 0.35, DESK_H + 0.025, DESK_Z + 0.2);
    scene.add(keyboard);
    addNeonStrip(scene, DESK_X - 0.35, DESK_H + 0.008, DESK_Z + 0.2, 0.86, 0.04, 0.04, C.neonCyan, 0.4, 2);

    // ── Chair ──────────────────────────────────────────────────────────────────
    const CHAIR_X = DESK_X - 0.4, CHAIR_Z = DESK_Z + 1.15;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.52), mat(0x12101e));
    seat.position.set(CHAIR_X, 0.50, CHAIR_Z);
    scene.add(seat);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.52, 0.065), mat(0x12101e));
    backrest.position.set(CHAIR_X, 0.50 + 0.52 / 2 + 0.04, CHAIR_Z - 0.26);
    scene.add(backrest);

    const chairPost = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.50, 6), mat(0x0a0a14));
    chairPost.position.set(CHAIR_X, 0.25, CHAIR_Z);
    scene.add(chairPost);

    for (let l = 0; l < 5; l++) {
        const ang = (l / 5) * Math.PI * 2;
        const lx2 = CHAIR_X + Math.cos(ang) * 0.26;
        const lz2 = CHAIR_Z + Math.sin(ang) * 0.26;
        const cleg = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.022, 0.04), mat(0x0a0a14));
        cleg.position.set((CHAIR_X + lx2) / 2, 0.018, (CHAIR_Z + lz2) / 2);
        cleg.rotation.y = ang;
        scene.add(cleg);
    }

    // ── Bookshelf / tower unit (right wall, mid-room) ──────────────────────────
    const SHEL_X = HW - 0.22, SHEL_Z = 1.6;
    const SHEL_W = 0.28, SHEL_H = 2.1, SHEL_D = 1.2;

    const shelfBody = new THREE.Mesh(new THREE.BoxGeometry(SHEL_W, SHEL_H, SHEL_D), mat(0x0f0f1c));
    shelfBody.position.set(SHEL_X, SHEL_H / 2, SHEL_Z);
    scene.add(shelfBody);

    for (let s = 0; s < 3; s++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(SHEL_W, 0.035, SHEL_D - 0.04), mat(0x1a1a2a));
        plank.position.set(SHEL_X, 0.45 + s * 0.58, SHEL_Z);
        scene.add(plank);
    }

    // Purple neon accent on shelf edge
    addNeonStrip(scene, SHEL_X - SHEL_W / 2 - 0.025, SHEL_H / 2, SHEL_Z, 0.04, SHEL_H, 0.04, C.neonPurp, 0.6, 3);

    // LED strip on the visible LEFT face of each shelf plank (facing into the room)
    // + point light offset into the room so it actually illuminates shelf contents
    const SHEL_FACE_X = SHEL_X - SHEL_W / 2 - 0.012; // just outside the left face
    const shelfLedColors = [C.neonCyan, C.neonMag, C.neonPurp];
    for (let s = 0; s < 3; s++) {
        const plankY = 0.45 + s * 0.58;
        const color  = shelfLedColors[s];

        // Emissive strip running along the depth (Z) of the shelf, on the outer left face
        addNeonStrip(scene, SHEL_FACE_X, plankY - 0.008, SHEL_Z, 0.04, 0.04, SHEL_D - 0.08, color, 1.2, 2.2);

        // Point light offset into the room so it reaches shelf surfaces and any objects on them
        const bayLight = new THREE.PointLight(color, 4.0, 2.5);
        bayLight.position.set(SHEL_X - SHEL_W / 2 - 0.55, plankY + 0.2, SHEL_Z);
        scene.add(bayLight);
    }

    // Small items on shelves: stack of books, a figurine box, a glowing orb
    const shelfItemY = [0.45 + 0.035 / 2, 0.45 + 0.58 + 0.035 / 2, 0.45 + 1.16 + 0.035 / 2];

    // Shelf 0: stack of two small "books"
    [[0, 0x1a0a2e], [1, 0x0a1a2e]].forEach(([i, col]) => {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.14), mat(col));
        book.position.set(SHEL_X, shelfItemY[0] + 0.035 + 0.09 + i * 0.19, SHEL_Z + 0.2 - i * 0.05);
        scene.add(book);
    });

    // Shelf 1: small glowing orb
    const orbMat = new THREE.MeshLambertMaterial({ color: 0x00ffcc, emissive: new THREE.Color(0x00ffcc), emissiveIntensity: 2.5 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), orbMat);
    orb.position.set(SHEL_X, shelfItemY[1] + 0.035 + 0.075, SHEL_Z - 0.1);
    scene.add(orb);
    const orbGlow = new THREE.PointLight(0x00ffcc, 1.8, 1.2);
    orbGlow.position.copy(orb.position);
    scene.add(orbGlow);

    // Shelf 2: small terminal box
    const termBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), mat(0x0a0a18));
    termBox.position.set(SHEL_X, shelfItemY[2] + 0.035 + 0.07, SHEL_Z + 0.1);
    scene.add(termBox);
    const termScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.09),
        new THREE.MeshLambertMaterial({ color: 0x00ff88, emissive: new THREE.Color(0x00ff88), emissiveIntensity: 2.0 })
    );
    termScreen.rotation.y = Math.PI / 2;
    termScreen.position.set(SHEL_X - 0.091, shelfItemY[2] + 0.035 + 0.07, SHEL_Z + 0.1);
    scene.add(termScreen);

    // ── Posters ────────────────────────────────────────────────────────────────
    addPoster(scene, HW - 0.02, 1.75, 3.2, -Math.PI / 2, createPosterTexture(0));   // right wall, near entrance
    addPoster(scene, -HW + 0.02, 1.75, -1.5, Math.PI / 2, createPosterTexture(1));  // left wall, above bed
    addPoster(scene, 2.6, 1.75, -HD + 0.02, 0, createPosterTexture(2));             // back wall, right of window

    // ── Holographic panel above desk ───────────────────────────────────────────
    const HOLO_Y_BASE = DESK_H + 1.5;
    const holo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.85, 0.9),
        new THREE.MeshLambertMaterial({
            map: createHoloTexture(),
            transparent: true,
            opacity: 0.78,
            emissive: new THREE.Color(0x001828),
            emissiveIntensity: 2.2,
            side: THREE.DoubleSide,
        })
    );
    holo.position.set(DESK_X - 0.2, HOLO_Y_BASE, DESK_Z - 0.2);
    holo.rotation.x = -0.14;
    scene.add(holo);

    const holoLight = new THREE.PointLight(0x00ffff, 1.1, 4);
    holoLight.position.set(DESK_X - 0.2, HOLO_Y_BASE, DESK_Z - 0.2 + 0.5);
    scene.add(holoLight);

    // ── Obstacles ──────────────────────────────────────────────────────────────
    const P = 0.35; // player buffer
    const obstacles = [
        // Bed
        { minX: BED_X - BED_W / 2 - P, maxX: BED_X + BED_W / 2 + P, minZ: BED_Z - BED_L / 2 - P, maxZ: BED_Z + BED_L / 2 + P },
        // Desk
        { minX: DESK_X - DESK_W / 2 - P, maxX: DESK_X + DESK_W / 2 + P, minZ: DESK_Z - DESK_D / 2 - P, maxZ: DESK_Z + DESK_D / 2 + P },
        // Chair
        { minX: CHAIR_X - 0.42, maxX: CHAIR_X + 0.42, minZ: CHAIR_Z - 0.45, maxZ: CHAIR_Z + 0.45 },
        // Bookshelf
        { minX: SHEL_X - SHEL_W / 2 - P, maxX: SHEL_X + SHEL_W / 2 + P, minZ: SHEL_Z - SHEL_D / 2 - P, maxZ: SHEL_Z + SHEL_D / 2 + P },
    ];

    // ── Walkable zones ─────────────────────────────────────────────────────────
    const zones = [{ minX: -HW + 0.3, maxX: HW - 0.3, minZ: -HD + 0.3, maxZ: HD - 0.3 }];

    const spawnX = 0;
    const spawnZ = 0;  // center of the room, well away from the door

    // Animate the holographic panel
    function updateScene(time) {
        holo.position.y = HOLO_Y_BASE + Math.sin(time * 0.9) * 0.045;
        holo.rotation.y = Math.sin(time * 0.35) * 0.06;
    }

    return { obstacles, zones, spawnX, spawnZ, updateScene, exitDoor };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function addMonitor(scene, x, y, z, mw, mh, mt, screenTex, glowColor, rotY = 0) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, mt), mat(C.monFrame));
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    scene.add(frame);

    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(mw - 0.05, mh - 0.05),
        new THREE.MeshLambertMaterial({ map: screenTex, emissive: new THREE.Color(glowColor), emissiveIntensity: 1.2 })
    );
    screen.position.set(x + Math.sin(rotY) * (mt / 2 + 0.01), y, z + Math.cos(rotY) * (mt / 2 + 0.01));
    screen.rotation.y = rotY;
    scene.add(screen);

    const glow = new THREE.PointLight(glowColor, 1.4, 5);
    glow.position.set(x + Math.sin(rotY) * 0.8, y, z + Math.cos(rotY) * 0.8);
    scene.add(glow);
}

function addPoster(scene, x, y, z, rotY, tex) {
    const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(0.88, 1.32),
        new THREE.MeshLambertMaterial({ map: tex, emissive: new THREE.Color(0x050010), emissiveIntensity: 0.45 })
    );
    poster.rotation.y = rotY;
    poster.position.set(x, y, z);
    scene.add(poster);
}
