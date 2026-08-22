// components/layout/AdminLayout.tsx
import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Activity,
  PlusSquare,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import useAuthStore from "../../stores/global/authStore";

const navItems = [
  { to: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "예매 내역", icon: Ticket },
  { to: "/admin/seat-monitoring", label: "좌석 모니터링", icon: Activity },
  { to: "/admin/concerts/new", label: "공연 등록", icon: PlusSquare },
  { to: "/admin/refunds", label: "환불 관리", icon: RotateCcw },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  useEffect(() => {
    document.body.classList.add("admin-layout");
    return () => document.body.classList.remove("admin-layout");
  }, []);

  return (
    <div className="min-h-screen flex bg-admin-bg text-admin-text">
      {/* 사이드바 — self-start로 stretch를 막아 sticky가 화면 높이를 유지 */}
      <aside
        className="w-64 shrink-0 sticky top-0 self-start h-screen overflow-y-auto
          bg-admin-card border-r border-admin-border flex flex-col"
      >
        {/* 로고 */}
        <div className="px-6 py-5 border-b border-admin-border">
          <p className="font-pretendard text-xs text-admin-text-secondary tracking-wider">
            ADMIN MODE
          </p>
          <p className="font-pretendard text-lg font-bold mt-1">TicketRush</p>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "font-pretendard text-sm transition-colors",
                isActive(to, exact)
                  ? "bg-primary text-white"
                  : "text-admin-text-secondary hover:bg-admin-border hover:text-admin-text",
              ].join(" ")}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* 하단 — 사용자 정보 + 사용자 모드로 */}
        <div className="px-3 py-4 border-t border-admin-border">
          {user && (
            <div className="px-3 py-2 mb-2">
              <p className="font-pretendard text-xs text-admin-text-secondary">
                로그인됨
              </p>
              <p className="font-pretendard text-sm font-medium truncate">
                {user.name}
              </p>
            </div>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              font-pretendard text-sm text-admin-text-secondary
              hover:bg-admin-border hover:text-admin-text transition-colors"
          >
            <ArrowLeft size={18} />
            사용자 모드로
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
