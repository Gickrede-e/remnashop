export type ProviderStatus = "available" | "timeout" | "unavailable" | "not_configured";

export type ProviderStatusRow = {
  label: string;
  status: ProviderStatus;
  summary: string;
  detail: string;
  checkedAt: string;
};

export async function getProviderStatuses(): Promise<ProviderStatusRow[]> {
  const checkedAt = new Date().toISOString();

  return [
    {
      label: "Remnawave",
      status: "not_configured",
      summary: "Не настроен",
      detail: "placeholder config",
      checkedAt
    },
    {
      label: "YooKassa",
      status: "not_configured",
      summary: "Не настроен",
      detail: "placeholder config",
      checkedAt
    },
    {
      label: "Platega",
      status: "not_configured",
      summary: "Не настроен",
      detail: "placeholder config",
      checkedAt
    }
  ];
}
