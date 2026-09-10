import { toast } from "@/utils/toast";

function copyWithTextarea(bookingNumber: string) {
  const el = document.createElement("textarea");
  el.value = bookingNumber;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  if (!ok) throw new Error("copy failed");
}

export async function copyBookingNumber(bookingNumber: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(bookingNumber);
    } else {
      copyWithTextarea(bookingNumber);
    }
    toast.success("예매 번호가 복사되었습니다.");
  } catch {
    try {
      copyWithTextarea(bookingNumber);
      toast.success("예매 번호가 복사되었습니다.");
    } catch {
      toast.error("예매 번호 복사에 실패했습니다.");
    }
  }
}
