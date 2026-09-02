import logo from "@/assets/images/logo.svg";
import { LEGAL_LINKS } from "@/constants/legalLinks";

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
                href="https://github.com/TicketRush"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                GitHub
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
              href={LEGAL_LINKS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              개인정보처리방침
            </a>
            <a
              href={LEGAL_LINKS.terms}
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
