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
const PLAYER_HEIGHT = 1.7;
const MOVE_SPEED = 5.0;

// Stylized color palette
const C = {
    floor:      0x2a2030,
    wall:       0x4a3f5c,
    ceiling:    0x1a1520,
    doorFrame:  0x8b6914,
    photoFrame: 0xd4af37,
    mat:        0xf0ebe0,
};

// ── Material helpers ──────────────────────────────────────────────────────────

function mat(color, emissive = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity, side: THREE.FrontSide });
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

// ── Photo frame ───────────────────────────────────────────────────────────────

function addPhotoFrame(scene, loader, clickables, photoUrl, px, py, pz, ry) {
    const FW = 1.35, FH = 1.05;
    const BORDER = 0.06, PAD = 0.04;

    const group = new THREE.Group();
    group.position.set(px, py, pz);
    group.rotation.y = ry;

    // Gold border
    group.add(Object.assign(
        new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), mat(C.photoFrame)),
        { position: new THREE.Vector3(0, 0, 0.001) }
    ));

    // Cream mat
    group.add(Object.assign(
        new THREE.Mesh(new THREE.PlaneGeometry(FW - BORDER * 2, FH - BORDER * 2), mat(C.mat)),
        { position: new THREE.Vector3(0, 0, 0.002) }
    ));

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
    const leftStripW = (ROOM_WIDTH - DOORWAY_WIDTH) / 2;

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

    // Front wall segments (faces -Z toward lobby), with doorway gap
    const topH = ROOM_HEIGHT - DOORWAY_HEIGHT;
    // Top strip
    addPlane(scene, ROOM_WIDTH, topH, C.wall, cx, DOORWAY_HEIGHT + topH / 2, rz, Math.PI);
    // Left strip
    addPlane(scene, leftStripW, DOORWAY_HEIGHT, C.wall, cx - DOORWAY_WIDTH / 2 - leftStripW / 2, DOORWAY_HEIGHT / 2, rz, Math.PI);
    // Right strip
    addPlane(scene, leftStripW, DOORWAY_HEIGHT, C.wall, cx + DOORWAY_WIDTH / 2 + leftStripW / 2, DOORWAY_HEIGHT / 2, rz, Math.PI);

    // Door frame trim (gold accents)
    const trimMat = mat(C.doorFrame);
    const trimDepth = 0.08;
    // Left jamb
    const ljamb = new THREE.Mesh(new THREE.BoxGeometry(trimDepth, DOORWAY_HEIGHT, trimDepth), trimMat);
    ljamb.position.set(cx - DOORWAY_WIDTH / 2, DOORWAY_HEIGHT / 2, rz);
    scene.add(ljamb);
    // Right jamb
    const rjamb = ljamb.clone();
    rjamb.position.set(cx + DOORWAY_WIDTH / 2, DOORWAY_HEIGHT / 2, rz);
    scene.add(rjamb);
    // Lintel
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOORWAY_WIDTH + trimDepth * 2, trimDepth, trimDepth), trimMat);
    lintel.position.set(cx, DOORWAY_HEIGHT, rz);
    scene.add(lintel);

    // Album name label on back wall
    const labelTex = createLabelTexture(album.name);
    const labelMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.8),
        new THREE.MeshLambertMaterial({ map: labelTex, transparent: false })
    );
    labelMesh.position.set(cx, ROOM_HEIGHT - 0.55, rz - ROOM_DEPTH + 0.05);
    scene.add(labelMesh);

    // Point light inside room
    const light = new THREE.PointLight(0xffd4a0, 2.0, 14);
    light.position.set(cx, ROOM_HEIGHT - 0.4, rz - ROOM_DEPTH / 2);
    scene.add(light);

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

    // Back wall with doorway openings
    const backZ = roomStartZ;
    const topH = ROOM_HEIGHT - DOORWAY_HEIGHT;

    // Full top strip
    addPlane(scene, lobbyWidth, topH, C.wall, 0, DOORWAY_HEIGHT + topH / 2, backZ, Math.PI);

    // Build vertical segments around each doorway
    const sortedX = [...roomXPositions].sort((a, b) => a - b);
    const half = lobbyWidth / 2;

    // Edges: leftmost cap, gaps between rooms, rightmost cap
    const edges = [-half, ...sortedX.flatMap(x => [x - DOORWAY_WIDTH / 2, x + DOORWAY_WIDTH / 2]), half];
    for (let i = 0; i < edges.length; i += 2) {
        const x1 = edges[i], x2 = edges[i + 1];
        const w = x2 - x1;
        if (w > 0.01) {
            addPlane(scene, w, DOORWAY_HEIGHT, C.wall, (x1 + x2) / 2, DOORWAY_HEIGHT / 2, backZ, Math.PI);
        }
    }

    // Ambient "chandelier" glow in lobby
    const lobbyLight = new THREE.PointLight(0xc0b0ff, 1.2, 20);
    lobbyLight.position.set(0, ROOM_HEIGHT - 0.3, -LOBBY_DEPTH / 2);
    scene.add(lobbyLight);
}

// ── Floor tile accent lines (decorative) ─────────────────────────────────────

function buildFloorGrid(scene, lobbyWidth) {
    const TILE = 2.0;
    const gridMat = new THREE.MeshLambertMaterial({ color: 0x3a2f45 });
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
    const ambient = new THREE.AmbientLight(0x9090b0, 0.5);
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
        // Lobby + entrance
        {
            minX: -lobbyWidth / 2 + PAD, maxX: lobbyWidth / 2 - PAD,
            minZ: roomStartZ + PAD,      maxZ: ENTRANCE_DEPTH - PAD,
        },
        // Each album room
        ...roomXPositions.map(cx => ({
            minX: cx - ROOM_WIDTH / 2 + PAD,  maxX: cx + ROOM_WIDTH / 2 - PAD,
            minZ: roomStartZ - ROOM_DEPTH + PAD, maxZ: roomStartZ,
        })),
    ];
}

export function isInAnyZone(x, z, zones) {
    return zones.some(zone => x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ);
}

export { PLAYER_HEIGHT, MOVE_SPEED };
