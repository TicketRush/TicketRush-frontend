// src/pages/TestPlayground.tsx
//
// 🧪 임시 테스트 페이지 — 공통 컴포넌트들이 잘 동작하는지 확인용
//
// 사용법:
// 1. App.tsx의 <Route path="/" element={<div>공연 목록...</div>} /> 를
//    <Route path="/" element={<TestPlayground />} /> 로 임시 교체
// 2. 브라우저에서 / 접속해서 각 버튼 눌러보기
// 3. 테스트 끝나면 원래 라우트로 되돌리고 이 파일 삭제

import { useState } from "react";
import { toast } from "../utils/toast";
import Button from "../components/common/Button/Button";
import Input from "../components/common/Input/Input";
import Modal from "../components/common/Modal/Modal";
import Badge from "../components/common/Badge/Badge";
import Skeleton from "../components/common/Skeleton/Skeleton";

export default function TestPlayground() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-pretendard text-3xl font-bold text-text mb-2">
        🧪 컴포넌트 테스트 페이지
      </h1>
      <p className="font-pretendard text-base text-text-secondary mb-10">
        각 버튼을 눌러서 컴포넌트가 잘 동작하는지 확인해보세요
      </p>

      {/* ───────────── Toast 테스트 ───────────── */}
      <section className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          1. Toast (Feat #3)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-4">
          ✅ 클릭하면 우측 하단에 알림이 떠야 함 / 3초 후 자동으로 사라져야 함
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => toast.success("성공 메시지입니다!")}
          >
            success
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => toast.error("에러 메시지입니다!")}
          >
            error
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => toast.warning("경고 메시지입니다!")}
          >
            warning
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => toast.info("정보 메시지입니다!")}
          >
            info
          </Button>
        </div>
      </section>

      {/* ───────────── Modal 테스트 ───────────── */}
      <section className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          2. Modal (Feat #2)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-4">
          ✅ 모달 열고 닫기 (X / ESC / 바깥 클릭) / Tab 키가 모달 안에서만 순환
          / 배경 스크롤 잠금
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
        >
          모달 열기
        </Button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="테스트 모달"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("모달 + Toast 연동 확인!");
                  setIsModalOpen(false);
                }}
              >
                확인
              </Button>
            </>
          }
        >
          <p>이것은 테스트 모달의 본문입니다.</p>
          <p className="mt-2 text-sm text-text-secondary">
            ESC 키를 눌러보세요. Tab 키를 눌러서 포커스가 모달 안에서만
            순환하는지 확인하세요.
          </p>
        </Modal>
      </section>

      {/* ───────────── Badge 테스트 ───────────── */}
      <section className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          3. Badge (Feat #4)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-4">
          ✅ 각 상태별로 다른 색상이 표시되어야 함
        </p>

        <div className="space-y-3">
          {/* 기본 사용 (status 자동 텍스트) */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              기본 (status 자동 텍스트)
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge status="예매완료" />
              <Badge status="결제중" />
              <Badge status="취소" />
              <Badge status="환불" />
              <Badge status="예매불가" />
              <Badge status="예매가능" />
            </div>
          </div>

          {/* size 옵션 */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              size 옵션
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge status="예매완료" size="sm" />
              <Badge status="예매완료" size="md" />
            </div>
          </div>

          {/* children으로 텍스트 오버라이드 */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              children으로 오버라이드
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge status="환불">환불 신청 완료</Badge>
              <Badge status="예매완료">3건</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Skeleton 테스트 ───────────── */}
      <section className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          4. Skeleton (Feat #4)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-4">
          ✅ 회색 영역이 부드럽게 깜빡여야 함 (animate-pulse)
        </p>

        <div className="space-y-6">
          {/* text variant — 기본 */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              text variant (기본 height: 1rem)
            </p>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" className="mt-2" />
            <Skeleton variant="text" width="40%" className="mt-2" />
          </div>

          {/* image variant */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              image variant (가로 200, 세로 150)
            </p>
            <Skeleton variant="image" width={200} height={150} />
          </div>

          {/* circle variant */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              circle variant (기본 40×40, 아바타용)
            </p>
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" />
              <Skeleton variant="circle" width={60} height={60} />
              <Skeleton variant="circle" width={80} height={80} />
            </div>
          </div>

          {/* 조합 예시 — 프로필 카드 */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              조합 예시 (아바타 + 이름 + 설명)
            </p>
            <div className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <Skeleton variant="circle" width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="70%" />
              </div>
            </div>
          </div>

          {/* 가짜 로딩 토글 */}
          <div>
            <p className="font-pretendard text-xs text-text-secondary mb-2">
              실제 사용 예시 (버튼 누르면 로딩 ↔ 결과 전환)
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsLoading((p) => !p)}
            >
              로딩 토글
            </Button>
            <div className="mt-3">
              {isLoading ? (
                <div role="status" aria-live="polite" className="space-y-2">
                  <span className="sr-only">데이터 로딩 중</span>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </div>
              ) : (
                <p className="font-pretendard text-base text-text">
                  ✨ 로딩 완료! 진짜 데이터가 여기 표시됨
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Button & Input 테스트 ───────────── */}
      <section className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          5. Button & Input (Feat #1)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-4">
          ✅ 모든 variant/size가 정상 표시 / loading 상태 / disabled 상태
        </p>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm">
              primary sm
            </Button>
            <Button variant="primary" size="md">
              primary md
            </Button>
            <Button variant="primary" size="lg">
              primary lg
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary">secondary</Button>
            <Button variant="danger">danger</Button>
            <Button variant="kakao">kakao</Button>
            <Button variant="naver">naver</Button>
            <Button variant="google">google</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading>
              로딩 중
            </Button>
            <Button variant="primary" disabled>
              비활성화
            </Button>
          </div>

          <div className="max-w-md space-y-3">
            <Input label="일반 입력" placeholder="아무거나 입력" />
            <Input
              label="에러 상태"
              placeholder="에러 표시 확인"
              error="에러 메시지가 빨간색으로 보여야 함"
            />
            <Input
              label="비밀번호 (눈 토글 확인)"
              type="password"
              placeholder="비밀번호 입력"
            />
          </div>
        </div>
      </section>

      {/* ───────────── Layout 안내 ───────────── */}
      <section className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mb-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          6. Layout (Feat #5)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-2">
          ✅ 페이지 위에 Header가 보여야 함 (TicketRush 로고 + 로그인/내 예매
          버튼)
        </p>
        <p className="font-pretendard text-sm text-text-secondary mb-2">
          ✅ 페이지 아래에 Footer가 보여야 함
        </p>
        <p className="font-pretendard text-sm text-text-secondary">
          ✅ /admin 경로로 직접 이동해보면 다크 테마 + 사이드바가 보여야 함
        </p>
      </section>

      {/* ───────────── ProtectedRoute 안내 ───────────── */}
      <section className="bg-purple-50 rounded-2xl border border-purple-200 p-6">
        <h2 className="font-pretendard text-xl font-bold text-text mb-4">
          7. ProtectedRoute (Feat #8)
        </h2>
        <p className="font-pretendard text-sm text-text-secondary mb-2">
          ✅ 비로그인 상태에서 아래 URL 접근 시 /login으로 자동 이동
        </p>
        <ul className="list-disc list-inside text-sm text-text-secondary space-y-1 mb-3">
          <li>/concerts/abc/seats</li>
          <li>/payment</li>
          <li>/reservations/mypage</li>
          <li>/admin</li>
        </ul>
        <p className="font-pretendard text-sm text-text-secondary">
          ✅ 로그인 후 원래 가려던 페이지로 자동 복귀
        </p>
      </section>
    </div>
  );
}
