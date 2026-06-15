import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AdminAuthGuard>
  );
}
