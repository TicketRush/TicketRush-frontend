// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CharacterCustomizePage from "./pages/CharacterCustomizePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 인증 */}
        <Route path="/login" element={<div>로그인</div>} />
        <Route path="/register" element={<div>회원가입</div>} />
        <Route path="/guest-verify" element={<div>비회원 예매 인증</div>} />

        {/* 공연 */}
        <Route path="/" element={<div>공연 목록(메인 화면)</div>} />
        <Route path="/concerts/:id" element={<div>공연 상세</div>} />
        <Route path="/concerts/:id/seats" element={<div>좌석 선택</div>} />

        {/* 결제 */}
        <Route path="/payment/confirm" element={<div>예약 확인</div>} />
        <Route path="/payment" element={<div>결제</div>} />
        <Route path="/payment/success" element={<div>결제 완료</div>} />
        <Route path="/payment/fail" element={<div>결제 실패</div>} />

        {/* 예매 내역 조회 */}
        <Route path="/reservations" element={<div>내 예매 조회</div>} />
        <Route
          path="/reservations/mypage"
          element={<div>예매 내역(회원)</div>}
        />
        <Route
          path="/reservations/guest"
          element={<div>비회원 예매 조회</div>}
        />
        <Route
          path="/reservations/tickets/:id"
          element={<div>티켓 상세</div>}
        />

        {/* 관리자 */}
        <Route path="/admin" element={<div>관리자 대시보드(메인 화면)</div>} />
        <Route path="/admin/reservations" element={<div>예매 내역 확인</div>} />
        <Route
          path="/admin/monitoring"
          element={<div>좌석 현황 실시간 모니터링(목록)</div>}
        />
        <Route
          path="/admin/monitoring/:id"
          element={<div>좌석 현황 실시간 모니터링(좌석맵)</div>}
        />
        <Route path="/admin/concerts/register" element={<div>공연 등록</div>} />
        <Route
          path="/admin/concerts/register/character"
          element={<CharacterCustomizePage />}
        />
        <Route path="/admin/refunds" element={<div>환불 내역 관리</div>} />

        {/* 404 */}
        <Route path="*" element={<div>페이지를 찾을 수 없습니다</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
