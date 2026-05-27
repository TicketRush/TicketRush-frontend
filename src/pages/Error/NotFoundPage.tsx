// 404 페이지
import { useNavigate } from "react-router-dom";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";

export default function NotFoundPage() {
  const navigate = useNavigate();
  useDocumentTitle("404 - 페이지를 찾을 수 없습니다");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white border border-border rounded-xl p-8 text-center">
        <Compass size={64} className="mx-auto text-primary mb-4" />
        <h1 className="text-5xl font-bold mb-2">404</h1>
        <p className="text-base font-semibold mb-1">
          페이지를 찾을 수 없습니다
        </p>
        <p className="text-sm text-text-secondary mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-3 rounded-lg bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1"
          >
            <Home size={14} /> 홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
