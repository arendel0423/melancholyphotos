import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { buildBedroomScene, PLAYER_HEIGHT, MOVE_SPEED } from './bedroomScene.js';

const CANVAS_W = 900;
const CANVAS_H = 650;

function BedroomCursor({ cursorRef }) {
    return (
        <div
            ref={cursorRef}
            className="pointer-events-none absolute inset-0 z-10"
        >
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 20, height: 20 }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(0,255,255,0.85)', transform: 'translateY(-50%)' }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(0,255,255,0.85)', transform: 'translateX(-50%)' }} />
                </div>
            </div>
        </div>
    );
}

export default function BedroomViewer() {
    const mountRef    = useRef(null);
    const controlsRef = useRef(null);
    const obstaclesRef = useRef([]);
    const zonesRef     = useRef([]);
    const exitDoorRef  = useRef(null);
    const fadingRef    = useRef(false);
    const cursorRef    = useRef(null);
    const [isLocked, setIsLocked] = useState(false);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const mount = mountRef.current;

        // ── Renderer ──────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setSize(CANVAS_W, CANVAS_H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        mount.appendChild(renderer.domElement);

        // ── Scene & camera ────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x030308);
        scene.fog = new THREE.FogExp2(0x030308, 0.055);

        const camera = new THREE.PerspectiveCamera(75, CANVAS_W / CANVAS_H, 0.1, 40);

        // ── Build bedroom ──────────────────────────────────────────────────────
        const { obstacles, zones, spawnX, spawnZ, updateScene, exitDoor } = buildBedroomScene(scene);
        obstaclesRef.current  = obstacles;
        zonesRef.current      = zones;
        exitDoorRef.current   = exitDoor;

        camera.position.set(spawnX, PLAYER_HEIGHT, spawnZ);

        // ── Pointer lock controls ─────────────────────────────────────────────
        const controls = new PointerLockControls(camera, renderer.domElement);
        controlsRef.current = controls;
        scene.add(camera);

        const onLock   = () => setIsLocked(true);
        const onUnlock = () => setIsLocked(false);
        controls.addEventListener('lock',   onLock);
        controls.addEventListener('unlock', onUnlock);

        const onCanvasClick = () => { if (!controls.isLocked) controls.lock(); };
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
            const delta = Math.min(clock.getDelta(), 0.05);

            if (controls.isLocked) {
                const prev = camera.position.clone();

                if (keys.w) controls.moveForward( MOVE_SPEED * delta);
                if (keys.s) controls.moveForward(-MOVE_SPEED * delta);
                if (keys.a) controls.moveRight(  -MOVE_SPEED * delta);
                if (keys.d) controls.moveRight(   MOVE_SPEED * delta);

                const pos = camera.position;
                const inZone = zonesRef.current.some(
                    z => pos.x >= z.minX && pos.x <= z.maxX && pos.z >= z.minZ && pos.z <= z.maxZ
                );
                const inObstacle = obstaclesRef.current.some(
                    o => pos.x >= o.minX && pos.x <= o.maxX && pos.z >= o.minZ && pos.z <= o.maxZ
                );
                if (!inZone || inObstacle) camera.position.copy(prev);

                camera.position.y = PLAYER_HEIGHT;

                // Exit door proximity check
                const door = exitDoorRef.current;
                if (door &&
                    Math.abs(camera.position.x - door.x) < 1.2 &&
                    Math.abs(camera.position.z - door.z) < 1.2) {
                    triggerExit();
                }
            }

            updateScene(clock.getElapsedTime());
            renderer.render(scene, camera);
        };
        animate();

        // ── Cleanup ───────────────────────────────────────────────────────────
        return () => {
            cancelAnimationFrame(animId);
            controls.removeEventListener('lock',   onLock);
            controls.removeEventListener('unlock', onUnlock);
            renderer.domElement.removeEventListener('click', onCanvasClick);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup',   onKeyUp);
            controls.dispose();
            renderer.dispose();
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div
            style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative', overflow: 'hidden' }}
            className="border-2 border-cyan-600"
        >
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

            {isLocked && <BedroomCursor cursorRef={cursorRef} />}

            {!isLocked && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end z-10 pb-6">
                    <div
                        className="px-5 py-2 text-sm font-semibold tracking-widest uppercase"
                        style={{
                            background: 'rgba(0,0,0,0.75)',
                            color: '#00ffff',
                            border: '1px solid #00cccc',
                            letterSpacing: '0.15em',
                            boxShadow: '0 0 14px rgba(0,255,255,0.25)',
                        }}
                    >
                        Click to Enter Room
                    </div>
                    <div className="mt-2 text-xs" style={{ color: 'rgba(0,255,255,0.45)' }}>
                        WASD to move · Mouse to look
                    </div>
                </div>
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
