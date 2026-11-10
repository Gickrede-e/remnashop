import { BroadcastForm } from "@/components/admin/broadcast-form";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getEmailBroadcastAudienceCounts } from "@/lib/services/email-broadcasts";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastsPage() {
  const counts = await getEmailBroadcastAudienceCounts();
  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage adminSurfacePageForm">
      <ScreenHeader
        eyebrow="Админка"
        title="Рассылка"
        description="Служебное письмо всем пользователям, пользователям с активной подпиской или на один адрес."
      />
      <BroadcastForm counts={counts} />
    </div>
  );
}
