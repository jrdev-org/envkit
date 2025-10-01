import "@/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

import { type Metadata } from "next";
import { ConvexClientProvider } from "./convex-client-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Envkit",
  description: "Stop emailing envs!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`bg-[#111] font-sans text-[#e5e5e5]`}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster
            position="bottom-right"
            swipeDirections={["left", "right"]}
            style={{
              backgroundColor: "#111",
              color: "#e5e5e5",
              borderRadius: 0,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
