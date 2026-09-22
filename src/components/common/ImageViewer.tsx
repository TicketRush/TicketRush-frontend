import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FocusTrap } from "focus-trap-react";
import { ImageOff, X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/common/useBodyScrollLock";

interface Props {
  open: boolean;
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export default function ImageViewer({ open, imageUrl, alt, onClose }: Props) {
  const visible = open && Boolean(imageUrl.trim());
  const closeButton = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(visible);
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;
  return createPortal(
    <FocusTrap focusTrapOptions={{
      initialFocus: () => closeButton.current!,
      returnFocusOnDeactivate: true,
      preventScroll: true,
      escapeDeactivates: false,
      clickOutsideDeactivates: false,
    }}>
      <div role="dialog" aria-modal="true" aria-label="이미지 전체보기"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 pt-20 pb-6 overscroll-contain"
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <button ref={closeButton} type="button" onClick={onClose}
          aria-label="이미지 전체보기 닫기"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <X size={24} aria-hidden />
        </button>
        <ViewerImage key={imageUrl} imageUrl={imageUrl} alt={alt} />
      </div>
    </FocusTrap>,
    document.body,
  );
}

function ViewerImage({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div role="status" className="flex flex-col items-center gap-3 text-white">
      <ImageOff size={40} aria-hidden />
      <p>이미지를 불러올 수 없습니다.</p>
    </div>
  ) : (
    <img src={imageUrl} alt={alt} onError={() => setFailed(true)}
      className="block max-w-full max-h-[calc(100dvh-7rem)] object-contain" />
  );
}
