import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../../stores/global/authStore";

// 인증이 필요한 라우트를 보호하는 가드 컴포넌트
//
// - accessToken이 없으면 /login으로 리다이렉트
// - 현재 URL을 state.from에 저장 → 로그인 후 원래 위치로 복귀
//
// 사용 예:
//   <Route element={<ProtectedRoute />}>
//     <Route path="/reservations/mypage" element={<MyBookings />} />
//   </Route>

export default function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
