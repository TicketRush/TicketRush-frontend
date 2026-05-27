// 페이지 제목 설정 hook
// 사용법:
//   useDocumentTitle("좌석 선택");
//   → 브라우저 탭에 "좌석 선택 | TicketRush" 표시
//
// 마이그레이션 도움말:
//   각 페이지 최상단에서 호출 → 페이지마다 의미 있는 제목 자동 설정

import { useEffect } from "react";

const APP_NAME = "TicketRush";

/**
 * @param title 페이지 제목 (앱 이름은 자동으로 붙음)
 * @param options.exact true면 앱 이름 안 붙임 (랜딩 페이지 등)
 */
export function useDocumentTitle(
  title: string,
  options: { exact?: boolean } = {},
) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = options.exact ? title : `${title} | ${APP_NAME}`;

    // 컴포넌트 unmount 시 원래대로 복원
    return () => {
      document.title = prevTitle;
    };
  }, [title, options.exact]);
}

export default useDocumentTitle;
