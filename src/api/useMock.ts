/**
 * Mock API는 Vite 개발 서버에서만 켠다.
 * production build(`import.meta.env.DEV === false`)에서는
 * VITE_USE_MOCK이 true여도 실 API 경로를 탄다. (#208)
 */
export const USE_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true";
