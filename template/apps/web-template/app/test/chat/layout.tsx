import { SidebarProvider, SidebarTrigger } from "@repo/share-ui/components/shadcn/sidebar";
import { AppSidebar } from "../../../components/layout/app-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-1 *:min-h-0">
        <div className="flex-1 max-h-screen">{children}</div>
      </main>
    </SidebarProvider>
  );
}
