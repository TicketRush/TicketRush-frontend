/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
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
        },
        naver: "#03C75A",
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
          musical: "#825AFF",
          concert: "#FF38A5",
          classic: "#1D7DFF",
          jazz: "#FF9900",
          festival: "#00BC7C",
          fanmeeting: "#FFA2D6",
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
    },
  },
  plugins: [],
};
