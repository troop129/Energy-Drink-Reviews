import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ComicFooter from "@/components/ComicFooter";

export const metadata: Metadata = {
  title: "Abid's Energy Drink Reviews",
  description: "38 energy drinks tried, rated, and analyzed with Ridge Regression. Abid's personal drink log.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,700;0,900;1,400;1,700;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-grow">
          {children}
        </main>
        <ComicFooter />
      </body>
    </html>
  );
}
