'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import ParticleCanvas from '../components/ParticleCanvas';
import PrescriptionOverlay from '../components/PrescriptionOverlay';

interface Node {
    id: string;
    label: string;
    type: 'rigid' | 'flexible';
    description: string;
}

// APIデータ取得前に表示するフォールバック用のデフォルト値
const MOCK_RESULT = {
    agilityScore: 73,
    radarData: {
        labels: ['論理性', '戦略性', '探究心', '振り返り', '社会性'],
        values: [72, 64, 55, 43, 60],
    },
    nodes: [
        { id: 'n5', label: '今日の焦り', type: 'rigid' as const, description: '会議での遮断体験から発生。完璧主義・承認欲求の両ノードと強く連動しています。' },
        { id: 'n2', label: '承認欲求', type: 'rigid' as const, description: '他者の評価に過度に反応しています。相手の行動を「否定」と解釈するパターンが見えます。' },
        { id: 'n4', label: '問題解決', type: 'flexible' as const, description: '複雑な課題を分解する力があります。感情が落ち着いているときに特に発揮されます。' },
        { id: 'n3', label: '傾聴スキル', type: 'flexible' as const, description: '過去の1on1での成功体験あり。この強みを明日の会議で活かせます。' },
        { id: 'n1', label: '完璧主義', type: 'rigid' as const, description: '「できない自分」を許せない傾向があります。この硬直が焦りの根本にある可能性があります。' },
    ] as Node[],
    relatedEdges: [
        { from: 'n1', to: 'n5' },
        { from: 'n2', to: 'n5' },
        { from: 'n3', to: 'n4' },
    ],
};
const SVG_W = 520;
const SVG_H = 480;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const ORBIT_R = 172;
const CENTER_R = 44;
const NODE_R_RIGID = 40;
const NODE_R_FLEX = 36;

// ノードを円周上に等間隔で配置するための座標を計算
function getRadialPos(index: number, total: number) {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    return { x: CX + Math.cos(angle) * ORBIT_R, y: CY + Math.sin(angle) * ORBIT_R, angle };
}

// 思考マップをSVGで描画するコンポーネント。スポーク・エッジ・ノード・ゴーストノードをアニメーション表示
function MindMapSVG({
    nodes, relatedEdges, posMap, selectedNode, pulseOffset, total, onSelectNode, svgStyle,
}: {
    nodes: Node[];
    relatedEdges: { from: string; to: string }[];
    posMap: Record<string, { x: number; y: number }>;
    selectedNode: Node | null;
    pulseOffset: number[];
    total: number;
    onSelectNode: (n: Node) => void;
    svgStyle?: React.CSSProperties;
}) {
    return (
        <motion.svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ overflow: 'visible', ...svgStyle }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <defs>
                {nodes.map((node) => {
                    const pos = posMap[node.id];
                    return (
                        <linearGradient key={`grad-${node.id}`} id={`spoke-grad-${node.id}`}
                            x1={CX} y1={CY} x2={pos.x} y2={pos.y} gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="rgba(79,110,247,0.9)" />
                            <stop offset="100%" stopColor={node.type === 'rigid' ? 'rgba(239,68,68,0.55)' : 'rgba(59,130,246,0.55)'} />
                        </linearGradient>
                    );
                })}
                <radialGradient id="fog-radial" cx={CX} cy={CY} r="290"
                    gradientUnits="userSpaceOnUse">
                    <stop offset="65%" stopColor="#050810" stopOpacity="0" />
                    <stop offset="78%" stopColor="#050810" stopOpacity="0.4" />
                    <stop offset="90%" stopColor="#050810" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#050810" stopOpacity="0.95" />
                </radialGradient>
                <filter id="ghost-blur">
                    <feGaussianBlur stdDeviation="1.5" />
                </filter>
            </defs>

            {nodes.map((node, i) => {
                const pos = posMap[node.id];
                return (
                    <motion.line key={`spoke-${node.id}`}
                        x1={CX} y1={CY} x2={pos.x} y2={pos.y}
                        stroke={`url(#spoke-grad-${node.id})`} strokeWidth="1.8"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.07 }}
                    />
                );
            })}

            {relatedEdges.map((edge, i) => {
                const fp = posMap[edge.from];
                const tp = posMap[edge.to];
                if (!fp || !tp) return null;
                const mx = (fp.x + tp.x) / 2 + (CX - (fp.x + tp.x) / 2) * 0.25;
                const my = (fp.y + tp.y) / 2 + (CY - (fp.y + tp.y) / 2) * 0.25;
                return (
                    <motion.path key={`edge-${i}`}
                        d={`M ${fp.x} ${fp.y} Q ${mx} ${my} ${tp.x} ${tp.y}`}
                        fill="none" stroke="rgba(100,116,139,0.18)" strokeWidth="0.8" strokeDasharray="3 5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.7 + i * 0.1 }}
                    />
                );
            })}

            <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <motion.circle cx={CX} cy={CY} r={CENTER_R + 28} fill="rgba(79,110,247,0.04)"
                    animate={{ r: [CENTER_R + 24, CENTER_R + 34, CENTER_R + 24] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }} />
                <motion.circle cx={CX} cy={CY} r={CENTER_R + 14} fill="rgba(79,110,247,0.08)"
                    animate={{ r: [CENTER_R + 12, CENTER_R + 18, CENTER_R + 12] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }} />
                <circle cx={CX} cy={CY} r={CENTER_R}
                    fill="#050810"
                    stroke="rgba(79,110,247,0.75)"
                    strokeWidth="2"
                    style={{ filter: 'drop-shadow(0 0 16px rgba(79,110,247,0.6))' }} />
                <circle cx={CX} cy={CY} r={CENTER_R}
                    fill="rgba(79,110,247,0.22)"
                    stroke="none" />
                <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(241,245,249,0.9)" fontSize="22" fontFamily="var(--font-serif)"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.8))' }}>
                    核
                </text>
            </motion.g>

            {nodes.map((node, i) => {
                const pos = posMap[node.id];
                const nr = node.type === 'rigid' ? NODE_R_RIGID : NODE_R_FLEX;
                const isSelected = selectedNode?.id === node.id;
                const isRigid = node.type === 'rigid';
                const pOffset = pulseOffset[i] ?? 0;

                return (
                    <motion.g key={node.id} style={{ cursor: 'pointer' }} onClick={() => onSelectNode(node)}
                        initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, delay: 0.2 + i * 0.09, type: 'spring', stiffness: 220 }}>
                        <circle cx={pos.x} cy={pos.y} r={nr + 16}
                            fill={isRigid ? 'rgba(239,68,68,0.05)' : 'rgba(59,130,246,0.05)'} />
                        <circle cx={pos.x} cy={pos.y} r={nr + 8}
                            fill={isRigid ? 'rgba(239,68,68,0.07)' : 'rgba(59,130,246,0.07)'} />
                        <motion.circle cx={pos.x} cy={pos.y} r={nr}
                            fill={isRigid ? 'rgba(239,68,68,0.13)' : 'rgba(59,130,246,0.13)'}
                            stroke={isSelected ? 'rgba(255,255,255,0.9)' : isRigid ? 'rgba(239,68,68,0.85)' : 'rgba(59,130,246,0.75)'}
                            strokeWidth={isSelected ? 2.5 : 2}
                            animate={{ scale: [1, 1.06, 1] }}
                            transition={{ repeat: Infinity, duration: 2 + pOffset * 0.4, ease: 'easeInOut' }}
                            style={{
                                filter: isRigid
                                    ? 'drop-shadow(0 0 12px rgba(239,68,68,0.55))'
                                    : 'drop-shadow(0 0 10px rgba(59,130,246,0.5))'
                            }} />
                        <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                            fill={isRigid ? 'rgba(249,180,180,0.95)' : 'rgba(147,197,253,0.95)'}
                            fontSize="12" fontFamily="var(--font-serif)" fontWeight="400"
                            style={{
                                pointerEvents: 'none', userSelect: 'none',
                                filter: isRigid ? 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' : 'drop-shadow(0 0 4px rgba(59,130,246,0.5))'
                            }}>
                            {node.label}
                        </text>
                    </motion.g>
                );
            })}

            <rect x="0" y="0" width={SVG_W} height={SVG_H}
                fill="url(#fog-radial)" style={{ pointerEvents: 'none' }} />

            {[
                { angle: -54 * Math.PI / 180, delay: 0 },
                { angle: 162 * Math.PI / 180, delay: 0.4 },
            ].map(({ angle, delay }, i) => {
                const gx = CX + Math.cos(angle) * 235;
                const gy = CY + Math.sin(angle) * 235;
                return (
                    <motion.g key={`ghost-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.65, 0.3] }}
                        transition={{ duration: 4 + i * 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}>
                        <circle cx={gx} cy={gy} r={32}
                            fill="rgba(79,110,247,0.03)"
                            stroke="rgba(129,140,248,0.22)"
                            strokeWidth="1.2"
                            strokeDasharray="4 4"
                            filter="url(#ghost-blur)" />
                        <text x={gx} y={gy} textAnchor="middle" dominantBaseline="middle"
                            fill="rgba(129,140,248,0.28)" fontSize="16" fontFamily="var(--font-serif)"
                            filter="url(#ghost-blur)"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                            ?
                        </text>
                    </motion.g>
                );
            })}
        </motion.svg>
    );
}

// 5カテゴリスコアをレーダーチャートで表示するコンポーネント。1200ms かけて各軸の値まで伸びるアニメーション付き
function RadarChart({ labels, values, size = 190 }: { labels: string[]; values: number[]; size?: number }) {
    const [progress, setProgress] = useState(0);
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.35;
    const n = labels.length;

    useEffect(() => {
        let start: number | null = null;
        const step = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / 1200, 1);
            setProgress(p);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, []);

    const getPoint = (i: number, radius: number) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    };

    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const dataPoints = values.map((v, i) => getPoint(i, (v / 100) * r * progress));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
            {gridLevels.map((lvl) => {
                const pts = Array.from({ length: n }, (_, i) => getPoint(i, r * lvl));
                const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
                return <path key={lvl} d={path} fill="none" stroke="rgba(79,110,247,0.15)" strokeWidth="0.8" />;
            })}
            {Array.from({ length: n }, (_, i) => {
                const p = getPoint(i, r);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(79,110,247,0.1)" strokeWidth="0.5" />;
            })}
            <path d={dataPath} fill="rgba(79,110,247,0.15)" stroke="rgba(79,110,247,0.6)" strokeWidth="1.5" />
            {labels.map((label, i) => {
                const p = getPoint(i, r + size * 0.13);
                return (
                    <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(203,213,225,0.6)" fontSize={size < 200 ? '10' : '11'} fontFamily="var(--font-serif)" fontWeight="400">
                        {label}
                    </text>
                );
            })}
        </svg>
    );
}

type Tab = 'map' | 'analysis';

const TABS: { id: Tab; label: string }[] = [
    { id: 'map', label: 'マインドマップ' },
    { id: 'analysis', label: '思考分析' },
];

// マップ/分析タブを切り替えるタブバー（モバイル専用）
function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
    return (
        <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(79,110,247,0.12)',
            flexShrink: 0,
        }}>
            {TABS.map((tab) => {
                const isActive = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        style={{
                            flex: 1,
                            position: 'relative',
                            background: 'none',
                            border: 'none',
                            padding: '12px 0',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans), sans-serif',
                            fontSize: 11,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            color: isActive ? 'rgba(129,140,248,0.9)' : 'rgba(100,116,139,0.5)',
                            transition: 'color 250ms ease-out',
                        }}
                    >
                        {tab.label}
                        {isActive && (
                            <motion.div
                                layoutId="tab-indicator"
                                style={{
                                    position: 'absolute',
                                    bottom: -1,
                                    left: '15%',
                                    right: '15%',
                                    height: 1.5,
                                    background: 'rgba(79,110,247,0.8)',
                                    borderRadius: 1,
                                }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// レーダーチャートとカテゴリスコアバーを並べた思考分析ビュー
function AnalysisView({ labels, values }: { labels: string[]; values: number[] }) {
    const scoreItems = labels.map((label, i) => ({ label, value: values[i] }))
        .sort((a, b) => b.value - a.value);

    return (
        <motion.div
            key="analysis"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 24px', gap: 24, minHeight: 0, overflowY: 'auto' }}
        >
            <RadarChart labels={labels} values={values} size={240} />

            <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scoreItems.map(({ label, value }, i) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            fontFamily: 'var(--font-sans), sans-serif',
                            fontSize: 10,
                            color: 'rgba(100,116,139,0.7)',
                            width: 52,
                            flexShrink: 0,
                            textAlign: 'right',
                        }}>
                            {label}
                        </span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(79,110,247,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${value}%` }}
                                transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: 'easeOut' }}
                                style={{
                                    height: '100%',
                                    background: value >= 70 ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.6)',
                                    borderRadius: 2,
                                }}
                            />
                        </div>
                        <span style={{
                            fontFamily: 'var(--font-mono), monospace',
                            fontSize: 11,
                            color: value >= 70 ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)',
                            width: 28,
                            flexShrink: 0,
                        }}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

// マインドマップと凡例を表示するビュー（モバイル用タブ切り替えで使用）
function MapView({
    nodes, relatedEdges, posMap, selectedNode, pulseOffset, total, onSelectNode,
}: {
    nodes: Node[];
    relatedEdges: { from: string; to: string }[];
    posMap: Record<string, { x: number; y: number }>;
    selectedNode: Node | null;
    pulseOffset: number[];
    total: number;
    onSelectNode: (n: Node) => void;
}) {
    return (
        <motion.div
            key="map"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', minHeight: 0 }}
        >
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(239,68,68,0.6)', boxShadow: '0 0 5px rgba(239,68,68,0.4)' }} />
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, color: 'rgba(239,68,68,0.7)' }}>硬直</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(59,130,246,0.6)', boxShadow: '0 0 5px rgba(59,130,246,0.4)' }} />
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, color: 'rgba(59,130,246,0.7)' }}>柔軟</span>
                </div>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, color: 'rgba(100,116,139,0.4)' }}>
                    ノードをタップ → 詳細を開く        </span>
            </div>

            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                <MindMapSVG
                    nodes={nodes} relatedEdges={relatedEdges} posMap={posMap}
                    selectedNode={selectedNode} pulseOffset={pulseOffset} total={total}
                    onSelectNode={onSelectNode}
                    svgStyle={{ width: '100%', height: '100%', maxWidth: 560 }}
                />
            </div>
        </motion.div>
    );
}

export default function UniversePage() {
    const router = useRouter();
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('map');
    const [pulseOffset, setPulseOffset] = useState<number[]>([]);
    const [exiting, setExiting] = useState(false);

    // ホームへ遷移する（600ms フェードアウト後に / へ遷移）
    const handleNavigateHome = () => {
        if (exiting) return;
        setExiting(true);
        setTimeout(() => router.push('/'), 600);
    };

    // セッション画面へ戻る（600ms フェードアウト後に /session へ遷移）
    const handleBack = () => {
        if (exiting) return;
        setExiting(true);
        setTimeout(() => router.push('/session'), 600);
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

    const [result, setResult] = useState(MOCK_RESULT);

    // マウント時にAPI取得・モバイル判定・パルスアニメーション初期化を実行
    useEffect(() => {
        setMounted(true);
        setPulseOffset(MOCK_RESULT.nodes.map(() => Math.random() * 2));
        fetch('/api/portfolio')
            .then((res) => res.json())
            .then((data) => {
                if (data.agility && !data.agility.isEmpty) {
                    const cats = data.categoryAverages;
                    setResult((r) => ({
                        ...r,
                        agilityScore: data.agility.score,
                        radarData: {
                            labels: ['論理性', '戦略性', '探究心', '振り返り', '社会性'],
                            values: [
                                Math.round(cats.analytical * 100),
                                Math.round(cats.strategic * 100),
                                Math.round(cats.exploratory * 100),
                                Math.round(cats.reflective * 100),
                                Math.round(cats.social * 100),
                            ],
                        },
                    }));
                }
            })
            .catch(() => { });
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    if (!mounted) return null;

    const { nodes, relatedEdges } = MOCK_RESULT;
    const total = nodes.length;

    // 各ノードのSVG座標をIDをキーとしたマップに変換
    const posMap: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node, i) => {
        const { x, y } = getRadialPos(i, total);
        posMap[node.id] = { x, y };
    });

    const mapProps = { nodes, relatedEdges, posMap, selectedNode, pulseOffset, total, onSelectNode: setSelectedNode };

    return (
        <main
            {...swipeBind()}
            style={{
                height: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                background: '#050810',
                position: 'relative',
                overflow: 'hidden',
                touchAction: 'pan-y',
            }}
        >
            <ParticleCanvas opacity={0.3} />

            <motion.div
                animate={exiting ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeIn' }}
                style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
            >

                <div style={{
                    height: 56,
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px',
                    borderBottom: '1px solid rgba(79,110,247,0.1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button
                            onClick={handleBack}
                            disabled={exiting}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(241,245,249,0.3)', fontSize: 18, padding: '4px 2px',
                                transition: 'color 200ms',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.7)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.3)')}
                        >
                            ←
                        </button>
                        <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: 14, letterSpacing: '0.15em', color: 'rgba(241,245,249,0.4)' }}>
                            Receptor
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10, letterSpacing: '0.15em', color: '#64748B', textTransform: 'uppercase' }}>Agility Score</div>
                        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 20, color: '#E2E8F0', textShadow: '0 0 20px rgba(79,110,247,0.5)' }}>
                            {result.agilityScore}
                        </div>
                    </div>
                </div>

                {isMobile ? (
                    <>
                        <TabBar active={activeTab} onChange={setActiveTab} />

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <AnimatePresence mode="wait">
                                {activeTab === 'map'
                                    ? <MapView key="map" {...mapProps} />
                                    : <AnalysisView key="analysis"
                                        labels={result.radarData.labels}
                                        values={result.radarData.values}
                                    />
                                }
                            </AnimatePresence>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.0 }}
                            style={{ flexShrink: 0, padding: '10px 20px 24px', borderTop: '1px solid rgba(79,110,247,0.08)' }}
                        >
                            <button
                                onClick={handleNavigateHome}
                                disabled={exiting}
                                style={{
                                    width: '100%',
                                    border: '1px solid rgba(79,110,247,0.4)',
                                    background: 'rgba(79,110,247,0.08)',
                                    color: 'rgba(129,140,248,0.9)',
                                    padding: '13px 0',
                                    borderRadius: 2,
                                    fontFamily: 'var(--font-sans), sans-serif',
                                    fontSize: 12,
                                    letterSpacing: '0.1em',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    transition: 'all 300ms ease-out',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(79,110,247,0.18)';
                                    e.currentTarget.style.borderColor = 'rgba(129,140,248,0.7)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(79,110,247,0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(79,110,247,0.4)';
                                }}
                            >
                                <span>今日を振り返る</span>
                                <span style={{ fontSize: 14 }}>→</span>
                            </button>
                        </motion.div>
                    </>
                ) : (
                    <>
                        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative' }}>
                                <MindMapSVG {...mapProps} svgStyle={{ width: '100%', maxWidth: 560 }} />
                                <div style={{ position: 'absolute', bottom: 16, left: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
                                    {[
                                        { color: 'rgba(239,68,68,0.6)', shadow: 'rgba(239,68,68,0.4)', label: '硬直ノード', textColor: 'rgba(239,68,68,0.7)' },
                                        { color: 'rgba(59,130,246,0.6)', shadow: 'rgba(59,130,246,0.4)', label: '柔軟ノード', textColor: 'rgba(59,130,246,0.7)' },
                                    ].map(({ color, shadow, label, textColor }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${shadow}` }} />
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: textColor }}>{label}</span>
                                        </div>
                                    ))}
                                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(100,116,139,0.45)' }}>
                                        ノードをタップ → 詳細を開く                  </span>
                                </div>
                            </div>

                            <div style={{
                                width: 360,
                                flexShrink: 0,
                                borderLeft: '1px solid rgba(79,110,247,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '24px 20px',
                                gap: 20,
                                overflowY: 'auto',
                            }}>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.2em', color: 'rgba(203,213,225,0.65)', marginBottom: 20 }}>
                                        思考分析                  </div>
                                    <RadarChart labels={result.radarData.labels} values={result.radarData.values} size={260} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {result.radarData.labels
                                        .map((label, i) => ({ label, value: result.radarData.values[i] }))
                                        .sort((a, b) => b.value - a.value)
                                        .map(({ label, value }, i) => (
                                            <div key={label}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                                                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 11, color: 'rgba(203,213,225,0.7)' }}>{label}</span>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: value >= 70 ? 'rgba(99,179,237,0.9)' : 'rgba(252,129,129,0.9)' }}>{value}</span>
                                                </div>
                                                <div style={{ height: 4, background: 'rgba(79,110,247,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${value}%` }}
                                                        transition={{ duration: 0.8, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
                                                        style={{ height: '100%', background: value >= 70 ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.6)', borderRadius: 2 }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.0 }}
                            style={{ flexShrink: 0, padding: '16px 24px 28px', textAlign: 'center', borderTop: '1px solid rgba(79,110,247,0.08)' }}
                        >
                            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: 'rgba(241,245,249,0.3)', letterSpacing: '0.1em', marginBottom: 14 }}>
                                今日のセッションが記録されました
                            </p>
                            <button
                                onClick={handleNavigateHome}
                                disabled={exiting}
                                style={{
                                    border: '1px solid rgba(79,110,247,0.4)',
                                    background: 'rgba(79,110,247,0.08)',
                                    color: 'rgba(129,140,248,0.9)',
                                    padding: '13px 36px',
                                    borderRadius: 2,
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: 13,
                                    letterSpacing: '0.12em',
                                    backdropFilter: 'blur(8px)',
                                    cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 10,
                                    transition: 'all 300ms ease-out',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(79,110,247,0.18)';
                                    e.currentTarget.style.borderColor = 'rgba(129,140,248,0.7)';
                                    e.currentTarget.style.boxShadow = '0 0 28px rgba(79,110,247,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(79,110,247,0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(79,110,247,0.4)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <span>今日を振り返る</span>
                                <span style={{ fontSize: 16 }}>→</span>
                            </button>
                        </motion.div>
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

            <AnimatePresence>
                {selectedNode && (
                    <PrescriptionOverlay
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                        onSaveReminder={(text) => {
                            if (typeof window !== 'undefined') localStorage.setItem('reminder', text);
                        }}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}
