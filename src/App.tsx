// src/App.tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
import PaymentSuccessPage from "./pages/Payment/PaymentSuccessPage";
import PaymentCompletePage from "./pages/Payment/PaymentCompletePage";
import PaymentFailedPage from "./pages/Payment/PaymentFailedPage";
import ReservationExpiredPage from "./pages/Payment/ReservationExpiredPage";

import MyBookingsPage from "@/pages/MyPage/MyBookingsPage";
import TicketDetailPage from "@/pages/MyPage/TicketDetailPage";

import ErrorBoundary from "@/components/common/ErrorBoundary/ErrorBoundary";
import NotFoundPage from "@/pages/Error/NotFoundPage";
import AdminDashboardPage from "@/pages/Admin/AdminDashboardPage";
import AdminBookingsPage from "@/pages/Admin/AdminBookingsPage";
import AdminRefundsPage from "@/pages/Admin/AdminRefundsPage";
import AdminSeatMonitoringPage from "@/pages/Admin/AdminSeatMonitoringPage";
import AdminConcertFormPage from "@/pages/Admin/AdminConcertFormPage";
import AdminCharacterCreatorPage from "@/pages/Admin/AdminCharacterCreatorPage";
import DevNavPage from "@/pages/Dev/DevNavPage";

import OAuthCallbackPage from "./pages/Auth/OAuthCallbackPage";

/** useBlocker는 data router가 필요하다. BrowserRouter로는 결제 이탈 가드가 깨진다. */
const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/dev", element: <DevNavPage /> },
  { path: "/oauth/callback/:provider", element: <OAuthCallbackPage /> },
  {
    element: <UserLayout />,
    children: [
      { path: "/", element: <ConcertListPage /> },
      { path: "/concerts", element: <ConcertListPage /> },
      { path: "/concerts/:id", element: <ConcertDetailPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/concerts/:id/seats", element: <SeatSelectionPage /> },
          {
            path: "/concerts/:id/payment/confirm",
            element: <ReservationConfirmPage />,
          },
          { path: "/concerts/:id/payment", element: <PaymentPage /> },
          {
            path: "/concerts/:id/payment/success",
            element: <PaymentSuccessPage />,
          },
          {
            path: "/concerts/:id/payment/expired",
            element: <ReservationExpiredPage />,
          },
          {
            path: "/concerts/:id/payment/failed",
            element: <PaymentFailedPage />,
          },
          { path: "/reservations/mypage", element: <MyBookingsPage /> },
          {
            path: "/reservations/mypage/:bookingNumber",
            element: <TicketDetailPage />,
          },
          {
            path: "/reservations/:reservationId",
            element: <PaymentCompletePage />,
          },
        ],
      },
    ],
  },
  {
    element: <AdminRoute />,
    children: [
      {
        path: "/admin/character-creator",
        element: <AdminCharacterCreatorPage />,
      },
      {
        element: <AdminLayout />,
        children: [
          { path: "/admin", element: <AdminDashboardPage /> },
          { path: "/admin/bookings", element: <AdminBookingsPage /> },
          { path: "/admin/refunds", element: <AdminRefundsPage /> },
          {
            path: "/admin/seat-monitoring",
            element: <AdminSeatMonitoringPage />,
          },
          {
            path: "/admin/concerts/new",
            element: <AdminConcertFormPage mode="create" />,
          },
          {
            path: "/admin/concerts/:id/edit",
            element: <AdminConcertFormPage mode="edit" />,
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        style={{ zIndex: 9999 }}
      />
    </ErrorBoundary>
  );
}

export default App;
