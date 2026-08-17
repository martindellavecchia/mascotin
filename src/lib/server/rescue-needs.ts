import type { Prisma, RescueCaseStatus, RescueNeedStatus, RescueNeedType } from '@prisma/client';
import { calculateRescueCaseStatus } from '@/lib/rescue';

type TransactionClient = Prisma.TransactionClient;

export interface RescueNeedInput {
  primaryNeed?: RescueNeedType;
  additionalNeeds?: RescueNeedType[];
  needDetails?: Record<string, string>;
}

export async function createRescueNeeds(
  tx: TransactionClient,
  rescueCaseId: string,
  input: RescueNeedInput,
) {
  const primaryNeed = input.primaryNeed || 'FOSTER';
  const types = [primaryNeed, ...(input.additionalNeeds || [])];
  return tx.rescueNeed.createMany({
    data: types.map((type) => ({
      rescueCaseId,
      type,
      isPrimary: type === primaryNeed,
      details: input.needDetails?.[type]?.trim() || null,
    })),
  });
}

export async function recalculateRescueCaseStatus(
  tx: TransactionClient,
  rescueCaseId: string,
): Promise<RescueCaseStatus> {
  const rescueCase = await tx.rescueCase.findUnique({
    where: { id: rescueCaseId },
    include: {
      needs: { select: { status: true } },
      placements: {
        where: { status: { in: ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'] } },
        select: { status: true },
      },
      adoptionDraft: { select: { status: true } },
      adoptionListing: { select: { status: true } },
    },
  });
  if (!rescueCase) throw new Error('Caso no encontrado');

  const nextStatus = calculateRescueCaseStatus({
    currentStatus: rescueCase.status,
    needStatuses: rescueCase.needs.map((need) => need.status),
    hasActiveFoster: rescueCase.placements.some((placement) => ['ACTIVE', 'AWAITING_ADOPTION'].includes(placement.status)),
    hasOpenAdoption: Boolean(
      rescueCase.adoptionDraft && ['DRAFT', 'PUBLISHED', 'MATCHED'].includes(rescueCase.adoptionDraft.status)
      || rescueCase.adoptionListing && ['OPEN', 'MATCHED'].includes(rescueCase.adoptionListing.status),
    ),
  });
  if (nextStatus !== rescueCase.status) {
    await tx.rescueCase.update({ where: { id: rescueCaseId }, data: { status: nextStatus } });
  }
  return nextStatus;
}

export async function setRescueNeedStatus(
  tx: TransactionClient,
  needId: string,
  status: RescueNeedStatus,
) {
  const need = await tx.rescueNeed.update({ where: { id: needId }, data: { status } });
  const caseStatus = await recalculateRescueCaseStatus(tx, need.rescueCaseId);
  return { need, caseStatus };
}

export async function setCaseNeedStatus(
  tx: TransactionClient,
  rescueCaseId: string,
  type: RescueNeedType,
  status: RescueNeedStatus,
) {
  const need = await tx.rescueNeed.findUnique({
    where: { rescueCaseId_type: { rescueCaseId, type } },
  });
  if (!need) return null;
  return setRescueNeedStatus(tx, need.id, status);
}

export function serializeRescueNeeds(needs: Array<{
  id: string;
  type: RescueNeedType;
  isPrimary: boolean;
  details: string | null;
  status: RescueNeedStatus;
}>) {
  return needs.map((need) => ({
    id: need.id,
    type: need.type,
    isPrimary: need.isPrimary,
    details: need.details,
    status: need.status,
  }));
}
