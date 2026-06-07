export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="parent-dashboard theme-light min-h-screen"
      data-theme="light"
      suppressHydrationWarning
    >
      {children}
    </div>
  )
}
