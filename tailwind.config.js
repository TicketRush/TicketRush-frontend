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

      // 관리자 다크 테마
      "admin-bg": "#0A0E1A",
      "admin-card": "#151B2C",
      "admin-border": "#252B3D",
      "admin-text": "#E4E6EB",
      "admin-text-secondary": "#9CA3AF",

      // 좌석 상태 (사진의 색상 가이드 기준)
      "seat-available": "#B9F8CF",
      "seat-available-hover": "#71ECA3",
      "seat-sold": "#99A1AF",
      "seat-holding": "#FFF085",
      "seat-blink": "#898355",

      // 관리자 액션 색상
      "admin-refund": "#942D12",
      "admin-resend": "#414B59",
      "admin-cancel": "#931818",
      "admin-status-complete": "#00C950",
      "admin-status-cancelled": "#FB2C36",
    },
  },
  animation: {
    "seat-blink": "seatBlink 1.2s ease-in-out infinite",
  },
  keyframes: {
    seatBlink: {
      "0%, 100%": { backgroundColor: "#FFF085" },
      "50%": { backgroundColor: "#898355" },
    },
  },

  plugins: [],
};
