import logo from "@/assets/images/logo.svg";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* 왼쪽: 링크 + 카피라이트 */}
          <div className="font-pretendard text-xs text-text-secondary space-y-1">
            <p>
              TicketRush ·{" "}
              <a
                href="https://github.com/your-org/ticketrush"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                GitHub
              </a>{" "}
              ·{" "}
              <a href="/api-docs" className="hover:text-primary">
                API Docs
              </a>
            </p>
            <p>
              Copyright © 2026 TicketRush. All issues discussed via GitHub
              Discussions.
            </p>
          </div>

          {/* 가운데: 로고 */}
          <div className="flex justify-center">
            <span className="font-pretendard text-2xl font-bold text-text">
              <img src={logo} alt="TicketRush" className="h-8 w-auto" />
            </span>
            {/* 손글씨 스타일 폰트 적용하려면 아래 "💡 손글씨 로고" 참고 */}
          </div>

          {/* 오른쪽: 정책 링크 */}
          <div className="flex justify-end gap-6 font-pretendard text-xs text-text-secondary">
            <a
              href="https://orange-split-b03.notion.site/TicketRush-35fbd63b04d5802cb228d07f783fd720?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              개인정보처리방침
            </a>
            <a
              href="https://orange-split-b03.notion.site/TicketRush-35fbd63b04d580eab531c4f5cf6c2fb1?source=copy_link"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              이용약관
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
