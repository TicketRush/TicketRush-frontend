import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { PendingResumeBanner } from "@/components/booking/PendingResumeBanner";
import { useBlockPaymentInFlightLeave } from "@/hooks/booking/useBlockPaymentInFlightLeave";
import { usePendingResume } from "@/hooks/booking/usePendingResume";

export default function UserLayout() {
  const resume = usePendingResume();
  useBlockPaymentInFlightLeave();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Header />
      {resume.visible ? (
        <PendingResumeBanner
          title={resume.title}
          remainingLabel={resume.remainingLabel}
          cancelPending={resume.cancelPending}
          onResume={resume.onResume}
          onCancel={() => void resume.onCancel()}
        />
      ) : null}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
