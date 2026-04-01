import * as THREE from 'three';

// Scene constants
const ROOM_HEIGHT = 3.5;
const ROOM_WIDTH = 7.0;
const ROOM_DEPTH = 10.0;
const ROOM_SPACING = 8.0;      // center-to-center X distance between rooms
const LOBBY_DEPTH = 7.0;       // Z: lobby runs from 0 to -LOBBY_DEPTH
const ENTRANCE_DEPTH = 4.0;    // Z: entrance area in front of lobby (player start zone)
const DOORWAY_WIDTH = 2.5;
const DOORWAY_HEIGHT = 2.8;
const ARCH_RADIUS = DOORWAY_WIDTH / 2;          // 1.25 — radius of the semicircular arch
const ARCH_BASE_Y = DOORWAY_HEIGHT - ARCH_RADIUS; // 1.55 — y where arch spring meets straight sides
const PLAYER_HEIGHT = 1.7;
const MOVE_SPEED = 5.0;

// Stylized color palette
const C = {
    floor:         0xc8c2b8,
    wall:          0xf2ede5,
    ceiling:       0xfafaf8,
    lobbyCeiling:  0xe3faf9,
    entryWall:     0x7d1a2e,
    doorFrame:     0xd4a520,
    photoFrame:    0xd4af37,
    mat:           0xf0ebe0,
};

// ── Material helpers ──────────────────────────────────────────────────────────

function mat(color, emissive = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity, side: THREE.DoubleSide });
}

// ── Text label texture ────────────────────────────────────────────────────────

function createLabelTexture(text) {
    const W = 512, H = 128;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2c1e3d';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    ctx.fillStyle = '#f0d875';
    ctx.font = 'bold 52px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);

    return new THREE.CanvasTexture(canvas);
}

// ── Plane helpers ─────────────────────────────────────────────────────────────

function addPlane(scene, w, h, color, px, py, pz, ry = 0) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(color));
    mesh.rotation.y = ry;
    mesh.position.set(px, py, pz);
    scene.add(mesh);
    return mesh;
}

// ── Marble texture (procedural) ───────────────────────────────────────────────

function createMarbleTexture() {
    const W = 256, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f0ede8';
    ctx.fillRect(0, 0, W, H);

    const veinDefs = [
        { color: 'rgba(120,108,92,0.75)', lw: 2 },
        { color: 'rgba(85,74,60,0.55)',   lw: 1 },
        { color: 'rgba(155,142,128,0.50)', lw: 1 },
    ];
    for (let v = 0; v < 14; v++) {
        const def = veinDefs[v % veinDefs.length];
        ctx.beginPath();
        ctx.strokeStyle = def.color;
        ctx.lineWidth = def.lw;
        let vx = (v / 14) * W + 8;
        ctx.moveTo(vx, 0);
        for (let y = 0; y <= H; y += 4) {
            vx += Math.sin(y * 0.025 + v * 1.3) * 2.8;
            ctx.lineTo(vx, y);
        }
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

let _marbleTexture = null;

// ── Greek marble column (fluted Doric order, floor-to-ceiling) ────────────────

function addGreekColumn(scene, x, z) {
    const colMat = new THREE.MeshLambertMaterial({ color: 0xedeae4, side: THREE.DoubleSide });

    const SHAFT_Y0 = 0.12;
    const SHAFT_Y1 = ROOM_HEIGHT - 0.20;
    const SHAFT_H  = SHAFT_Y1 - SHAFT_Y0;
    const R_BOT = 0.39, R_TOP = 0.33;

    // Square plinth base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 1.04), colMat);
    plinth.position.set(x, 0.03, z);
    scene.add(plinth);

    // Base torus molding (horizontal ring)
    const baseTorus = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.052, 8, 24), colMat);
    baseTorus.rotation.x = Math.PI / 2;
    baseTorus.position.set(x, SHAFT_Y0 - 0.01, z);
    scene.add(baseTorus);

    // Main shaft (slight entasis taper)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R_TOP, R_BOT, SHAFT_H, 24), colMat);
    shaft.position.set(x, SHAFT_Y0 + SHAFT_H / 2, z);
    scene.add(shaft);

    // 20 deep flute arrises — pushed well beyond shaft surface for pronounced grooves
    const FLUTES = 20;
    const RIDGE_R = 0.055;
    const avgShaftR = (R_BOT + R_TOP) / 2 + RIDGE_R;
    for (let f = 0; f < FLUTES; f++) {
        const angle = (f / FLUTES) * Math.PI * 2;
        const ridge = new THREE.Mesh(
            new THREE.CylinderGeometry(RIDGE_R, RIDGE_R * (R_BOT / R_TOP), SHAFT_H, 6),
            colMat
        );
        ridge.position.set(
            x + Math.cos(angle) * avgShaftR,
            SHAFT_Y0 + SHAFT_H / 2,
            z + Math.sin(angle) * avgShaftR
        );
        scene.add(ridge);
    }

    // Echinus capital (frustum flaring outward)
    const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, R_TOP, 0.28, 24), colMat);
    echinus.position.set(x, SHAFT_Y1 + 0.14, z);
    scene.add(echinus);

    // Square abacus slab
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.12, 1.20), colMat);
    abacus.position.set(x, SHAFT_Y1 + 0.34, z);
    scene.add(abacus);
}

// ── Arched wall panel (ShapeGeometry with arch holes + trim + pillars) ────────

function addArchedWall(scene, wallW, wallH, archCentersX_local, cx, cz) {
    const shape = new THREE.Shape();
    shape.moveTo(-wallW / 2, 0);
    shape.lineTo( wallW / 2, 0);
    shape.lineTo( wallW / 2, wallH);
    shape.lineTo(-wallW / 2, wallH);
    shape.closePath();

    for (const ox of archCentersX_local) {
        const hole = new THREE.Path();
        hole.moveTo(ox - ARCH_RADIUS, 0);
        hole.lineTo(ox - ARCH_RADIUS, ARCH_BASE_Y);
        hole.absarc(ox, ARCH_BASE_Y, ARCH_RADIUS, Math.PI, 0, true);
        hole.lineTo(ox + ARCH_RADIUS, 0);
        hole.closePath();
        shape.holes.push(hole);
    }

    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), mat(C.entryWall));
    mesh.position.set(cx, 0, cz);
    scene.add(mesh);

    for (const ox of archCentersX_local) {
        const trimMat = mat(C.doorFrame);
        // Semicircular arch trim ring (lies in XY / wall plane)
        const archTrim = new THREE.Mesh(
            new THREE.TorusGeometry(ARCH_RADIUS, 0.04, 8, 28, Math.PI),
            trimMat
        );
        archTrim.position.set(cx + ox, ARCH_BASE_Y, cz);
        scene.add(archTrim);

        // Vertical jamb trim — cylindrical tube from floor to arch spring, matching torus profile
        const jambGeo = new THREE.CylinderGeometry(0.04, 0.04, ARCH_BASE_Y, 8);
        const jambY   = ARCH_BASE_Y / 2;
        const leftJamb  = new THREE.Mesh(jambGeo, trimMat);
        const rightJamb = new THREE.Mesh(jambGeo, trimMat);
        leftJamb.position.set(cx + ox - ARCH_RADIUS, jambY, cz);
        rightJamb.position.set(cx + ox + ARCH_RADIUS, jambY, cz);
        scene.add(leftJamb);
        scene.add(rightJamb);
    }
}

// ── Inset can light fixture ───────────────────────────────────────────────────

function addCanLight(scene, x, z, lightColor, intensity, distance) {
    const CAN_R = 0.14, CAN_H = 0.10;

    // Cylindrical housing flush with ceiling
    const can = new THREE.Mesh(
        new THREE.CylinderGeometry(CAN_R, CAN_R, CAN_H, 16),
        new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide })
    );
    can.position.set(x, ROOM_HEIGHT - CAN_H / 2, z);
    scene.add(can);

    // Emissive aperture disk (the bright opening facing down)
    const disk = new THREE.Mesh(
        new THREE.CircleGeometry(CAN_R * 0.72, 16),
        new THREE.MeshLambertMaterial({
            color: 0xffffff,
            emissive: new THREE.Color(lightColor),
            emissiveIntensity: 2.5,
        })
    );
    disk.rotation.x = Math.PI / 2;
    disk.position.set(x, ROOM_HEIGHT - CAN_H, z);
    scene.add(disk);

    const light = new THREE.PointLight(lightColor, intensity, distance);
    light.position.set(x, ROOM_HEIGHT - CAN_H - 0.05, z);
    scene.add(light);
}

// ── Photo frame ───────────────────────────────────────────────────────────────

function addPhotoFrame(scene, loader, clickables, photoUrl, px, py, pz, ry) {
    const FW = 1.35, FH = 1.05;
    const BORDER = 0.06, PAD = 0.04;

    const group = new THREE.Group();
    group.position.set(px, py, pz);
    group.rotation.y = ry;

    // Gold border
    const borderMesh = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), mat(C.photoFrame));
    borderMesh.position.set(0, 0, 0.001);
    group.add(borderMesh);

    // Cream mat
    const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(FW - BORDER * 2, FH - BORDER * 2), mat(C.mat));
    matMesh.position.set(0, 0, 0.002);
    group.add(matMesh);

    // Photo surface (grey placeholder, texture loaded async)
    const photoMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const photoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(FW - BORDER * 2 - PAD * 2, FH - BORDER * 2 - PAD * 2),
        photoMat
    );
    photoMesh.position.set(0, 0, 0.003);
    photoMesh.userData = { isPhoto: true, url: photoUrl };
    group.add(photoMesh);
    clickables.push(photoMesh);

    loader.load(photoUrl, (texture) => {
        photoMat.map = texture;
        photoMat.color.set(0xffffff);
        photoMat.needsUpdate = true;
    });

    scene.add(group);
}

// ── Album room ────────────────────────────────────────────────────────────────

function buildAlbumRoom(scene, loader, clickables, album, cx, roomStartZ) {
    const rz = roomStartZ; // front edge of room
    const mid = { x: cx, z: rz - ROOM_DEPTH / 2 };

    // Floor
    const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH), mat(C.floor));
    roomFloor.rotation.x = -Math.PI / 2;
    roomFloor.position.set(cx, 0, rz - ROOM_DEPTH / 2);
    scene.add(roomFloor);

    // Ceiling
    const roomCeil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH), mat(C.ceiling));
    roomCeil.rotation.x = Math.PI / 2;
    roomCeil.position.set(cx, ROOM_HEIGHT, rz - ROOM_DEPTH / 2);
    scene.add(roomCeil);

    // Back wall (faces player, +Z direction)
    addPlane(scene, ROOM_WIDTH, ROOM_HEIGHT, C.wall, cx, ROOM_HEIGHT / 2, rz - ROOM_DEPTH, 0);

    // Left wall (faces +X into room)
    addPlane(scene, ROOM_DEPTH, ROOM_HEIGHT, C.wall, cx - ROOM_WIDTH / 2, ROOM_HEIGHT / 2, mid.z, Math.PI / 2);

    // Right wall (faces -X into room)
    addPlane(scene, ROOM_DEPTH, ROOM_HEIGHT, C.wall, cx + ROOM_WIDTH / 2, ROOM_HEIGHT / 2, mid.z, -Math.PI / 2);

    // Front wall: arched opening with pillars and gold trim ring
    addArchedWall(scene, ROOM_WIDTH, ROOM_HEIGHT, [0], cx, rz);

    // Album name label on back wall
    const labelTex = createLabelTexture(album.name);
    const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.8),
        new THREE.MeshLambertMaterial({ map: labelTex, transparent: false })
    );
    labelMesh.position.set(cx, ROOM_HEIGHT - 0.55, rz - ROOM_DEPTH + 0.05);
    scene.add(labelMesh);

    // Inset can light in room ceiling
    addCanLight(scene, cx, rz - ROOM_DEPTH / 2, 0xfffae8, 6.0, 14);

    // Photo frames
    const photosCopy = [...album.photos];
    const FW = 1.35, FH = 1.05;
    const BORDER = 0.06, PAD = 0.04;
    const WALL_Y = 1.85;
    const backZ = rz - ROOM_DEPTH + 0.06;
    const leftX = cx - ROOM_WIDTH / 2 + 0.06;
    const rightX = cx + ROOM_WIDTH / 2 - 0.06;

    // Assign photos to walls: up to 3 on back, 2 on left, 2 on right
    const wallDefs = [
        {
            max: 3,
            fn: (url, i, n) => {
                const xOff = (i - (n - 1) / 2) * (ROOM_WIDTH / (Math.max(n, 2) + 0.5));
                addPhotoFrame(scene, loader, clickables, url, cx + xOff, WALL_Y, backZ, 0);
            }
        },
        {
            max: 2,
            fn: (url, i, n) => {
                const zOff = rz - ROOM_DEPTH * ((i + 1) / (n + 1));
                addPhotoFrame(scene, loader, clickables, url, leftX, WALL_Y, zOff, Math.PI / 2);
            }
        },
        {
            max: 2,
            fn: (url, i, n) => {
                const zOff = rz - ROOM_DEPTH * ((i + 1) / (n + 1));
                addPhotoFrame(scene, loader, clickables, url, rightX, WALL_Y, zOff, -Math.PI / 2);
            }
        },
    ];

    for (const wallDef of wallDefs) {
        if (!photosCopy.length) break;
        const batch = photosCopy.splice(0, wallDef.max);
        batch.forEach((url, i) => wallDef.fn(url, i, batch.length));
    }
}

// ── Lobby bench (dark wood seat, gold frame legs + stretchers) ───────────────

function addBench(scene, x, z) {
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x2d1a08 });
    const goldMat = new THREE.MeshLambertMaterial({ color: C.doorFrame });

    const W = 1.7, D = 0.40, LEG_H = 0.44, SEAT_H = 0.08, LEG_R = 0.035;

    // Seat slab
    const seat = new THREE.Mesh(new THREE.BoxGeometry(W, SEAT_H, D), woodMat);
    seat.position.set(x, LEG_H + SEAT_H / 2, z);
    scene.add(seat);

    // 4 slender cylindrical legs at seat corners
    const legXOff = W / 2 - 0.12;
    const legZOff = D / 2 - 0.07;
    for (const [ox, oz] of [[legXOff, legZOff], [-legXOff, legZOff], [legXOff, -legZOff], [-legXOff, -legZOff]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(LEG_R, LEG_R, LEG_H, 8), goldMat);
        leg.position.set(x + ox, LEG_H / 2, z + oz);
        scene.add(leg);
    }

    // Cross stretchers connecting front & back leg pairs at low height
    for (const oz of [legZOff, -legZOff]) {
        const str = new THREE.Mesh(new THREE.CylinderGeometry(LEG_R * 0.6, LEG_R * 0.6, W - 0.24, 6), goldMat);
        str.rotation.z = Math.PI / 2;
        str.position.set(x, 0.14, z + oz);
        scene.add(str);
    }
}

// ── Potted cycad plant ────────────────────────────────────────────────────────

function addCycad(scene, x, z) {
    const potMat   = new THREE.MeshLambertMaterial({ color: 0x7a4a28 });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2c18 });
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x286018, side: THREE.DoubleSide });

    // Decorative tapered pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.16, 0.30, 12), potMat);
    pot.position.set(x, 0.15, z);
    scene.add(pot);

    // Soil disk
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 12),
        new THREE.MeshLambertMaterial({ color: 0x1a0d02 }));
    soil.position.set(x, 0.315, z);
    scene.add(soil);

    // Short stocky trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.10, 0.40, 8), trunkMat);
    trunk.position.set(x, 0.52, z);
    scene.add(trunk);

    // Crown fronds — quaternion-aligned so each local +Y points along the frond axis
    const FRONDS = 14, FROND_L = 0.95, FROND_W = 0.055;
    const DROOP = Math.PI * 0.33; // ~59 ° from vertical
    const CROWN_Y = 0.72;
    const up = new THREE.Vector3(0, 1, 0);
    for (let f = 0; f < FRONDS; f++) {
        const az = (f / FRONDS) * Math.PI * 2;
        const dir = new THREE.Vector3(
            Math.sin(az) * Math.sin(DROOP),
            Math.cos(DROOP),
            Math.cos(az) * Math.sin(DROOP)
        ).normalize();
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(FROND_W, FROND_L), frondMat);
        frond.position.set(
            x + dir.x * FROND_L * 0.5,
            CROWN_Y + dir.y * FROND_L * 0.5,
            z + dir.z * FROND_L * 0.5
        );
        frond.quaternion.setFromUnitVectors(up, dir);
        scene.add(frond);
    }
}

// ── Exit sign canvas texture ──────────────────────────────────────────────────

function createExitSignTexture() {
    const W = 512, H = 240;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Deep green rounded-rect background
    const R = 18;
    ctx.fillStyle = '#0a4a0a';
    ctx.beginPath();
    ctx.moveTo(R, 0); ctx.lineTo(W - R, 0);
    ctx.arcTo(W, 0, W, R, R); ctx.lineTo(W, H - R);
    ctx.arcTo(W, H, W - R, H, R); ctx.lineTo(R, H);
    ctx.arcTo(0, H, 0, H - R, R); ctx.lineTo(0, R);
    ctx.arcTo(0, 0, R, 0, R); ctx.closePath();
    ctx.fill();

    // Running man — left third of sign, vertically centred, large
    const mx = W * 0.22, my = H * 0.52, sc = 1.7;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // head
    ctx.beginPath(); ctx.arc(mx, my - 52 * sc, 14 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 9 * sc;
    // torso
    ctx.beginPath(); ctx.moveTo(mx, my - 38 * sc); ctx.lineTo(mx - 5 * sc, my + 10 * sc); ctx.stroke();
    // arms
    ctx.beginPath(); ctx.moveTo(mx, my - 22 * sc); ctx.lineTo(mx - 26 * sc, my - 4 * sc); ctx.stroke();
    // legs
    ctx.beginPath(); ctx.moveTo(mx - 5 * sc, my + 10 * sc); ctx.lineTo(mx + 14 * sc, my + 42 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - 5 * sc, my + 10 * sc); ctx.lineTo(mx - 22 * sc, my + 42 * sc); ctx.stroke();

    // EXIT text — right two-thirds, vertically centred
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 118px Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', W * 0.64, H * 0.52);

    return canvas;
}

// ── Exit door with gold frame, push bar, and glowing sign ────────────────────

function addExitDoor(scene, exitDoors, wallX, centerZ, facingRight) {
    const goldMat = new THREE.MeshLambertMaterial({ color: C.doorFrame });
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x1a0d06, side: THREE.DoubleSide });

    const DOOR_W = 1.2, DOOR_H = 2.4, FR = 0.04;
    const xDir = facingRight ? 1 : -1; // into lobby
    const ry   = facingRight ? Math.PI / 2 : -Math.PI / 2;

    // Door panel
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), doorMat);
    panel.rotation.y = ry;
    panel.position.set(wallX + xDir * 0.01, DOOR_H / 2, centerZ);
    scene.add(panel);

    // Gold frame: horizontal top/bottom tubes (run along Z)
    for (const cy of [DOOR_H + FR, -FR]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, DOOR_W + FR * 2, 8), goldMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(wallX + xDir * 0.02, cy, centerZ);
        scene.add(bar);
    }
    // Gold frame: vertical jamb tubes (run along Y)
    for (const dz of [-DOOR_W / 2, DOOR_W / 2]) {
        const jamb = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, DOOR_H + FR * 2, 8), goldMat);
        jamb.position.set(wallX + xDir * 0.02, DOOR_H / 2, centerZ + dz);
        scene.add(jamb);
    }

    // Push bar: horizontal rod with bracket mounts
    const barLen = DOOR_W * 0.65;
    const pushBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, barLen, 8), goldMat);
    pushBar.rotation.x = Math.PI / 2;
    pushBar.position.set(wallX + xDir * 0.10, 1.0, centerZ);
    scene.add(pushBar);
    for (const dz of [-barLen * 0.35, barLen * 0.35]) {
        const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.10, 6), goldMat);
        mount.rotation.z = Math.PI / 2;
        mount.position.set(wallX + xDir * 0.055, 1.0, centerZ + dz);
        scene.add(mount);
    }

    // Glowing EXIT sign above door
    const signW = 1.0, signH = signW * (240 / 512);
    const signTex = new THREE.CanvasTexture(createExitSignTexture());
    const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(signW, signH),
        new THREE.MeshLambertMaterial({
            map: signTex,
            emissive: new THREE.Color(0xffffff),
            emissiveMap: signTex,
            emissiveIntensity: 0.9,
            side: THREE.DoubleSide,
        })
    );
    signMesh.rotation.y = ry;
    signMesh.position.set(wallX + xDir * 0.03, DOOR_H + signH / 2 + 0.10, centerZ);
    scene.add(signMesh);

    // Soft green point light for sign glow
    const glow = new THREE.PointLight(0x00cc44, 1.0, 5.0);
    glow.position.set(wallX + xDir * 0.3, DOOR_H + signH / 2 + 0.10, centerZ);
    scene.add(glow);

    exitDoors.push({ x: wallX, z: centerZ });
}

// ── Animated waterfall fixture ────────────────────────────────────────────────

function addWaterfall(scene, cx, cz) {
    const FW = 2.4, FH = 2.8, FT = 0.22, FD = 0.18;
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x7b3c1a });

    // Four frame bars: top, bottom, left, right
    const mkBar = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steelMat);
        m.position.set(x, y, z);
        scene.add(m);
    };
    mkBar(FW,       FT, FD,  cx,                    FH - FT / 2,  cz); // top
    mkBar(FW,       FT, FD,  cx,                    FT / 2,       cz); // bottom
    mkBar(FT, FH - FT, FD,  cx - FW / 2 + FT / 2,  FT + (FH - FT) / 2, cz); // left
    mkBar(FT, FH - FT, FD,  cx + FW / 2 - FT / 2,  FT + (FH - FT) / 2, cz); // right

    // Animated water curtain
    const WC_W = 256, WC_H = 512;
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = WC_W; waterCanvas.height = WC_H;
    const waterTex = new THREE.CanvasTexture(waterCanvas);

    const innerW = FW - FT * 2;
    const innerH = FH - FT * 2;
    const waterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(innerW, innerH),
        new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    waterMesh.position.set(cx, FT + innerH / 2, cz);
    scene.add(waterMesh);

    // Pool (dark stone surround)
    const poolW = FW + 0.5, poolD = 1.0, poolH = 0.15;
    const poolMat = new THREE.MeshLambertMaterial({ color: 0x2a2520 });
    const pool = new THREE.Mesh(new THREE.BoxGeometry(poolW, poolH, poolD), poolMat);
    pool.position.set(cx, poolH / 2, cz);
    scene.add(pool);

    // Animated pool water surface
    const PW_W = 128, PW_H = 128;
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = PW_W; poolCanvas.height = PW_H;
    const poolTex = new THREE.CanvasTexture(poolCanvas);
    const poolWater = new THREE.Mesh(
        new THREE.PlaneGeometry(poolW - 0.08, poolD - 0.08),
        new THREE.MeshLambertMaterial({ map: poolTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(cx, poolH + 0.002, cz);
    scene.add(poolWater);

    // Soft blue-white light from the water face
    const waterLight = new THREE.PointLight(0x88bbdd, 1.0, 5.0);
    waterLight.position.set(cx, FH * 0.5, cz + 0.6);
    scene.add(waterLight);

    return {
        update(t) {
            // --- Water curtain ---
            const ctx = waterCanvas.getContext('2d');
            ctx.clearRect(0, 0, WC_W, WC_H);
            ctx.fillStyle = 'rgba(25, 55, 95, 0.55)';
            ctx.fillRect(0, 0, WC_W, WC_H);

            const numStreaks = 24;
            for (let i = 0; i < numStreaks; i++) {
                const baseX = (i + 0.5) * (WC_W / numStreaks);
                const x     = baseX + Math.sin(i * 2.3 + t * 0.35) * 3;
                const speed = 1.1 + (i % 5) * 0.18;
                const sLen  = WC_H * (0.32 + Math.sin(i * 1.1 + t * 0.25) * 0.08);
                const yTop  = ((t * speed * 65 + i * (WC_H / numStreaks) * 2.2) % (WC_H + sLen)) - sLen;

                const g = ctx.createLinearGradient(x, yTop, x, yTop + sLen);
                g.addColorStop(0,    'rgba(200, 230, 255, 0)');
                g.addColorStop(0.15, 'rgba(215, 240, 255, 0.88)');
                g.addColorStop(0.85, 'rgba(195, 225, 252, 0.65)');
                g.addColorStop(1,    'rgba(175, 210, 248, 0)');

                ctx.strokeStyle = g;
                ctx.lineWidth = (WC_W / numStreaks) * 0.52;
                ctx.lineCap = 'butt';
                ctx.beginPath();
                ctx.moveTo(x, yTop);
                ctx.lineTo(x + Math.sin(t * 0.55 + i * 0.45) * 2.5, yTop + sLen);
                ctx.stroke();
            }
            waterTex.needsUpdate = true;

            // --- Pool ripples ---
            const pctx = poolCanvas.getContext('2d');
            pctx.clearRect(0, 0, PW_W, PW_H);
            pctx.fillStyle = 'rgba(22, 55, 95, 0.9)';
            pctx.fillRect(0, 0, PW_W, PW_H);
            for (let r = 0; r < 5; r++) {
                const radius = ((t * 35 + r * 18) % 55);
                const alpha  = (1 - radius / 55) * 0.55;
                pctx.strokeStyle = `rgba(180, 220, 255, ${alpha})`;
                pctx.lineWidth = 1.5;
                pctx.beginPath();
                pctx.arc(PW_W / 2, PW_H / 2, radius + 3, 0, Math.PI * 2);
                pctx.stroke();
            }
            poolTex.needsUpdate = true;
        },
    };
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function buildLobby(scene, numAlbums, lobbyWidth, roomXPositions, roomStartZ, exitDoors) {
    const lz = 0;
    const totalFloorDepth = LOBBY_DEPTH + ENTRANCE_DEPTH;
    const floorCenterZ = lz - LOBBY_DEPTH / 2 + ENTRANCE_DEPTH / 2;

    // Floor (covers entrance + lobby)
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(lobbyWidth, totalFloorDepth),
        mat(C.floor)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, floorCenterZ);
    scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
        new THREE.PlaneGeometry(lobbyWidth, totalFloorDepth),
        mat(C.lobbyCeiling)
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, ROOM_HEIGHT, floorCenterZ);
    scene.add(ceil);

    // Left side wall
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(totalFloorDepth, ROOM_HEIGHT),
        mat(C.entryWall)
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-lobbyWidth / 2, ROOM_HEIGHT / 2, floorCenterZ);
    scene.add(leftWall);

    // Right side wall
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(totalFloorDepth, ROOM_HEIGHT),
        mat(C.entryWall)
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(lobbyWidth / 2, ROOM_HEIGHT / 2, floorCenterZ);
    scene.add(rightWall);

    // Front entrance wall (faces -Z, behind player start)
    addPlane(scene, lobbyWidth, ROOM_HEIGHT, C.entryWall, 0, ROOM_HEIGHT / 2, ENTRANCE_DEPTH, 0);

    // Back wall: fill panels in areas between / outside room arch walls (full height)
    const backZ = roomStartZ;
    const sortedX = [...roomXPositions].sort((a, b) => a - b);
    const half = lobbyWidth / 2;
    const edges = [-half, ...sortedX.flatMap(x => [x - ROOM_WIDTH / 2, x + ROOM_WIDTH / 2]), half];
    for (let i = 0; i < edges.length; i += 2) {
        const x1 = edges[i], x2 = edges[i + 1];
        const w = x2 - x1;
        if (w > 0.01) {
            addPlane(scene, w, ROOM_HEIGHT, C.entryWall, (x1 + x2) / 2, ROOM_HEIGHT / 2, backZ, 0);
        }
    }

    // Greek marble columns — one centered between each adjacent doorway, pulled 0.5 units from back wall
    const colZ = roomStartZ + 0.78;
    for (let i = 0; i + 1 < sortedX.length; i++) {
        addGreekColumn(scene, (sortedX[i] + sortedX[i + 1]) / 2, colZ);
    }

    // Can lights — 1 row equidistant between entry wall and back wall, aligned with doorway centers
    const totalDepth = ENTRANCE_DEPTH + LOBBY_DEPTH;
    const rowZ = ENTRANCE_DEPTH - totalDepth / 2;
    for (const cx of roomXPositions) {
        addCanLight(scene, cx, rowZ, 0xfffae8, 5.0, 16);
    }

    // Benches — centered on each doorway X, same distance from entry wall as pillars are from back wall
    const benchZ = ENTRANCE_DEPTH - 0.78;
    for (const cx of roomXPositions) {
        addBench(scene, cx, benchZ);
    }

    // Cycad plants — centered between each adjacent bench
    for (let i = 0; i + 1 < sortedX.length; i++) {
        addCycad(scene, (sortedX[i] + sortedX[i + 1]) / 2, benchZ);
    }

    // Exit doors on left and right walls
    addExitDoor(scene, exitDoors, -lobbyWidth / 2, floorCenterZ, true);
    addExitDoor(scene, exitDoors,  lobbyWidth / 2, floorCenterZ, false);

    // Waterfall fixture — centred in the lobby
    const waterfallUpdater = addWaterfall(scene, 0, floorCenterZ);

    // Crown moulding — round tube matching arch trim style (radius 0.04) on all four lobby walls
    const mldMat = new THREE.MeshLambertMaterial({ color: C.doorFrame });
    const MLD_R = 0.04;
    const mldY  = ROOM_HEIGHT - MLD_R;

    // Entry & back walls: tube runs along X
    const entryMld = new THREE.Mesh(new THREE.CylinderGeometry(MLD_R, MLD_R, lobbyWidth, 8), mldMat);
    entryMld.rotation.z = Math.PI / 2;
    entryMld.position.set(0, mldY, ENTRANCE_DEPTH);
    scene.add(entryMld);

    const backMld = new THREE.Mesh(new THREE.CylinderGeometry(MLD_R, MLD_R, lobbyWidth, 8), mldMat);
    backMld.rotation.z = Math.PI / 2;
    backMld.position.set(0, mldY, roomStartZ);
    scene.add(backMld);

    // Left & right walls: tube runs along Z
    const leftMld = new THREE.Mesh(new THREE.CylinderGeometry(MLD_R, MLD_R, totalFloorDepth, 8), mldMat);
    leftMld.rotation.x = Math.PI / 2;
    leftMld.position.set(-lobbyWidth / 2, mldY, floorCenterZ);
    scene.add(leftMld);

    const rightMld = new THREE.Mesh(new THREE.CylinderGeometry(MLD_R, MLD_R, totalFloorDepth, 8), mldMat);
    rightMld.rotation.x = Math.PI / 2;
    rightMld.position.set(lobbyWidth / 2, mldY, floorCenterZ);
    scene.add(rightMld);

    return waterfallUpdater;
}

// ── Floor tile accent lines (decorative) ─────────────────────────────────────

function buildFloorGrid(scene, lobbyWidth) {
    const TILE = 2.0;
    const gridMat = new THREE.MeshLambertMaterial({ color: 0xb0aba3 });
    const lineGeo = new THREE.PlaneGeometry(lobbyWidth + ROOM_SPACING * 2, 0.04);
    const lineGeoV = new THREE.PlaneGeometry(0.04, LOBBY_DEPTH + ROOM_DEPTH + ENTRANCE_DEPTH);

    for (let z = -LOBBY_DEPTH - ROOM_DEPTH; z <= ENTRANCE_DEPTH; z += TILE) {
        const l = new THREE.Mesh(lineGeo, gridMat);
        l.rotation.x = -Math.PI / 2;
        l.position.set(0, 0.001, z);
        scene.add(l);
    }
    for (let x = -(lobbyWidth / 2); x <= lobbyWidth / 2; x += TILE) {
        const l = new THREE.Mesh(lineGeoV, gridMat);
        l.rotation.x = -Math.PI / 2;
        l.position.set(x, 0.001, (-LOBBY_DEPTH - ROOM_DEPTH + ENTRANCE_DEPTH) / 2);
        scene.add(l);
    }
}

// ── Main scene builder ────────────────────────────────────────────────────────

export function buildScene(scene, albums) {
    const clickables = [];
    const loader = new THREE.TextureLoader();

    const n = albums.length;
    const lobbyWidth = Math.max(18, n * ROOM_SPACING + ROOM_SPACING);
    const roomXPositions = albums.map((_, i) => (i - (n - 1) / 2) * ROOM_SPACING);
    const roomStartZ = -LOBBY_DEPTH;

    // Lighting
    const ambient = new THREE.AmbientLight(0xfff8f0, 1.0);
    scene.add(ambient);

    const exitDoors = [];
    const waterfallUpdater = buildLobby(scene, n, lobbyWidth, roomXPositions, roomStartZ, exitDoors);
    buildFloorGrid(scene, lobbyWidth);

    albums.forEach((album, i) => {
        buildAlbumRoom(scene, loader, clickables, album, roomXPositions[i], roomStartZ);
    });

    return { clickables, lobbyWidth, roomXPositions, roomStartZ, exitDoors, updateWaterfall: waterfallUpdater.update };
}

// ── Collision zones ───────────────────────────────────────────────────────────

export function buildZones(lobbyWidth, roomXPositions, roomStartZ) {
    const PAD = 0.3;
    return [
        // Lobby + entrance (PAD at back keeps player from clipping through arch wall)
        {
            minX: -lobbyWidth / 2 + PAD, maxX: lobbyWidth / 2 - PAD,
            minZ: roomStartZ + PAD,      maxZ: ENTRANCE_DEPTH - PAD,
        },
        // Doorway connectors — span roomStartZ ± PAD to bridge the lobby back-wall buffer
        ...roomXPositions.map(cx => ({
            minX: cx - DOORWAY_WIDTH / 2 + PAD, maxX: cx + DOORWAY_WIDTH / 2 - PAD,
            minZ: roomStartZ - PAD,              maxZ: roomStartZ + PAD,
        })),
        // Each album room interior
        ...roomXPositions.map(cx => ({
            minX: cx - ROOM_WIDTH / 2 + PAD,    maxX: cx + ROOM_WIDTH / 2 - PAD,
            minZ: roomStartZ - ROOM_DEPTH + PAD, maxZ: roomStartZ - PAD,
        })),
    ];
}

export function isInAnyZone(x, z, zones) {
    return zones.some(zone => x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ);
}

export { PLAYER_HEIGHT, MOVE_SPEED };
