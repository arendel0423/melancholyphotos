import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { buildScene, buildZones, isInAnyZone, PLAYER_HEIGHT, MOVE_SPEED } from './galleryScene.js';

const CANVAS_W = 900;
const CANVAS_H = 650;

// ── Full-size photo overlay ───────────────────────────────────────────────────

function PhotoOverlay({ url, onClose }) {
    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)' }}
        >
            <button
                onClick={onClose}
                className="absolute top-3 right-4 text-white text-3xl font-bold leading-none hover:text-yellow-300 transition-colors"
                style={{ textShadow: '0 0 8px #000' }}
                aria-label="Close photo"
            >
                ✕
            </button>
            <img
                src={url}
                alt="Gallery photo"
                style={{ maxWidth: CANVAS_W - 40, maxHeight: CANVAS_H - 40, objectFit: 'contain' }}
                className="shadow-2xl"
            />
        </div>
    );
}

// ── Crosshair ─────────────────────────────────────────────────────────────────

function Crosshair() {
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
            <div style={{ position: 'relative', width: 20, height: 20 }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.8)', transform: 'translateY(-50%)' }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.8)', transform: 'translateX(-50%)' }} />
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GalleryViewer({ albums }) {
    const mountRef = useRef(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [fading, setFading] = useState(false);

    // Refs for values needed inside the animation loop / event handlers
    const clickablesRef       = useRef([]);
    const controlsRef         = useRef(null);
    const exitDoorsRef        = useRef([]);
    const fadingRef           = useRef(false);
    const updateWaterfallRef  = useRef(null);

    const handlePhotoClick = useCallback((url) => {
        setSelectedPhoto(url);
        controlsRef.current?.unlock();
    }, []);

    const closePhoto = useCallback(() => {
        setSelectedPhoto(null);
        // Short delay lets the overlay unmount before the browser accepts a lock request
        setTimeout(() => controlsRef.current?.lock(), 120);
    }, []);

    // Escape key closes the full-size photo overlay
    useEffect(() => {
        if (!selectedPhoto) return;
        const onKeyDown = (e) => { if (e.key === 'Escape') closePhoto(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedPhoto, closePhoto]);

    useEffect(() => {
        if (!albums || albums.length === 0) return;

        const mount = mountRef.current;

        // ── Renderer ──────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setSize(CANVAS_W, CANVAS_H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        mount.appendChild(renderer.domElement);

        // ── Scene & camera ────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0ede5);
        scene.fog = new THREE.Fog(0xf0ede5, 20, 45);

        const camera = new THREE.PerspectiveCamera(75, CANVAS_W / CANVAS_H, 0.1, 60);

        // ── Build scene geometry ──────────────────────────────────────────────
        const { clickables, lobbyWidth, roomXPositions, roomStartZ, exitDoors, updateWaterfall } =
            buildScene(scene, albums);
        clickablesRef.current        = clickables;
        exitDoorsRef.current         = exitDoors;
        updateWaterfallRef.current   = updateWaterfall;
        const zones = buildZones(lobbyWidth, roomXPositions, roomStartZ);

        // Spawn in front of the rightmost doorway, facing the doorway wall
        camera.position.set(roomXPositions[roomXPositions.length - 1], PLAYER_HEIGHT, 2);

        // ── Pointer lock controls ─────────────────────────────────────────────
        const controls = new PointerLockControls(camera, renderer.domElement);
        controlsRef.current = controls;
        scene.add(camera);

        const onLock   = () => setIsLocked(true);
        const onUnlock = () => setIsLocked(false);
        controls.addEventListener('lock',   onLock);
        controls.addEventListener('unlock', onUnlock);

        // Click canvas → request pointer lock (only when no photo is open)
        const onCanvasClick = () => {
            if (!controls.isLocked) controls.lock();
        };
        renderer.domElement.addEventListener('click', onCanvasClick);

        // ── WASD movement ─────────────────────────────────────────────────────
        const keys = { w: false, a: false, s: false, d: false };
        const onKeyDown = (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp')    keys.w = true;
            if (e.code === 'KeyS' || e.code === 'ArrowDown')  keys.s = true;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft')  keys.a = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = true;
        };
        const onKeyUp = (e) => {
            if (e.code === 'KeyW' || e.code === 'ArrowUp')    keys.w = false;
            if (e.code === 'KeyS' || e.code === 'ArrowDown')  keys.s = false;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft')  keys.a = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = false;
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup',   onKeyUp);

        // ── Raycaster (center-screen click while locked) ───────────────────────
        const raycaster = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);

        const onPointerDown = () => {
            if (!controls.isLocked) return;
            raycaster.setFromCamera(center, camera);
            const hits = raycaster.intersectObjects(clickablesRef.current, false);
            if (hits.length > 0 && hits[0].object.userData.isPhoto) {
                handlePhotoClick(hits[0].object.userData.url);
            }
        };
        renderer.domElement.addEventListener('pointerdown', onPointerDown);

        // ── Animation loop ────────────────────────────────────────────────────
        const clock = new THREE.Clock();
        let animId;

        const triggerExit = () => {
            if (fadingRef.current) return;
            fadingRef.current = true;
            controls.unlock();
            setFading(true);
        };

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.05); // cap delta to avoid tunneling

            if (controls.isLocked) {
                const prev = camera.position.clone();

                if (keys.w) controls.moveForward( MOVE_SPEED * delta);
                if (keys.s) controls.moveForward(-MOVE_SPEED * delta);
                if (keys.a) controls.moveRight(  -MOVE_SPEED * delta);
                if (keys.d) controls.moveRight(   MOVE_SPEED * delta);

                // Collision: revert if outside all valid zones
                if (!isInAnyZone(camera.position.x, camera.position.z, zones)) {
                    camera.position.copy(prev);
                }

                // Lock Y to player eye height
                camera.position.y = PLAYER_HEIGHT;

                // Exit door proximity → fade to black
                for (const door of exitDoorsRef.current) {
                    if (Math.abs(camera.position.x - door.x) < 1.5 &&
                        Math.abs(camera.position.z - door.z) < 1.5) {
                        triggerExit();
                        break;
                    }
                }
            }

            // Animate waterfall
            if (updateWaterfallRef.current) updateWaterfallRef.current(clock.getElapsedTime());

            renderer.render(scene, camera);
        };
        animate();

        // ── Cleanup ───────────────────────────────────────────────────────────
        return () => {
            cancelAnimationFrame(animId);
            controls.removeEventListener('lock',   onLock);
            controls.removeEventListener('unlock', onUnlock);
            renderer.domElement.removeEventListener('click',       onCanvasClick);
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup',   onKeyUp);
            controls.dispose();
            renderer.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [albums, handlePhotoClick]);

    return (
        <div
            style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative', overflow: 'hidden' }}
            className="border-2 border-orange-800"
        >
            {/* Three.js canvas mount */}
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

            {/* Crosshair (while locked and no overlay) */}
            {isLocked && !selectedPhoto && <Crosshair />}

            {/* Enter prompt */}
            {!isLocked && !selectedPhoto && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end z-10 pb-6">
                    <div
                        className="px-5 py-2 text-sm font-semibold tracking-widest uppercase"
                        style={{
                            background: 'rgba(0,0,0,0.65)',
                            color: '#f0d875',
                            border: '1px solid #d4af37',
                            letterSpacing: '0.15em',
                        }}
                    >
                        Click to Enter Gallery
                    </div>
                    <div className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        WASD to move · Mouse to look · Click a photo to view
                    </div>
                </div>
            )}

            {/* Full-size photo overlay */}
            {selectedPhoto && (
                <PhotoOverlay url={selectedPhoto} onClose={closePhoto} />
            )}

            {/* Fade-to-black overlay (exit door transition) */}
            <div
                style={{
                    position: 'absolute', inset: 0, background: 'black', zIndex: 40,
                    opacity: fading ? 1 : 0,
                    transition: fading ? 'opacity 1.2s ease' : 'none',
                    pointerEvents: 'none',
                }}
                onTransitionEnd={() => { if (fading) window.location.href = '/'; }}
            />
        </div>
    );
}
