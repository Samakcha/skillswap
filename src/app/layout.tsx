import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKILLSWAP",
  description: "Hyperlocal Skill Exchanges. No Cash. Direct Mutual Value.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://labs.google" />
        <link rel="preload" href="https://labs.google/fx/api/og-video/shared/966a806e-8af1-4aed-944e-79606693e083" as="video" type="video/mp4" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('skillswap_theme') || 'dark';
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
