// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import UserLayout from "./components/layout/UserLayout";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AdminRoute from "./components/layout/AdminRoute";

import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";

import ConcertListPage from "./pages/Concert/ConcertListPage";
import ConcertDetailPage from "./pages/Concert/ConcertDetailPage";

import SeatSelectionPage from "./pages/Booking/SeatSelectionPage";
import ReservationConfirmPage from "./pages/Booking/ReservationConfirmPage";

import PaymentPage from "./pages/Payment/PaymentPage";
import PaymentCompletePage from "./pages/Payment/PaymentCompletePage";
import PaymentFailedPage from "./pages/Payment/PaymentFailedPage";
import ReservationExpiredPage from "./pages/Payment/ReservationExpiredPage";

import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
import NotFoundPage from "@/pages/Error/NotFoundPage";
import AdminDashboardPage from "@/pages/Admin/AdminDashboardPage";
import AdminBookingsPage from "@/pages/Admin/AdminBookingsPage";
import AdminRefundsPage from "@/pages/Admin/AdminRefundsPage";
import AdminSeatMonitoringPage from "@/pages/Admin/AdminSeatMonitoringPage";
import AdminConcertFormPage from "@/pages/Admin/AdminConcertFormPage";
import DevNavPage from "@/pages/Dev/DevNavPage";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* ────────────────────────────────────────
            인증 페이지 — 자체 레이아웃 사용
          ──────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dev" element={<DevNavPage />} />

          {/* ────────────────────────────────────────
            사용자 영역 — UserLayout
          ──────────────────────────────────────── */}
          <Route element={<UserLayout />}>
            {/* 공개 페이지 */}
            <Route path="/" element={<ConcertListPage />} />
            <Route path="/concerts" element={<ConcertListPage />} />
            <Route path="/concerts/:id" element={<ConcertDetailPage />} />

            {/* 회원 전용 */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/concerts/:id/seats"
                element={<SeatSelectionPage />}
              />
              <Route
                path="/concerts/:id/payment/confirm"
                element={<ReservationConfirmPage />}
              />
              <Route path="/concerts/:id/payment" element={<PaymentPage />} />
              <Route
                path="/concerts/:id/payment/expired"
                element={<ReservationExpiredPage />}
              />
              <Route
                path="/concerts/:id/payment/failed"
                element={<PaymentFailedPage />}
              />

              {/* 결제 완료 후 */}
              <Route
                path="/reservations/:reservationId"
                element={<PaymentCompletePage />}
              />

              {/* 마이페이지 / 티켓 */}
              <Route
                path="/reservations/mypage"
                element={<div>예매 내역</div>}
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
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
              <Route path="/admin/refunds" element={<AdminRefundsPage />} />
              <Route
                path="/admin/seat-monitoring"
                element={<AdminSeatMonitoringPage />}
              />
              <Route
                path="/admin/concerts/new"
                element={<AdminConcertFormPage mode="create" />}
              />
              <Route
                path="/admin/concerts/:id/edit"
                element={<AdminConcertFormPage mode="edit" />}
              />
            </Route>
          </Route>

          {/* 404 — 가장 마지막 */}
          <Route path="*" element={<NotFoundPage />} />
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
    </ErrorBoundary>
  );
}

export default App;
