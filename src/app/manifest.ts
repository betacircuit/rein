import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REIN",
    short_name: "REIN",
    description: "과외와 돈, 우리집 일을 가볍게 운영하는 한국어 학생 PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#d8d8d8",
    theme_color: "#2fc0cf",
    lang: "ko-KR",
    icons: [{ src: "/rein-logo.png", sizes: "871x509", type: "image/png", purpose: "any" }],
  };
}
