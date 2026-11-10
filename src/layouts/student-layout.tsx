
import { UserMenu } from "@/components/shared/user-menu";
import { GradeUpChatWidget } from "@/components/shared/gradeup-chat-widget";
import { FloatingPromo } from "@/components/student/floating-promo";
import { SidebarShell } from "@/layouts/sidebar-shell";
import { STUDENT_NAV, UPGRADE_NAV } from "@/constants";
import { studentProfile } from "@/data/results";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { useStudentMembership } from "@/hooks/use-student-membership";

export function StudentLayout() {
  const { openUpgrade } = useUpgradeModal();
  const { isPremium, isLoading } = useStudentMembership();

  const isFree = !isLoading && isPremium === false;

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

      <FloatingPromo
        isFree={isFree}
        onUpgradeClick={openUpgrade}
      />

      <GradeUpChatWidget />
    </>
  );
}
