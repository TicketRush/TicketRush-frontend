import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/global/authStore";
import Button from "../common/Button/Button";
import logo from "@/assets/images/logo.svg";

export default function Header() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const isLoggedIn = !!accessToken;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <img src={logo} alt="TicketRush" className="h-8 w-auto" />
        </Link>

        {/* 메뉴 */}
        <nav className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link to="/reservations/mypage">
                <Button variant="secondary" size="sm">
                  내 예매
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm">
                로그인
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
