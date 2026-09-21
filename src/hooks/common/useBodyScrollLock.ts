import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/dom/bodyScrollLock";

/** 모달·오버레이가 열려 있는 동안 배경 스크롤을 잠근다. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
