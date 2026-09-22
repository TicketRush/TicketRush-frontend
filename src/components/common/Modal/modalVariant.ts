/**
 * 모달은 document.body로 포탈된다.
 * 관리자 레이아웃의 text-admin-text, 사용자 레이아웃의 text-text를 상속하지 않으므로
 * 패널과 푸터에 글자색을 직접 둔다 (#343).
 * 푸터 버튼은 자기 색이 없으면 이 색을 상속한다. text-white 같은 명시 색은 그대로다.
 */
export const modalVariantStyles = {
  default: {
    panel: "bg-white shadow-xl text-text",
    header: "border-border",
    title: "text-text",
    close: "text-text-secondary hover:text-text",
    closeLocked: "text-text-disabled cursor-not-allowed",
    body: "text-text",
    footer: "border-border bg-secondary text-text",
  },
  admin: {
    panel: "bg-admin-card border border-admin-border shadow-xl text-admin-text",
    header: "border-admin-border",
    title: "text-admin-text",
    close: "text-admin-text-secondary hover:text-admin-text",
    closeLocked: "text-admin-text-secondary/50 cursor-not-allowed",
    body: "text-admin-text",
    footer: "border-admin-border bg-admin-bg text-admin-text",
  },
};
