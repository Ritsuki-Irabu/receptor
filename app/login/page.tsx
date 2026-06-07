'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#050810',
            }}
        >
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        fontFamily: 'var(--font-serif), serif',
                        fontSize: 14,
                        letterSpacing: '0.15em',
                        color: 'rgba(241,245,249,0.4)',
                        marginBottom: 48,
                    }}
                >
                    Receptor
                </div>
                <button
                    onClick={() => signIn('google', { callbackUrl: '/' })}
                    style={{
                        border: '1px solid rgba(79,110,247,0.4)',
                        background: 'rgba(79,110,247,0.08)',
                        color: 'rgba(129,140,248,0.9)',
                        padding: '14px 36px',
                        borderRadius: 2,
                        fontFamily: 'var(--font-sans), sans-serif',
                        fontSize: 13,
                        letterSpacing: '0.12em',
                        cursor: 'pointer',
                    }}
                >
                    Google でサインイン
                </button>
            </div>
        </main>
    );
}
