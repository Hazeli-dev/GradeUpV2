
import { UserMenu } from "@/components/shared/user-menu";
import { SidebarShell } from "@/layouts/sidebar-shell";
import { ADMIN_NAV } from "@/constants";

export function AdminLayout() {
  return (
    <SidebarShell
      nav={ADMIN_NAV}
      compactMenu
      areaLabel="Admin Panel"
      storageKey="gradeup-admin-sidebar"
      topbarRight={
        <UserMenu
          name="Admin GradeUp"
          email="admin@gradeup.id"
          settingsTo="/admin/settings"
        />
      }
    />
  );
}

export default AdminLayout;
