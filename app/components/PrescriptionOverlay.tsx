'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface NodeProp {
  id: string;
  label: string;
  type: 'rigid' | 'flexible';
  description: string;
}

interface Props {
  node: NodeProp | null;
  onClose: () => void;
  onSaveReminder: (text: string) => void;
}

const PRESCRIPTIONS: Record<string, { insight: string; action: string; reminder: string }> = {
  n1: {
    insight: '完璧主義は、過去に「完璧でなければ価値がない」と学んだ体験から来ていることが多いです。',
    action: '明日、意図的に70点の成果物を1つ提出してみてください。完璧でなくても前進できることを体で学びましょう。',
    reminder: '70点でも前に進む。完璧は後からついてくる。',
  },
  n2: {
    insight: '他者の評価への敏感さは、あなたが関係性を大切にしている証拠でもあります。',
    action: '次の会議で、相手の発言後に必ず3秒待ってから話し始めてください。その3秒で何を感じるか観察してみましょう。',
    reminder: '相手の言葉を、3秒受け取ってから話す。',
  },
  n5: {
    insight: '今日の焦りは、複数の未解決の期待値がぶつかって生まれていました。',
    action: '今夜、今日のザラつきを一言で書いてみてください。書くことで、感情と事実を分離できます。',
    reminder: 'ザラつきを書く。感情と事実を分ける。',
  },
  default: {
    insight: 'あなたの思考には、まだ気づかれていない豊かさがあります。',
    action: '今日一つだけ、自分が「よかった」と思えた瞬間を探してみてください。',
    reminder: '今日の「よかった」を一つ見つける。',
  },
};

export default function PrescriptionOverlay({ node, onClose, onSaveReminder }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!node) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [node]);

  if (!node) return null;

  const prescription = PRESCRIPTIONS[node.id] ?? PRESCRIPTIONS.default;
  const isRigid = node.type === 'rigid';

  const handleSave = () => {
    onSaveReminder(prescription.reminder);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5,8,16,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
        }}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#111827',
          borderTop: '1px solid rgba(79,110,247,0.2)',
          borderRadius: '16px 16px 0 0',
          padding: `32px 24px calc(48px + env(safe-area-inset-bottom, 0px))`,
          maxHeight: '70vh',
          overflowY: 'auto',
          zIndex: 51,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'rgba(100,116,139,0.3)',
            borderRadius: 2,
            margin: '0 auto 24px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span
            style={{
              fontFamily: 'var(--font-serif), serif',
              fontSize: 18,
              color: '#F1F5F9',
            }}
          >
            {node.label}
          </span>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 2,
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 10,
              letterSpacing: '0.1em',
              background: isRigid ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
              color: isRigid ? 'rgba(239,68,68,0.8)' : 'rgba(59,130,246,0.8)',
              border: isRigid ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(59,130,246,0.2)',
            }}
          >
            {isRigid ? '硬直領域' : '柔軟領域'}
          </span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#64748B',
              marginBottom: 10,
            }}
          >
            AIの読み解き
          </div>
          <div style={{ display: 'flex', gap: 0 }}>
            <div
              style={{
                width: 2,
                background: 'rgba(79,110,247,0.3)',
                flexShrink: 0,
                marginRight: 12,
                borderRadius: 1,
              }}
            />
            <p
              style={{
                fontFamily: 'var(--font-serif), serif',
                fontSize: 14,
                lineHeight: 1.9,
                color: 'rgba(241,245,249,0.6)',
                margin: 0,
              }}
            >
              {prescription.insight}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#64748B',
              marginBottom: 10,
            }}
          >
            明日の処方箋
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif), serif',
              fontSize: 15,
              lineHeight: 1.9,
              color: 'rgba(241,245,249,0.85)',
              margin: 0,
            }}
          >
            {prescription.action}
          </p>
        </div>

        <button
          onClick={handleSave}
          style={{
            width: '100%',
            background: 'rgba(79,110,247,0.12)',
            border: '1px solid rgba(79,110,247,0.35)',
            color: 'rgba(129,140,248,0.9)',
            padding: 16,
            borderRadius: 2,
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: 13,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            transition: 'all 300ms ease-out',
            marginBottom: 16,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(79,110,247,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(79,110,247,0.12)'; }}
        >
          {saved ? '✓ 設定しました' : '明日のリマインドに設定'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(100,116,139,0.5)',
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'color 200ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(100,116,139,0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(100,116,139,0.5)')}
          >
            ← Mind Mapに戻る
          </button>
        </div>
      </motion.div>
    </>
  );
}
