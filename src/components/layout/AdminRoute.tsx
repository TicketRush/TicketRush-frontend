import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../../stores/global/authStore";

// 관리자만 접근 가능한 라우트를 보호하는 가드 컴포넌트

// - 비로그인 → /login (원래 URL을 state로 전달)
// - 로그인했지만 관리자가 아님 → / (홈)

// 사용 예:
//   <Route element={<AdminRoute />}>
//     <Route element={<AdminLayout />}>
//       <Route path="/admin" element={<Dashboard />} />
//     </Route>
//   </Route>

export default function AdminRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // 비로그인
  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 관리자 권한 없음
  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
