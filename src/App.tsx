// src/App.tsx
import { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import UserLayout from "./components/layout/UserLayout";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminRoute from "./components/layout/AdminRoute";

import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import TestPlayground from "./pages/TestPlayground";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ────────────────────────────────────────
            인증 페이지 — 자체 레이아웃 사용
        ──────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* ────────────────────────────────────────
            사용자 영역 — UserLayout
        ──────────────────────────────────────── */}
        <Route element={<UserLayout />}>
          {/* 공개 페이지 (로그인 불필요) */}
          {/* <Route path="/" element={<div>공연 목록(메인 화면)</div>} /> */}
          <Route path="/" element={<TestPlayground />} />
          <Route path="/concerts/:id" element={<div>공연 상세</div>} />

          {/* 회원 전용 페이지 — ProtectedRoute로 보호 */}
          <Route element={<ProtectedRoute />}>
            {/* 좌석 선택부터 예매 플로우 전체 보호 */}
            <Route path="/concerts/:id/seats" element={<div>좌석 선택</div>} />

            {/* 결제 */}
            <Route path="/payment/confirm" element={<div>예약 확인</div>} />
            <Route path="/payment" element={<div>결제</div>} />
            <Route path="/payment/success" element={<div>결제 완료</div>} />
            <Route path="/payment/fail" element={<div>결제 실패</div>} />

            {/* 예매 내역 */}
            <Route
              path="/reservations/mypage"
              element={<div>예매 내역(회원)</div>}
            />
            <Route
              path="/reservations/tickets/:id"
              element={<div>티켓 상세</div>}
            />
          </Route>
        </Route>

        {/* ────────────────────────────────────────
            관리자 영역 — AdminRoute + AdminLayout
        ──────────────────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen bg-[#0F172A] text-white">
                    로딩 중...
                  </div>
                }
              >
                <AdminLayout />
              </Suspense>
            }
          >
            <Route
              path="/admin"
              element={<div>관리자 대시보드(메인 화면)</div>}
            />
            <Route
              path="/admin/reservations"
              element={<div>예매 내역 확인</div>}
            />
            <Route
              path="/admin/monitoring"
              element={<div>좌석 현황 실시간 모니터링(목록)</div>}
            />
            <Route
              path="/admin/monitoring/:id"
              element={<div>좌석 현황 실시간 모니터링(좌석맵)</div>}
            />
            <Route
              path="/admin/concerts/register"
              element={<div>공연 등록</div>}
            />
            <Route
              path="/admin/concerts/register/character"
              element={<div>3D 캐릭터 제작소</div>}
            />
            <Route path="/admin/refunds" element={<div>환불 내역 관리</div>} />
          </Route>
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#f8f9fa]">
              <h1 className="font-pretendard text-2xl font-bold text-text">
                페이지를 찾을 수 없습니다
              </h1>
              <a
                href="/"
                className="font-pretendard text-base text-primary underline"
              >
                홈으로 돌아가기
              </a>
            </div>
          }
        />
      </Routes>

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
