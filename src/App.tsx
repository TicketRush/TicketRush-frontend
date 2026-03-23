import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 인증 */}
        <Route path="/login" element={<div>로그인 페이지</div>} />
        <Route path="/register" element={<div>회원가입 페이지</div>} />

        {/* 사용자 */}
        <Route path="/" element={<div>홈 페이지</div>} />
        <Route path="/concerts" element={<div>공연 목록</div>} />
        <Route path="/concerts/:id" element={<div>공연 상세</div>} />

        {/* 404 */}
        <Route path="*" element={<div>페이지를 찾을 수 없습니다</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
