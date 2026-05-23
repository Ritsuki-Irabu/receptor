'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';

const MOCK_KEYWORDS = ['焦り', '会議', '遮られた', '聴いてほしい', '許す'];

interface Particle {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    opacity: number;
    size: number;
    angle: number;
    radius: number;
    speed: number;
    color: string;
}

export default function AnalysisPage() {
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const phaseRef = useRef<number>(0);
    const phaseStartRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);
    const [phaseLabel, setPhaseLabel] = useState('');
    const [exiting, setExiting] = useState(false);

    // スキップボタン押下時：ログ記録を行わずに結果画面（/universe）へ遷移
    const handleSkip = () => {
        setExiting(true);
        setTimeout(() => router.push('/universe'), 400);
    };

    // 戻るボタン押下時：フェードアウトして前のページへ遷移
    const handleBack = () => {
        setExiting(true);
        setTimeout(() => router.back(), 400);
    };

    const [swipeDx, setSwipeDx] = useState(0);
    // 右スワイプで前の画面に戻るジェスチャー設定
    const swipeBind = useDrag(
        ({ movement: [mx, my], last, velocity: [vx] }) => {
            if (exiting) return;
            if (Math.abs(my) > Math.abs(mx)) return;
            if (!last) {
                setSwipeDx(Math.max(0, Math.min(mx, 120)));
            } else {
                setSwipeDx(0);
                if (mx > 80 || (mx > 30 && vx > 0.5)) handleBack();
            }
        },
        { filterTaps: true, pointer: { touch: true } }
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // sessionStorage から回答を取得し、キーワードとして分割
        let keywords = MOCK_KEYWORDS;
        try {
            const stored = sessionStorage.getItem('answers');
            if (stored) {
                const arr: string[] = JSON.parse(stored);
                const words = arr.flatMap((a) => a.split(/[\s、,，]+/)).filter((w) => w.length > 0);
                if (words.length > 0) keywords = words.slice(0, 8);
            }
        } catch {
            // モックを使用
        }

        // アニメーションを3フェーズに分割して管理（出現→収束→ジオメトリ形成）
        // 各フェーズの継続時間（ms）: 出現 → 収束 → ジオメトリ形成 の3ステップ
        const PHASE_DURATIONS = [1200, 1600, 1700];
        const TOTAL_DURATION = PHASE_DURATIONS.reduce((a, b) => a + b, 0);

        // キーワードごとに 12 個のパーティクルを生成し、各キーワード周辺にランダム配置
        const createParticles = () => {
            const pts: Particle[] = [];
            const perWord = 12;
            keywords.forEach((_, wi) => {
                const wx = cx + (Math.random() - 0.5) * canvas.width * 0.6;
                const wy = cy + (Math.random() - 0.5) * canvas.height * 0.5;
                for (let i = 0; i < perWord; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = Math.random() * 100;
                    pts.push({
                        x: wx + Math.cos(angle) * r * 0.3,
                        y: wy + Math.sin(angle) * r * 0.3,
                        targetX: cx,
                        targetY: cy,
                        vx: 0,
                        vy: 0,
                        opacity: 0,
                        size: 1.5 + Math.random(),
                        angle: Math.random() * Math.PI * 2,
                        radius: 50 + Math.random() * 100,
                        speed: 0.002 + Math.random() * 0.003,
                        color: Math.random() > 0.5 ? 'rgba(79,110,247,' : 'rgba(129,140,248,',
                    });
                }
            });
            return pts;
        };

        particlesRef.current = createParticles();

        let startTime: number | null = null;
        let lineProgress = 0;

        // フェーズ3でパーティクルが収束する六角形の6頂点座標を計算
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 3) * i - Math.PI / 2;
            return { x: cx + Math.cos(a) * 80, y: cy + Math.sin(a) * 80 };
        });

        const animate = (ts: number) => {
            if (!startTime) startTime = ts;
            const elapsed = ts - startTime;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // フェーズ判定
            let phase = 0;
            let phaseElapsed = elapsed;
            let acc = 0;
            for (let i = 0; i < PHASE_DURATIONS.length; i++) {
                if (elapsed < acc + PHASE_DURATIONS[i]) {
                    phase = i;
                    phaseElapsed = elapsed - acc;
                    break;
                }
                acc += PHASE_DURATIONS[i];
                phase = i + 1;
                phaseElapsed = elapsed - acc;
            }

            if (phase !== phaseRef.current) {
                phaseRef.current = phase;
                if (phase === 1) setPhaseLabel('思考を読み解いています');
                if (phase === 2) setPhaseLabel('再構築しています...');
            }

            const particles = particlesRef.current;

            if (phase === 0) {
                // フェーズ1: 出現
                const p = Math.min(phaseElapsed / PHASE_DURATIONS[0], 1);
                for (const pt of particles) {
                    pt.opacity = Math.min(pt.opacity + 0.015, 0.7 * p + 0.1);
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                    ctx.fillStyle = `${pt.color}${pt.opacity})`;
                    ctx.fill();
                }
            } else if (phase === 1) {
                // フェーズ2: 渦巻き収束
                const p = Math.min(phaseElapsed / PHASE_DURATIONS[1], 1);
                for (const pt of particles) {
                    pt.angle += pt.speed;
                    const shrink = 1 - p * 0.8;
                    const tx = cx + Math.cos(pt.angle) * pt.radius * shrink;
                    const ty = cy + Math.sin(pt.angle) * pt.radius * shrink;
                    pt.x += (tx - pt.x) * 0.05;
                    pt.y += (ty - pt.y) * 0.05;
                    const col = Math.min(1, 0.6 + p * 0.4);
                    pt.opacity = Math.min(pt.opacity + 0.01, col);
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                    ctx.fillStyle = `${pt.color}${pt.opacity})`;
                    ctx.fill();
                }
            } else if (phase === 2) {
                // フェーズ3: ジオメトリ形成
                const p = Math.min(phaseElapsed / PHASE_DURATIONS[2], 1);
                lineProgress = p;

                // パーティクルを六角形の頂点周辺へ
                for (let i = 0; i < particles.length; i++) {
                    const pt = particles[i];
                    const hexIdx = i % 6;
                    const hx = hexPoints[hexIdx].x;
                    const hy = hexPoints[hexIdx].y;
                    pt.x += (hx - pt.x) * 0.06;
                    pt.y += (hy - pt.y) * 0.06;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                    ctx.fillStyle = `${pt.color}${pt.opacity})`;
                    ctx.fill();
                }

                // 六角形の辺を描画
                const numLines = 6;
                const drawnLines = Math.floor(lineProgress * numLines);
                for (let i = 0; i < drawnLines; i++) {
                    const from = hexPoints[i];
                    const to = hexPoints[(i + 1) % 6];
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(to.x, to.y);
                    ctx.strokeStyle = 'rgba(79,110,247,0.4)';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
                // 描画中の辺（部分）
                if (drawnLines < numLines) {
                    const partial = (lineProgress * numLines) - drawnLines;
                    const from = hexPoints[drawnLines];
                    const to = hexPoints[(drawnLines + 1) % 6];
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(
                        from.x + (to.x - from.x) * partial,
                        from.y + (to.y - from.y) * partial
                    );
                    ctx.strokeStyle = 'rgba(79,110,247,0.4)';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }

                // 完成時パルス
                if (p > 0.95) {
                    const pulse = Math.sin((p - 0.95) / 0.05 * Math.PI);
                    ctx.beginPath();
                    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(79,110,247,${pulse * 0.5})`;
                    ctx.lineWidth = pulse * 8;
                    ctx.stroke();
                }
            }

            // アニメーション完了後にPOST /api/logs を呼び出し、完了後に結果画面へ遷移
            if (elapsed > TOTAL_DURATION + 200) {
                cancelAnimationFrame(animRef.current);
                const answers: string[] = JSON.parse(sessionStorage.getItem('answers') || '[]');
                const content = answers.join('\n');
                fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content }),
                })
                    .catch(() => { })
                    .finally(() => {
                        setExiting(true);
                        setTimeout(() => router.push('/universe'), 400);
                    });
                return;
            }


            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animRef.current);
    }, [router]);

    return (
        <AnimatePresence>
            {!exiting && (
                <motion.div
                    {...(swipeBind() as object)}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        position: 'fixed',
                        touchAction: 'pan-y',
                        inset: 0,
                        background: '#050810',
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'fixed', inset: 0 }}
                    />

                    {/* テキストオーバーレイ */}
                    <AnimatePresence mode="wait">
                        {phaseLabel && (
                            <motion.div
                                key={phaseLabel}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6 }}
                                style={{
                                    position: 'fixed',
                                    bottom: 80,
                                    left: 0,
                                    right: 0,
                                    textAlign: 'center',
                                    fontFamily: 'var(--font-serif), serif',
                                    fontSize: 13,
                                    color: 'rgba(241,245,249,0.4)',
                                    letterSpacing: '0.2em',
                                    zIndex: 10,
                                }}
                            >
                                {phaseLabel}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 戻るボタン */}
                    <button
                        onClick={handleBack}
                        style={{
                            position: 'fixed',
                            top: 28,
                            left: 28,
                            background: 'none',
                            border: 'none',
                            color: 'rgba(100,116,139,0.4)',
                            fontFamily: 'var(--font-sans), sans-serif',
                            fontSize: 18,
                            cursor: 'pointer',
                            zIndex: 10,
                            transition: 'color 200ms',
                            padding: '4px 8px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.6)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(100,116,139,0.4)')}
                    >
                        ←
                    </button>

                    {/* スキップボタン */}
                    <button
                        onClick={handleSkip}
                        style={{
                            position: 'fixed',
                            bottom: 32,
                            right: 32,
                            background: 'none',
                            border: 'none',
                            color: 'rgba(100,116,139,0.5)',
                            fontFamily: 'var(--font-sans), sans-serif',
                            fontSize: 11,
                            cursor: 'pointer',
                            zIndex: 10,
                            transition: 'color 200ms',
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color = 'rgba(241,245,249,0.6)')
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')
                        }
                    >
                        スキップ →
                    </button>
                    {swipeDx > 8 && (
                        <div style={{
                            position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)',
                            width: 3, height: 52, borderRadius: '0 3px 3px 0',
                            background: `rgba(79,110,247,${Math.min(swipeDx / 80, 1) * 0.65})`,
                            pointerEvents: 'none', zIndex: 9997,
                            boxShadow: `0 0 8px rgba(79,110,247,${Math.min(swipeDx / 80, 1) * 0.4})`,
                        }} />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
