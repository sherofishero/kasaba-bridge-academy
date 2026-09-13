import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function SalonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        minWidth: 0,
        margin: 0,
        padding: 0,
        overflowX: "clip",
      }}
    >
      {children}
    </div>
  );
}
