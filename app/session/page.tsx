'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from '@use-gesture/react';
import ParticleCanvas from '../components/ParticleCanvas';

type StepType = 'tag_select' | 'text_input';

interface Step {
    id: number;
    type: StepType;
    question: string;
    options?: string[];
    placeholder?: string;
}

// セッションで表示する質問ステップの定義（タグ選択2問 + テキスト入力3問）
const MOCK_STEPS: Step[] = [
    {
        id: 1,
        type: 'tag_select',
        question: '今日、どんな感情が一番大きかった？',
        options: ['焦り', '怒り', '不安', '疲弊', '達成感', '孤独', '高揚'],
    },
    {
        id: 2,
        type: 'tag_select',
        question: 'その感情はいつ一番強くなった？',
        options: ['朝の準備', '仕事中', '会議・商談', '昼休み', '帰宅後', '就寝前'],
    },
    {
        id: 3,
        type: 'text_input',
        question: '今日、心がザラついた瞬間は？できるだけ具体的に。',
        placeholder: '例：Aさんに話を遮られたとき、なぜか過剰に反応してしまった...',
    },
    {
        id: 4,
        type: 'text_input',
        question: 'その瞬間、本当は何を望んでいた？',
        placeholder: '例：もっと自分の意見を聞いてほしかった...',
    },
    {
        id: 5,
        type: 'text_input',
        question: '今の自分に一つだけ許すとしたら、何を許す？',
        placeholder: '例：完璧にできなかったことを、許す...',
    },
];

interface Dot {
    id: number;
    x: number;
    y: number;
    tx: number;
    ty: number;
}

export default function SessionPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [textValue, setTextValue] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [dots, setDots] = useState<Dot[]>([]);
    const [exiting, setExiting] = useState(false);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [swipeDx, setSwipeDx] = useState(0);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // 前のステップへ戻る。最初のステップの場合はホームへ遷移
    const handleBack = () => {
        if (isAnimating) return;
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep((s) => s - 1);
            setAnswers((a) => a.slice(0, -1));
            setTextValue('');
            return;
        }
        if (exiting) return;
        setExiting(true);
        setTimeout(() => router.back(), 600);
    };

    const step = MOCK_STEPS[currentStep];
    const totalSteps = MOCK_STEPS.length;

    // 回答を記録し、全問完了したら sessionStorage に保存して分析画面へ遷移
    const goNext = (answer: string) => {
        setDirection(1);
        const newAnswers = [...answers, answer];
        setAnswers(newAnswers);

        if (currentStep + 1 >= totalSteps) {
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('answers', JSON.stringify(newAnswers));
            }
            router.push('/analysis');
        } else {
            setCurrentStep((s) => s + 1);
            setTextValue('');
        }
    };

    // タグ選択時に 600ms のフラッシュアニメーション後に次ステップへ進む
    const handleTagSelect = (tag: string) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => {
            setIsAnimating(false);
            goNext(tag);
        }, 600);
    };

    // テキスト送信時にドット霧散アニメーションを起動し、完了後に次ステップへ進む
    const handleTextSubmit = () => {
        if (!textValue.trim() || isAnimating) return;
        setIsAnimating(true);

        // テキスト霧散アニメーション
        const rect = textAreaRef.current?.getBoundingClientRect();
        if (rect) {
            const newDots: Dot[] = Array.from({ length: 25 }, (_, i) => ({
                id: i,
                x: rect.left + Math.random() * rect.width,
                y: rect.top + Math.random() * rect.height,
                tx: window.innerWidth / 2,
                ty: window.innerHeight / 2,
            }));
            setDots(newDots);
        }

        setTimeout(() => {
            setDots([]);
            setIsAnimating(false);
            goNext(textValue.trim());
        }, 1000);
    };

    // 右スワイプで前の画面に戻るジェスチャー設定
    const swipeBind = useDrag(
        ({ movement: [mx, my], last, velocity: [vx] }) => {
            if (exiting || isAnimating) return;
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

    return (
        <main
            {...swipeBind()}
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                touchAction: 'pan-y',
                background: '#050810',
                position: 'relative',
                padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 24px)',
            }}
        >
            <ParticleCanvas opacity={0.5} />

            {/* 霧散ドットアニメーション */}
            {dots.map((dot) => (
                <motion.div
                    key={dot.id}
                    initial={{ x: dot.x, y: dot.y, opacity: 0.8, scale: 1 }}
                    animate={{ x: dot.tx, y: dot.ty, opacity: 0, scale: 0.1 }}
                    transition={{ duration: 0.7 + Math.random() * 0.2, delay: dot.id * 0.02 }}
                    style={{
                        position: 'fixed',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'rgba(79,110,247,0.8)',
                        pointerEvents: 'none',
                        zIndex: 100,
                        translateX: '-50%',
                        translateY: '-50%',
                    }}
                />
            ))}

            <motion.div
                animate={exiting ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeIn' }}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: 520,
                    margin: '0 auto',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                }}
            >
                {/* ヘッダー */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 32,
                    }}
                >
                    <button
                        onClick={handleBack}
                        disabled={exiting}
                        style={{
                            color: 'rgba(241,245,249,0.3)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 20,
                            transition: 'color 300ms',
                            padding: '4px 8px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.7)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(241,245,249,0.3)')}
                    >
                        ←
                    </button>
                    <span
                        style={{
                            fontFamily: 'var(--font-sans), sans-serif',
                            fontSize: 11,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'rgba(241,245,249,0.3)',
                        }}
                    >
                        Night Session
                    </span>
                </div>

                {/* ステップバー */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 48,
                        gap: 0,
                    }}
                >
                    {MOCK_STEPS.map((s, i) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                            {i > 0 && (
                                <div
                                    style={{
                                        width: 24,
                                        height: 1,
                                        background: 'rgba(79,110,247,0.2)',
                                    }}
                                />
                            )}
                            <div
                                style={{
                                    width: i === currentStep ? 8 : i < currentStep ? 6 : 4,
                                    height: i === currentStep ? 8 : i < currentStep ? 6 : 4,
                                    borderRadius: '50%',
                                    background:
                                        i === currentStep
                                            ? '#4F6EF7'
                                            : i < currentStep
                                                ? 'rgba(79,110,247,0.5)'
                                                : 'rgba(100,116,139,0.3)',
                                    boxShadow:
                                        i === currentStep
                                            ? '0 0 8px rgba(79,110,247,0.8)'
                                            : 'none',
                                    transition: 'all 300ms ease-out',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* メインエリア */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: direction * 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -direction * 10 }}
                            transition={{ duration: 0.4 }}
                        >
                            {/* 問いかけテキスト */}
                            <p
                                style={{
                                    fontFamily: 'var(--font-serif), serif',
                                    fontSize: 'clamp(18px, 4vw, 20px)',
                                    color: 'rgba(241,245,249,0.9)',
                                    lineHeight: 1.9,
                                    maxWidth: 420,
                                    margin: '0 auto 40px',
                                    textAlign: 'center',
                                }}
                            >
                                {step.question}
                            </p>

                            {/* タグ選択 */}
                            {step.type === 'tag_select' && step.options && (
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: 0,
                                        maxWidth: 420,
                                        margin: '0 auto',
                                    }}
                                >
                                    {step.options.map((opt) => (
                                        <TagButton
                                            key={opt}
                                            label={opt}
                                            onClick={() => handleTagSelect(opt)}
                                            disabled={isAnimating}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* テキスト入力 */}
                            {step.type === 'text_input' && (
                                <div
                                    style={{
                                        maxWidth: 420,
                                        margin: '0 auto',
                                        position: 'relative',
                                    }}
                                >
                                    <textarea
                                        ref={textAreaRef}
                                        value={textValue}
                                        onChange={(e) => setTextValue(e.target.value)}
                                        placeholder={step.placeholder}
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(10,15,30,0.5)',
                                            border: 'none',
                                            borderBottom: '1px solid rgba(79,110,247,0.3)',
                                            color: 'rgba(241,245,249,0.85)',
                                            fontFamily: 'var(--font-serif), serif',
                                            fontSize: 16,
                                            lineHeight: 1.9,
                                            padding: '12px 16px',
                                            resize: 'none',
                                            outline: 'none',
                                            transition: 'border-color 300ms',
                                        }}
                                        onFocus={(e) =>
                                            (e.currentTarget.style.borderBottomColor = 'rgba(79,110,247,0.8)')
                                        }
                                        onBlur={(e) =>
                                            (e.currentTarget.style.borderBottomColor = 'rgba(79,110,247,0.3)')
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                handleTextSubmit();
                                            }
                                        }}
                                    />
                                    <div style={{ textAlign: 'right', marginTop: 12 }}>
                                        <motion.button
                                            onClick={handleTextSubmit}
                                            disabled={!textValue.trim() || isAnimating}
                                            whileHover={{ x: 4 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'rgba(129,140,248,0.7)',
                                                cursor: textValue.trim() ? 'pointer' : 'default',
                                                fontFamily: 'var(--font-sans), sans-serif',
                                                fontSize: 14,
                                                opacity: textValue.trim() ? 1 : 0.4,
                                                transition: 'color 200ms',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (textValue.trim())
                                                    e.currentTarget.style.color = '#F1F5F9';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'rgba(129,140,248,0.7)';
                                            }}
                                        >
                                            → 次へ
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
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

// 選択・ホバー・クリックの3段階でビジュアルフィードバックを提供するタグボタン
function TagButton({
    label,
    onClick,
    disabled,
}: {
    label: string;
    onClick: () => void;
    disabled: boolean;
}) {
    const [selected, setSelected] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
        if (disabled) return;
        setSelected(true);
        setClicked(true);
        // 350ms でクリック発光を消去し、600ms 後に親の次ステップ処理を呼ぶ
        setTimeout(() => setClicked(false), 350);
        setTimeout(onClick, 600);
    };

    const boxShadow = clicked
        ? '0 0 22px rgba(79,110,247,0.75), inset 0 0 8px rgba(79,110,247,0.15)'
        : selected
            ? '0 0 14px rgba(79,110,247,0.45)'
            : hovered
                ? '0 0 12px rgba(79,110,247,0.3)'
                : 'none';

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: selected
                    ? '1px solid rgba(79,110,247,0.7)'
                    : hovered
                        ? '1px solid rgba(79,110,247,0.45)'
                        : '1px solid rgba(79,110,247,0.25)',
                background: selected
                    ? 'rgba(79,110,247,0.2)'
                    : hovered
                        ? 'rgba(79,110,247,0.1)'
                        : 'rgba(79,110,247,0.06)',
                color: selected || hovered ? '#F1F5F9' : 'rgba(129,140,248,0.8)',
                padding: '10px 20px',
                borderRadius: 2,
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: 13,
                margin: 6,
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all 200ms ease-out',
                boxShadow,
            }}
        >
            {label}
        </button>
    );
}
