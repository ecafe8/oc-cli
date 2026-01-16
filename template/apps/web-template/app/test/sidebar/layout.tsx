import { SidebarProvider, SidebarTrigger } from "@repo/share-ui/components/shadcn/sidebar";
import { AppSidebar } from "../../../components/layout/app-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
