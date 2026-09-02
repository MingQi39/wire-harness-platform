import type { LaboratoryLocation } from "@/api/types";

export function formatLaboratoryLocationOptionLabel(item: LaboratoryLocation): string {
  const name = item.laboratory_name.trim();
  if (name) return name;
  const no = item.laboratory_no.trim();
  return no || `实验室 #${item.id}`;
}

export function formatLegacyLaboratoryLocationOptionLabel(item: LaboratoryLocation): string {
  const no = item.laboratory_no.trim();
  const name = item.laboratory_name.trim();
  if (no && name) return `${no} / ${name}`;
  return no || name;
}

export function findLaboratoryLocationByStoredText(
  text: string,
  list: LaboratoryLocation[] | undefined,
): LaboratoryLocation | undefined {
  const stored = text.trim();
  if (!stored || !list?.length) return undefined;
  return list.find((item) => formatLaboratoryLocationOptionLabel(item) === stored)
    ?? list.find((item) => formatLegacyLaboratoryLocationOptionLabel(item) === stored)
    ?? list.find((item) => {
      const name = item.laboratory_name.trim();
      const department = item.department.trim();
      const no = item.laboratory_no.trim();
      return stored === name || stored === department || stored === no;
    });
}
