// src/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import UserLayout from "./components/layout/UserLayout";
const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));

import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";

// ⚡ 관리자 페이지는 lazy import로 코드 분할
//    (사용자 번들에 포함되지 않음 → 초기 로딩 최적화)
//
// 페이지가 아직 구현되지 않았으므로 임시 placeholder를 사용.
// 실제 페이지가 만들어지면 아래 처럼 교체:
//   const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ────────────────────────────────────────
            인증 페이지 — 자체 레이아웃 사용 (Header/Footer 없음)
        ──────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* ────────────────────────────────────────
            사용자 영역 — UserLayout (Header + Footer)
        ──────────────────────────────────────── */}
        <Route element={<UserLayout />}>
          {/* 메인 */}
          <Route path="/" element={<div>공연 목록(메인 화면)</div>} />

          {/* 공연 */}
          <Route path="/concerts/:id" element={<div>공연 상세</div>} />
          <Route path="/concerts/:id/seats" element={<div>좌석 선택</div>} />

          {/* 결제 */}
          <Route path="/payment" element={<div>결제</div>} />
          <Route path="/payment/confirm" element={<div>예약 확인</div>} />
          <Route path="/payment/success" element={<div>결제 완료</div>} />
          <Route path="/payment/fail" element={<div>결제 실패</div>} />

          {/* 예매 내역 — 회원 전용 (Feat #8 ProtectedRoute에서 보호 예정) */}
          <Route
            path="/reservations/mypage"
            element={<div>예매 내역(회원)</div>}
          />
          <Route
            path="/reservations/tickets/:id"
            element={<div>티켓 상세</div>}
          />
        </Route>

        {/* ────────────────────────────────────────
            관리자 영역 
        ──────────────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-screen bg-[#0F172A] text-white">
                  관리자 페이지 로딩 중...
                </div>
              }
            >
              <AdminLayout />
            </Suspense>
          }
        >
          <Route index element={<div>관리자 대시보드(메인 화면)</div>} />
          <Route path="reservations" element={<div>예매 내역 확인</div>} />
          <Route
            path="monitoring"
            element={<div>좌석 현황 실시간 모니터링(목록)</div>}
          />
          <Route
            path="monitoring/:id"
            element={<div>좌석 현황 실시간 모니터링 상세(좌석맵)</div>}
          />
          <Route path="concerts/register" element={<div>공연 등록</div>} />
          <Route
            path="concerts/register/character"
            element={<div>3D 캐릭터 제작소</div>}
          />
          <Route path="refunds" element={<div>환불 관리</div>} />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#f8f9fa]">
              <h1 className="font-pretendard text-2xl font-bold text-text">
                페이지를 찾을 수 없습니다
              </h1>
              <Link to="/" className="text-primary underline">
                홈으로 돌아가기
              </Link>
            </div>
          }
        />
      </Routes>

      {/* 글로벌 토스트 컨테이너 */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
    </BrowserRouter>
  );
}

export default App;
