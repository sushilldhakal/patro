import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

const BOOT_SPLASH_CSS = `
  html, body {
    background: linear-gradient(135deg, #0e6a6f 0%, #073f43 100%);
    margin: 0;
    min-height: 100%;
    font-family: "Noto Sans Devanagari", sans-serif;
  }
  #vp-boot-splash {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0e6a6f 0%, #073f43 100%);
  }
  #vp-boot-splash img {
    width: 160px;
    height: 160px;
    border-radius: 22%;
  }
`;

const BOOT_SPLASH_SCRIPT = `
  window.__hideVedicPatroBootSplash = function () {
    var el = document.getElementById('vp-boot-splash');
    if (el) el.remove();
  };
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <title>Vedic Patro</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wdth,wght@87.5,100..900&family=Fira+Code:wght@400;600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: BOOT_SPLASH_SCRIPT }} />
      </head>
      <body>
        <div id="vp-boot-splash" aria-hidden="true">
          <img src="/favicon.svg" alt="" width="160" height="160" />
        </div>
        {children}
      </body>
    </html>
  );
}

declare global {
  interface Window {
    __hideVedicPatroBootSplash?: () => void;
  }
}
