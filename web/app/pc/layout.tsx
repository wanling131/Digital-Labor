import { Sidebar } from "@/components/pc/sidebar"
import { Header } from "@/components/pc/header"
import { Breadcrumb } from "@/components/pc/breadcrumb"

export default function PCLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16">
        <div className="p-6">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  )
}
