'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import ParticleCanvas from '../components/ParticleCanvas';
import type { LogItem, CategoryScores } from '../types/api';

// ISO日付文字列を yyyy/MM/dd 形式に変換
function formatSessionDate(iso: string): string {
    // new Date() でパースし、月・日を2桁ゼロ埋めしてスラッシュ区切りで結合
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// 5カテゴリスコアの平均値を 0〜100 のスコアに変換
function computeScore(scores: CategoryScores | null): number {
    if (!scores) return 0; // スコアが未取得（分析未実行）のときは 0 を返す
    // DBでは 0〜1 スケールで保存されているため、5値の平均に ×100 して整数化
    const vals = [scores.analytical, scores.strategic, scores.exploratory, scores.reflective, scores.social];
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}


// スコア推移を折れ線グラフで表示するSVGコンポーネント
function ScoreTrendChart({ sessions }: { sessions: LogItem[] }) {
    const w = 320;
    const h = 80;
    const pad = { l: 8, r: 8, t: 12, b: 8 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    // セッションを古い順（昇順）に並べ直し、各スコアを算出
    const scores = [...sessions].reverse().map((s) => computeScore(s.scores));
    if (scores.length < 2) return null;

    // スコアの最小・最大から上下に10点のマージンを取り、Y軸の表示範囲を決定
    const minS = Math.max(0, Math.min(...scores) - 10);
    const maxS = Math.min(100, Math.max(...scores) + 10);
    const range = maxS - minS || 1;

    // 各スコアを SVG 座標に変換（X: 時系列、Y: スコア値を正規化して上下反転）
    const pts = scores.map((s, i) => ({
        x: pad.l + (i / (scores.length - 1)) * plotW,
        y: pad.t + (1 - (s - minS) / range) * plotH,
        score: s,
    }));

    // 折れ線パス（M/L コマンド）と塗りつぶしエリアパス（底辺まで閉じる）を生成
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${h - pad.b} L ${pts[0].x} ${h - pad.b} Z`;

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(79,110,247,0.25)" />
                    <stop offset="100%" stopColor="rgba(79,110,247,0)" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#area-grad)" />
            <path d={linePath} fill="none" stroke="rgba(79,110,247,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5}
                    fill={p.score >= 70 ? 'rgba(99,179,237,0.9)' : 'rgba(252,129,129,0.9)'}
                    stroke="none" />
            ))}
        </svg>
    );
}

// ログ1件の日付・スコア・カテゴリ詳細を表示するアコーディオンカード
function SessionCard({ session, index }: { session: LogItem; index: number }) {
    const [open, setOpen] = useState(false);
    const cats: (keyof CategoryScores)[] = ['analytical', 'strategic', 'exploratory', 'reflective', 'social'];
    const labels: Record<keyof CategoryScores, string> = {
        analytical: '論理性', strategic: '戦略性', exploratory: '探究心', reflective: '振り返り', social: '社会性',
    };
    // カテゴリをスコア降順に並べて、最も高い項目が先頭に来るようにする
    const sorted = cats
        .map((cat) => ({ label: labels[cat], value: Math.round((session.scores?.[cat] ?? 0) * 100) }))
        .sort((a, b) => b.value - a.value);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            style={{
                borderBottom: '1px solid rgba(79,110,247,0.08)',
                overflow: 'hidden',
            }}
        >
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    cursor: 'pointer',
                    gap: 12,
                }}
            >
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 11, color: 'rgba(100,116,139,0.6)', minWidth: 80, textAlign: 'left' }}>
                    {formatSessionDate(session.createdAt)}
                </span>
                <div style={{ flex: 1, height: 3, background: 'rgba(79,110,247,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${computeScore(session.scores)}%`,
                        background: computeScore(session.scores) >= 70 ? 'rgba(59,130,246,0.6)' : 'rgba(239,68,68,0.5)',
                        borderRadius: 2,
                        transition: 'width 0.6s ease-out',
                    }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, color: computeScore(session.scores) >= 70 ? 'rgba(99,179,237,0.9)' : 'rgba(252,129,129,0.9)', minWidth: 28, textAlign: 'right' }}>
                    {computeScore(session.scores)}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(100,116,139,0.4)', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                    ▾
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {sorted.map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: 10, color: 'rgba(100,116,139,0.6)', width: 52, textAlign: 'right', flexShrink: 0 }}>{label}</span>
                                    <div style={{ flex: 1, height: 2, background: 'rgba(79,110,247,0.1)', borderRadius: 1, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${value}%`,
                                            background: value >= 70 ? 'rgba(59,130,246,0.55)' : 'rgba(239,68,68,0.45)',
                                            borderRadius: 1,
                                        }} />
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: 'rgba(148,163,184,0.6)', minWidth: 24, textAlign: 'right' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function HistoryPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<LogItem[]>([]);
    const [exiting, setExiting] = useState(false);
    const [swipeDx, setSwipeDx] = useState(0);

    // 画面表示時に GET /api/logs でログ一覧を取得
    useEffect(() => {
        fetch('/api/logs')
            .then((res) => res.json())
            // レスポンスの logs 配列をセット（未取得時は空配列でフォールバック）
            .then((data) => setSessions(data.logs ?? []))
            .catch(() => { });
    }, []);

    const handleBack = () => {
        if (exiting) return;
        setExiting(true);
        setTimeout(() => router.push('/'), 600);
    };

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

    const avg = sessions.length > 0
        ? Math.round(sessions.reduce((a, s) => a + computeScore(s.scores), 0) / sessions.length)
        : null;


    return (
        <main
            {...swipeBind()}
            style={{
                minHeight: '100vh',
                background: '#050810',
                position: 'relative',
                touchAction: 'pan-y',
                padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 24px)',
            }}
        >
            <ParticleCanvas opacity={0.4} />

            <motion.div
                animate={exiting ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeIn' }}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: 480,
                    margin: '0 auto',
                    width: '100%',
                }}
            >
                {/* ヘッダー */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
                    <button
                        onClick={handleBack}
                        style={{ background: 'none', border: 'none', color: 'rgba(241,245,249,0.3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', transition: 'color 200ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.7)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.3)')}
                    >
                        ←
                    </button>
                    <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: 13, letterSpacing: '0.2em', color: 'rgba(241,245,249,0.35)' }}>
                        Session Log
                    </span>
                    <div style={{ width: 40 }} />
                </div>

                {sessions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        style={{ textAlign: 'center', paddingTop: 80 }}
                    >
                        <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 14, color: 'rgba(100,116,139,0.5)', lineHeight: 2 }}>
                            まだセッションの記録がありません
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* サマリー */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ marginBottom: 32, display: 'flex', gap: 24, alignItems: 'flex-end' }}
                        >
                            <div>
                                <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                                    Total Sessions
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 32, color: '#E2E8F0', lineHeight: 1 }}>
                                    {sessions.length}
                                </div>
                            </div>
                            {avg !== null && (
                                <div>
                                    <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                                        Avg Score
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 32, color: avg >= 70 ? 'rgba(99,179,237,0.9)' : 'rgba(252,129,129,0.9)', lineHeight: 1 }}>
                                        {avg}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* スコア推移グラフ */}
                        {sessions.length >= 2 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.15 }}
                                style={{ marginBottom: 32 }}
                            >
                                <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#64748B', textTransform: 'uppercase', marginBottom: 10 }}>
                                    Score Trend
                                </div>
                                <ScoreTrendChart sessions={sessions} />
                            </motion.div>
                        )}

                        {/* セッションリスト */}
                        <div>
                            <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                                History
                            </div>
                            {sessions.map((session, i) => (
                                <SessionCard key={session.id} session={session} index={i} />
                            ))}
                        </div>
                    </>
                )}
            </motion.div>

            {swipeDx > 8 && (
                <div style={{
                    position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 52, borderRadius: '0 3px 3px 0',
                    background: `rgba(79,110,247,${Math.min(swipeDx / 80, 1) * 0.65})`,
                    pointerEvents: 'none', zIndex: 9997,
                    boxShadow: `0 0 8px rgba(79,110,247,${Math.min(swipeDx / 80, 1) * 0.4})`,
                }} />
            )}
            {exiting && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.55, ease: 'easeIn' }}
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#050810', pointerEvents: 'none' }}
                />
            )}
        </main>
    );
}
