"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/logs", label: "思考ログ" },
  { href: "/portfolio", label: "ポートフォリオ" },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "200px",
        minHeight: "calc(100vh - 60px)",
        backgroundColor: "#f9fafb",
        borderRight: "1px solid #e5e7eb",
        padding: "24px 0",
      }}
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              style={{
                display: "block",
                padding: "10px 24px",
                fontSize: "14px",
                color: pathname === href ? "#111827" : "#6b7280",
                backgroundColor: pathname === href ? "#e5e7eb" : "transparent",
                textDecoration: "none",
                fontWeight: pathname === href ? "600" : "400",
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
