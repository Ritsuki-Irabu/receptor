"use client";

import { signOut, useSession } from "next-auth/react";

const Nav = () => {
  const { data: session } = useSession();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: "60px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <span style={{ fontWeight: "bold", fontSize: "18px" }}>Receptor</span>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>
          {session?.user?.name ?? ""}
        </span>
        <button
          onClick={() => signOut()}
          style={{
            padding: "6px 14px",
            fontSize: "14px",
            backgroundColor: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
};

export default Nav;
