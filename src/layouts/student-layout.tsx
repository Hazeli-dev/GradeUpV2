
import { UserMenu } from "@/components/shared/user-menu";
import { GradeUpChatWidget } from "@/components/shared/gradeup-chat-widget";
import { SidebarShell } from "@/layouts/sidebar-shell";
import { STUDENT_NAV, UPGRADE_NAV } from "@/constants";
import { studentProfile } from "@/data/results";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";

export function StudentLayout() {
  const { openUpgrade } = useUpgradeModal();

  return (
    <>
      <SidebarShell
        nav={STUDENT_NAV}
        storageKey="gradeup-student-sidebar"
        actionItem={{ ...UPGRADE_NAV, onClick: openUpgrade }}
        topbarRight={
          <UserMenu
            name={studentProfile.name}
            email={studentProfile.email}
            settingsTo="/dashboard/settings"
          />
        }
      />

      <GradeUpChatWidget />
    </>
  );
}
