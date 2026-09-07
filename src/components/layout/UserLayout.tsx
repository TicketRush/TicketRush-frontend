import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useBlockPaymentInFlightLeave } from "@/hooks/booking/useBlockPaymentInFlightLeave";
import { useCancelPendingIfLeftFlow } from "@/hooks/booking/useCancelPendingIfLeftFlow";

export default function UserLayout() {
  useCancelPendingIfLeftFlow();
  useBlockPaymentInFlightLeave();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
