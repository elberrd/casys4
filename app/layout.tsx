// This is a minimal root layout that just wraps children
// The actual layout with providers is in app/[locale]/layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
