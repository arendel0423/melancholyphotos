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
    floor:      0xc8c2b8,
    wall:       0xf2ede5,
    ceiling:    0xfafaf8,
    doorFrame:  0x8b6914,
    photoFrame: 0xd4af37,
    mat:        0xf0ebe0,
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
    const R_BOT = 0.195, R_TOP = 0.165;

    // Square plinth base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.52), colMat);
    plinth.position.set(x, 0.03, z);
    scene.add(plinth);

    // Base torus molding (horizontal ring)
    const baseTorus = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.026, 8, 24), colMat);
    baseTorus.rotation.x = Math.PI / 2;
    baseTorus.position.set(x, SHAFT_Y0 - 0.01, z);
    scene.add(baseTorus);

    // Main shaft (slight entasis taper)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R_TOP, R_BOT, SHAFT_H, 24), colMat);
    shaft.position.set(x, SHAFT_Y0 + SHAFT_H / 2, z);
    scene.add(shaft);

    // 20 flute arrises (thin raised ridges around shaft surface)
    const FLUTES = 20;
    const RIDGE_R = 0.021;
    const avgShaftR = (R_BOT + R_TOP) / 2 + RIDGE_R * 0.55;
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
    const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.275, R_TOP, 0.16, 24), colMat);
    echinus.position.set(x, SHAFT_Y1 + 0.08, z);
    scene.add(echinus);

    // Square abacus slab
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.07, 0.60), colMat);
    abacus.position.set(x, SHAFT_Y1 + 0.195, z);
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

    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), mat(C.wall));
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

// ── Lobby ─────────────────────────────────────────────────────────────────────

function buildLobby(scene, numAlbums, lobbyWidth, roomXPositions, roomStartZ) {
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
        mat(C.ceiling)
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, ROOM_HEIGHT, floorCenterZ);
    scene.add(ceil);

    // Left side wall
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(totalFloorDepth, ROOM_HEIGHT),
        mat(C.wall)
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-lobbyWidth / 2, ROOM_HEIGHT / 2, floorCenterZ);
    scene.add(leftWall);

    // Right side wall
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(totalFloorDepth, ROOM_HEIGHT),
        mat(C.wall)
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(lobbyWidth / 2, ROOM_HEIGHT / 2, floorCenterZ);
    scene.add(rightWall);

    // Front entrance wall (faces -Z, behind player start)
    addPlane(scene, lobbyWidth, ROOM_HEIGHT, C.wall, 0, ROOM_HEIGHT / 2, ENTRANCE_DEPTH, 0);

    // Back wall: fill panels in areas between / outside room arch walls (full height)
    const backZ = roomStartZ;
    const sortedX = [...roomXPositions].sort((a, b) => a - b);
    const half = lobbyWidth / 2;
    const edges = [-half, ...sortedX.flatMap(x => [x - ROOM_WIDTH / 2, x + ROOM_WIDTH / 2]), half];
    for (let i = 0; i < edges.length; i += 2) {
        const x1 = edges[i], x2 = edges[i + 1];
        const w = x2 - x1;
        if (w > 0.01) {
            addPlane(scene, w, ROOM_HEIGHT, C.wall, (x1 + x2) / 2, ROOM_HEIGHT / 2, backZ, 0);
        }
    }

    // Greek marble columns — one centered between each adjacent doorway, flush with back wall
    const colZ = roomStartZ + 0.28;
    for (let i = 0; i + 1 < sortedX.length; i++) {
        addGreekColumn(scene, (sortedX[i] + sortedX[i + 1]) / 2, colZ);
    }

    // Can lights — 2 rows equidistant between entrance wall and back wall, aligned with doorway centers
    const totalDepth = ENTRANCE_DEPTH + LOBBY_DEPTH;
    const rowZ1 = ENTRANCE_DEPTH - totalDepth / 3;
    const rowZ2 = ENTRANCE_DEPTH - 2 * totalDepth / 3;
    for (const cx of roomXPositions) {
        addCanLight(scene, cx, rowZ1, 0xfffae8, 4.5, 14);
        addCanLight(scene, cx, rowZ2, 0xfffae8, 4.5, 14);
    }
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

    buildLobby(scene, n, lobbyWidth, roomXPositions, roomStartZ);
    buildFloorGrid(scene, lobbyWidth);

    albums.forEach((album, i) => {
        buildAlbumRoom(scene, loader, clickables, album, roomXPositions[i], roomStartZ);
    });

    return { clickables, lobbyWidth, roomXPositions, roomStartZ };
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
        // Doorway connectors — narrow X, bridge the lobby/room z boundary
        ...roomXPositions.map(cx => ({
            minX: cx - DOORWAY_WIDTH / 2 + PAD, maxX: cx + DOORWAY_WIDTH / 2 - PAD,
            minZ: roomStartZ - PAD,              maxZ: roomStartZ,
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
