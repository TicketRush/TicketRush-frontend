/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6C5CE7",
          light: "#A19BE8",
        },
        secondary: "#f8f9fa",
        teal: "#02D4D5",
        danger: "#FF4757",
        kakao: {
          DEFAULT: "#FEE500",
          text: "#371D10",
          border: "#FDD835",
        },
        naver: {
          DEFAULT: "#03C75A",
          text: "#FFFFFF",
          border: "#02B350",
        },
        google: {
          DEFAULT: "#FFFFFF",
          text: "#2D3436",
          border: "#DFE6E9",
        },
        error: "#FF6B6B",
        success: "#02D405",
        border: {
          DEFAULT: "#DFE6E9",
          focus: "#6C5CE7",
        },
        text: {
          DEFAULT: "#2D3436",
          secondary: "#636E72",
          disabled: "#9CA3AF",
        },
        placeholder: "#B2BEC3",
        "disabled-bg": "#E5E7EB",
        timer: {
          warning: "#C10007",
        },
        genre: {
          musical: "#6C5CE7",
          concert: "#FF6B9D",
          classic: "#6496FF",
          jazz: "#FFA502",
          festival: "#20AE7F",
          fanmeeting: "#E679FF",
          ballet: "#C6B5FF",
        },
        // 관리자 영역 (#107)
        //
        // 페이지 배경과 KPI·네비게이션 카드는 다크, 기간 설정·차트·공연 목록만
        // 라이트 카드다. 두 계열이 한 화면에 공존하므로 card 아래에
        // 다크(DEFAULT)와 라이트(bg/border)를 함께 둔다.
        admin: {
          bg: "#000000",
          border: "#252B3D",
          text: {
            DEFAULT: "#E4E6EB",
            secondary: "#9CA3AF",
          },
          card: {
            DEFAULT: "#151B2C",
            bg: "#FFFFFF",
            border: "#D0D0D0",
          },
          dark: {
            bg: "#1E2939",
            border: "#4A5565",
          },
          accent: "#51A2FF",
          kpi: {
            events: "#51A2FF",
            tickets: "#05DF72",
            revenue: "#FF8904",
            occupancy: "#C27AFF",
          },
          register: "#155DFC",
          refund: "#942D12",
          resend: "#414B59",
          cancel: "#931818",
          status: {
            complete: "#00C950",
            cancelled: "#FB2C36",
          },
          seat: {
            available: "#B9F8CF",
            "available-hover": "#71ECA3",
            sold: "#99A1AF",
            holding: "#FFF085",
            "holding-blink": "#898355",
          },
        },
      },
      fontFamily: {
        pretendard: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      borderRadius: {
        button: "8px",
        input: "10px",
      },
      boxShadow: {
        button: "0 2px 8px rgba(108, 92, 231, 0.3)",
      },
      animation: {
        "admin-seat-blink": "adminSeatBlink 1.2s ease-in-out infinite",
      },
      keyframes: {
        // keyframes에서는 토큰을 참조할 수 없어 값을 직접 적는다.
        // admin.seat.holding / admin.seat.holding-blink 와 같은 값이어야 한다.
        adminSeatBlink: {
          "0%, 100%": { backgroundColor: "#FFF085" },
          "50%": { backgroundColor: "#898355" },
        },
      },
    },
  },
  plugins: [],
};
