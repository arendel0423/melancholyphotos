import { useRef, useEffect, useCallback } from 'react';

const PRESET_COUNT = 10;

function emptyPresets() {
    return Array.from({ length: PRESET_COUNT }, (_, i) => ({
        id: i + 1, title: `Preset ${i + 1}`, artist: '', src: '',
    }));
}

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const CW = 900, CH = 248;
const PAD = 8; // outer gap that reveals parent background texture

// ── Fixed layout regions (absolute canvas coords) ─────────────────────────────
//   Brand column:  x  8–84   (76 wide), full height
//   Display panel: x 86–650  (564 wide), y 8–172  (164 tall)
//   Control panel: x 652–892 (240 wide), y 8–172
//   Preset row:    x 86–892  (806 wide), y 176–240 (64 tall)

const BRAND_X = 8,  BRAND_Y = 8,  BRAND_W = 76, BRAND_H = CH - PAD * 2;
const DISP_X  = 86, DISP_Y  = 8,  DISP_W  = 564, DISP_H = 164;
const CTRL_X  = 652, CTRL_Y = 8,  CTRL_W  = 240, CTRL_H = 164;
const PST_X   = 86, PST_Y   = 176, PST_W  = 806, PST_H  = 64;

// Control button grid (inside CTRL region)
const BTN_W = 74, BTN_H = 68;
const BTN_COL0 = CTRL_X + 7, BTN_ROW0 = CTRL_Y + 10;
const BTN_COL_STEP = BTN_W + 5, BTN_ROW_STEP = BTN_H + 10;

// Preset buttons — 10 × 77px + 9 × 4px gap = 806px exactly
const PST_BTN_W = 77, PST_BTN_H = 50, PST_BTN_GAP = 4;
const PST_BTN_X0 = PST_X, PST_BTN_Y0 = PST_Y + 7;

const EQ_BARS = 18;

// ── Button definitions ────────────────────────────────────────────────────────
const CTRL_BTNS = [
    { id: 'prev',  label: '|◄◄', row: 0, col: 0 },
    { id: 'play',  label: '▶',   row: 0, col: 1 },
    { id: 'next',  label: '▶▶|', row: 0, col: 2 },
    { id: 'volDn', label: 'VOL-', row: 1, col: 0 },
    { id: 'volUp', label: 'VOL+', row: 1, col: 2 },
];

// Pre-computed hit zones for click/hover detection
const ZONES = [
    ...CTRL_BTNS.map(b => ({
        id: b.id,
        x: BTN_COL0 + b.col * BTN_COL_STEP,
        y: BTN_ROW0 + b.row * BTN_ROW_STEP,
        w: BTN_W, h: BTN_H,
    })),
    ...Array.from({ length: PRESET_COUNT }, (_, i) => ({
        id: `preset-${i}`,
        x: PST_BTN_X0 + i * (PST_BTN_W + PST_BTN_GAP),
        y: PST_BTN_Y0,
        w: PST_BTN_W, h: PST_BTN_H,
    })),
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s) {
    if (!isFinite(s) || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function hitZone(mx, my) {
    for (const z of ZONES) {
        if (mx >= z.x && mx < z.x + z.w && my >= z.y && my < z.y + z.h) return z.id;
    }
    return null;
}

// ── Drawing functions ─────────────────────────────────────────────────────────

function trackLabel(track) {
    if (!track?.src) return null;
    const parts = [track.artist, track.title, track.album].filter(Boolean);
    return parts.join('  ·  ');
}
function bevel(ctx, x, y, w, h, face, hi, lo) {
    ctx.fillStyle = face; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = hi;   ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = lo;   ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
}

function drawBtn(ctx, x, y, w, h, label, active, pressed, dim) {
    const face = pressed ? '#0d0b0b' : active ? '#0a2814' : '#1e1818';
    bevel(ctx, x, y, w, h, face, pressed ? '#111' : '#3a2e2e', pressed ? '#3a2e2e' : '#080606');
    ctx.font = `bold ${Math.max(10, Math.floor(h * 0.27))}px monospace`;
    ctx.fillStyle = dim ? '#1d3022' : active ? '#00ff66' : pressed ? '#009944' : '#00cc55';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function drawDisplay(ctx, x, y, w, h, state) {
    const { track, playing, eqBars, scrollOff, elapsed, duration, volume } = state;

    // Screen
    ctx.fillStyle = '#000911';
    ctx.fillRect(x, y, w, h);
    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (let sy = 0; sy < h; sy += 2) ctx.fillRect(x, y + sy, w, 1);
    // Screen border glow
    ctx.strokeStyle = '#00361a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // ── Scrolling title ────────────────────────────────────────────────────
    const titleText = track
        ? (track.src ? (trackLabel(track) ?? track.title) : `[PRESET ${track.id}]  NO AUDIO`)
        : 'NO SIGNAL';

    const TITLE_H = 22;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 6, y + 4, w - 12, TITLE_H);
    ctx.clip();
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, x + 6 - scrollOff, y + 4 + TITLE_H / 2);
    ctx.restore();

    // ── EQ bars ────────────────────────────────────────────────────────────
    const EQ_LEFT   = x + 6;
    const EQ_TOP    = y + 30;
    const EQ_RIGHT_RESERVE = 74; // volume bar + time
    const EQ_AVAIL_W = w - EQ_RIGHT_RESERVE - 12;
    const EQ_H      = h - 52;
    const BAR_W     = Math.floor((EQ_AVAIL_W - (EQ_BARS - 1) * 2) / EQ_BARS);

    for (let i = 0; i < EQ_BARS; i++) {
        const amp = eqBars[i];
        const bh  = Math.max(2, Math.floor(amp * EQ_H));
        const bx  = EQ_LEFT + i * (BAR_W + 2);
        const by  = EQ_TOP + EQ_H - bh;

        const g = ctx.createLinearGradient(bx, by, bx, EQ_TOP + EQ_H);
        if (playing) {
            g.addColorStop(0, amp > 0.75 ? '#ffee00' : '#00ff66');
            g.addColorStop(0.55, '#00aa44');
            g.addColorStop(1, '#003322');
        } else {
            g.addColorStop(0, '#00aa44');
            g.addColorStop(1, '#002211');
        }
        ctx.fillStyle = g;
        ctx.fillRect(bx, by, BAR_W, bh);
        if (playing && bh > 5) { ctx.fillStyle = '#aaffcc'; ctx.fillRect(bx, by, BAR_W, 2); }
    }

    // ── Volume bar ─────────────────────────────────────────────────────────
    const VOL_X = x + w - EQ_RIGHT_RESERVE + 4;
    const VOL_W = 12;
    ctx.fillStyle = '#001508';
    ctx.fillRect(VOL_X, EQ_TOP, VOL_W, EQ_H);
    const vFill = Math.floor(volume * EQ_H);
    const vg = ctx.createLinearGradient(0, EQ_TOP, 0, EQ_TOP + EQ_H);
    vg.addColorStop(0, '#00ff66'); vg.addColorStop(1, '#004422');
    ctx.fillStyle = vg;
    ctx.fillRect(VOL_X, EQ_TOP + EQ_H - vFill, VOL_W, vFill);
    ctx.strokeStyle = '#004422'; ctx.lineWidth = 1;
    ctx.strokeRect(VOL_X, EQ_TOP, VOL_W, EQ_H);
    ctx.font = '8px monospace'; ctx.fillStyle = '#007733';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('VOL', VOL_X + VOL_W / 2, EQ_TOP + EQ_H + 3);

    // ── Time display ───────────────────────────────────────────────────────
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#00ff66';
    ctx.fillText(fmtTime(elapsed), x + w - 4, EQ_TOP + 4);
    ctx.font = '10px monospace'; ctx.fillStyle = '#007733';
    ctx.fillText(`/ ${fmtTime(duration)}`, x + w - 4, EQ_TOP + 20);

    // ── Play status ────────────────────────────────────────────────────────
    ctx.font = '10px monospace';
    ctx.fillStyle = playing ? '#00ff66' : '#005522';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(playing ? '▶ PLAY' : '■ STOP', x + 6, y + h - 20);

    // ── Progress bar ───────────────────────────────────────────────────────
    const PY = y + h - 10, PW = w - 12;
    ctx.fillStyle = '#002211'; ctx.fillRect(x + 6, PY, PW, 6);
    const prog = duration > 0 && isFinite(duration) ? Math.min(1, elapsed / duration) : 0;
    if (prog > 0) {
        const pg = ctx.createLinearGradient(x + 6, 0, x + 6 + PW, 0);
        pg.addColorStop(0, '#006633'); pg.addColorStop(1, '#00ff88');
        ctx.fillStyle = pg;
        ctx.fillRect(x + 6, PY, Math.floor(PW * prog), 6);
    }
    ctx.strokeStyle = '#004422'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 6, PY, PW, 6);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CarStereo() {
    const canvasRef   = useRef(null);
    const audioRef    = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const animRef     = useRef(null);
    const tracksRef   = useRef(emptyPresets());

    // All mutable display state lives here — no React re-renders per frame
    const S = useRef({
        preset:     0,
        playing:    false,
        volume:     0.8,
        elapsed:    0,
        duration:   0,
        eqBars:     Array(EQ_BARS).fill(0),
        fakePhase:  0,
        scrollOff:  0,
        pressedBtn: null,
    }).current;

    // ── Load tracks from API ──────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/playlist')
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(data => {
                const loaded = Array.isArray(data) ? data : [];
                const presets = emptyPresets();
                loaded.slice(0, PRESET_COUNT).forEach((t, i) => { presets[i] = t; });
                tracksRef.current = presets;
            })
            .catch(() => {}); // keep empty presets on failure
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Audio setup (once) ────────────────────────────────────────────────────
    useEffect(() => {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audioRef.current = audio;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const actx     = new AudioCtx();
            const analyser = actx.createAnalyser();
            analyser.fftSize = 256; // must be a power of 2; gives 128 frequency bins for EQ_BARS=18
            analyser.smoothingTimeConstant = 0.8;
            const source = actx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(actx.destination);
            audioCtxRef.current = actx;
            analyserRef.current = analyser;
        }

        audio.volume = S.volume;

        const onTime     = () => { S.elapsed  = audio.currentTime; };
        const onDuration = () => { S.duration = audio.duration; };
        const onEnded    = () => {
            const tracks = tracksRef.current;
            let next = (S.preset + 1) % PRESET_COUNT;
            if (!tracks[next]?.src) {
                next = tracks.findIndex(t => t.src);
            }
            if (next === -1) { S.playing = false; S.elapsed = 0; return; }
            S.preset   = next;
            S.scrollOff = 0;
            S.elapsed  = 0;
            S.duration = 0;
            audioCtxRef.current?.resume();
            audio.src = tracks[next].src;
            audio.play().catch(() => { S.playing = false; });
            S.playing = true;
        };

        audio.addEventListener('timeupdate',      onTime);
        audio.addEventListener('durationchange',  onDuration);
        audio.addEventListener('ended',           onEnded);

        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate',     onTime);
            audio.removeEventListener('durationchange', onDuration);
            audio.removeEventListener('ended',          onEnded);
            audioCtxRef.current?.close();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Actions ───────────────────────────────────────────────────────────────
    const loadTrack = useCallback((index) => {
        const track = tracksRef.current[index];
        S.preset    = index;
        S.scrollOff = 0;
        S.elapsed   = 0;
        S.duration  = 0;

        const audio = audioRef.current;
        if (!audio) return;
        audio.pause();

        if (!track.src) { S.playing = false; audio.src = ''; return; }

        audioCtxRef.current?.resume();
        audio.src = track.src;
        audio.play().catch(() => { S.playing = false; });
        S.playing = true;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAction = useCallback((id) => {
        const audio = audioRef.current;

        if (id.startsWith('preset-')) { loadTrack(+id.split('-')[1]); return; }

        switch (id) {
            case 'play':
                if (!audio?.src) { loadTrack(0); break; }
                if (S.playing) { audio.pause(); S.playing = false; }
                else { audioCtxRef.current?.resume(); audio.play().catch(() => {}); S.playing = true; }
                break;
            case 'prev':
                if (S.elapsed > 3 && audio?.src) audio.currentTime = 0;
                else loadTrack((S.preset - 1 + PRESET_COUNT) % PRESET_COUNT);
                break;
            case 'next':
                loadTrack((S.preset + 1) % PRESET_COUNT);
                break;
            case 'volDn':
                S.volume = Math.max(0, +(S.volume - 0.1).toFixed(1));
                if (audio) audio.volume = S.volume;
                break;
            case 'volUp':
                S.volume = Math.min(1, +(S.volume + 0.1).toFixed(1));
                if (audio) audio.volume = S.volume;
                break;
        }
    }, [loadTrack]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Animation / render loop ───────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function frame() {
            animRef.current = requestAnimationFrame(frame);

            // EQ data
            const analyser = analyserRef.current;
            if (analyser && S.playing) {
                const buf  = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(buf);
                const step = Math.floor(buf.length / EQ_BARS);
                for (let i = 0; i < EQ_BARS; i++) {
                    let sum = 0;
                    for (let j = 0; j < step; j++) sum += buf[i * step + j];
                    S.eqBars[i] += ((sum / step) / 255 - S.eqBars[i]) * 0.2;
                }
            } else {
                S.fakePhase += S.playing ? 0.07 : 0.02;
                for (let i = 0; i < EQ_BARS; i++) {
                    const t = S.playing
                        ? 0.35 + 0.3  * Math.sin(S.fakePhase + i * 0.45)
                        : 0.04 + 0.03 * Math.sin(S.fakePhase + i * 0.7);
                    S.eqBars[i] += (t - S.eqBars[i]) * 0.1;
                }
            }

            // Title scroll (while playing)
            if (S.playing) {
                S.scrollOff += 0.55;
                ctx.font = 'bold 13px monospace';
                const tr = tracksRef.current[S.preset];
                const txt = trackLabel(tr) ?? (tr?.title ?? '');
                if (S.scrollOff > ctx.measureText(txt).width + DISP_W * 0.5)
                    S.scrollOff = -DISP_W * 0.4;
            }

            // ── Draw ──────────────────────────────────────────────────────
            ctx.clearRect(0, 0, CW, CH);

            // Face plate gradient
            const fpg = ctx.createLinearGradient(0, PAD, 0, CH - PAD);
            fpg.addColorStop(0,   '#3e3535');
            fpg.addColorStop(0.3, '#2c2424');
            fpg.addColorStop(1,   '#1a1414');
            ctx.fillStyle = fpg;
            ctx.fillRect(PAD, PAD, CW - PAD * 2, CH - PAD * 2);

            // Rust-coloured rim (matches gallery orange-800)
            ctx.fillStyle = '#7c3a10';
            ctx.fillRect(PAD, PAD, CW - PAD * 2, 2);
            ctx.fillRect(PAD, PAD, 2, CH - PAD * 2);
            ctx.fillStyle = '#3d1a08';
            ctx.fillRect(PAD, CH - PAD - 2, CW - PAD * 2, 2);
            ctx.fillRect(CW - PAD - 2, PAD, 2, CH - PAD * 2);
            // Inner highlight line
            ctx.fillStyle = '#4a2010';
            ctx.fillRect(PAD + 2, PAD + 2, CW - PAD * 2 - 4, 1);
            ctx.fillRect(PAD + 2, PAD + 2, 1, CH - PAD * 2 - 4);

            // ── Brand column ──────────────────────────────────────────────
            bevel(ctx, BRAND_X, BRAND_Y, BRAND_W, BRAND_H, '#121010', '#252020', '#080606');

            ctx.save();
            ctx.translate(BRAND_X + BRAND_W / 2, BRAND_Y + BRAND_H / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#7c3a10';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('MELANCHOLY RADIO', 0, 0);
            ctx.restore();

            // Power LED
            const LX = BRAND_X + BRAND_W / 2, LY = BRAND_Y + BRAND_H - 14;
            ctx.save();
            if (S.playing) { ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 10; }
            const lg = ctx.createRadialGradient(LX - 1, LY - 1, 1, LX, LY, 5);
            if (S.playing) {
                lg.addColorStop(0, '#ccffdd'); lg.addColorStop(0.4, '#00ff66'); lg.addColorStop(1, '#003322');
            } else {
                lg.addColorStop(0, '#1a3322'); lg.addColorStop(1, '#050d08');
            }
            ctx.beginPath(); ctx.arc(LX, LY, 5, 0, Math.PI * 2);
            ctx.fillStyle = lg; ctx.fill();
            ctx.restore();

            // ── Display panel ─────────────────────────────────────────────
            bevel(ctx, DISP_X, DISP_Y, DISP_W, DISP_H, '#0c0c0c', '#222', '#070707');
            drawDisplay(ctx, DISP_X + 4, DISP_Y + 4, DISP_W - 8, DISP_H - 8, {
                track:    tracksRef.current[S.preset],
                playing:  S.playing,
                eqBars:   S.eqBars,
                scrollOff: S.scrollOff,
                elapsed:  S.elapsed,
                duration: S.duration,
                volume:   S.volume,
            });

            // ── Separator between display and presets ─────────────────────
            ctx.fillStyle = '#3d1a08';
            ctx.fillRect(DISP_X, DISP_Y + DISP_H + 2, DISP_W + 2 + CTRL_W, 2);

            // ── Control panel ─────────────────────────────────────────────
            bevel(ctx, CTRL_X, CTRL_Y, CTRL_W, CTRL_H, '#181212', '#262020', '#0a0808');

            CTRL_BTNS.forEach(b => {
                const bx = BTN_COL0 + b.col * BTN_COL_STEP;
                const by = BTN_ROW0 + b.row * BTN_ROW_STEP;
                const isPlay = b.id === 'play';
                const label  = isPlay ? (S.playing ? '❚❚' : '▶') : b.label;
                drawBtn(ctx, bx, by, BTN_W, BTN_H, label,
                    isPlay && S.playing, S.pressedBtn === b.id, false);
            });

            // ── Preset row ────────────────────────────────────────────────
            bevel(ctx, PST_X, PST_Y, PST_W, PST_H, '#161010', '#222020', '#080606');

            tracksRef.current.forEach((t, i) => {
                const bx = PST_BTN_X0 + i * (PST_BTN_W + PST_BTN_GAP);
                drawBtn(ctx, bx, PST_BTN_Y0, PST_BTN_W, PST_BTN_H, String(t.id),
                    i === S.preset, S.pressedBtn === `preset-${i}`, !t.src);
            });
        }

        frame();
        return () => cancelAnimationFrame(animRef.current);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Pointer handlers ──────────────────────────────────────────────────────
    const toCanvasCoords = (e) => {
        const r = canvasRef.current.getBoundingClientRect();
        return [
            (e.clientX - r.left) * (CW / r.width),
            (e.clientY - r.top)  * (CH / r.height),
        ];
    };

    const onClick = useCallback((e) => {
        const [mx, my] = toCanvasCoords(e);
        const id = hitZone(mx, my);
        if (!id) return;
        S.pressedBtn = id;
        setTimeout(() => { if (S.pressedBtn === id) S.pressedBtn = null; }, 140);
        handleAction(id);
    }, [handleAction]); // eslint-disable-line react-hooks/exhaustive-deps

    const onMouseMove = useCallback((e) => {
        const [mx, my] = toCanvasCoords(e);
        canvasRef.current.style.cursor = hitZone(mx, my) ? 'pointer' : 'default';
    }, []);

    const onMouseLeave = useCallback(() => {
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{ display: 'block' }}
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        />
    );
}
