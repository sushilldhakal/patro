/** Shared by packages/ui (VastuWheel, Plot), apps/web and apps/mobile (VastuPurushaWheel, VastuCompassRing). */
import { WHEEL_SIZE } from "@vedic-patro/domain/vastu/vastu";

export const CX = WHEEL_SIZE / 2;

export const CY = WHEEL_SIZE / 2;

export function annulusPath(outerR: number, innerR: number): string {
  return [
    `M ${(CX + outerR).toFixed(2)} ${CY}`,
    `A ${outerR} ${outerR} 0 1 1 ${(CX - outerR).toFixed(2)} ${CY}`,
    `A ${outerR} ${outerR} 0 1 1 ${(CX + outerR).toFixed(2)} ${CY}`,
    `M ${(CX + innerR).toFixed(2)} ${CY}`,
    `A ${innerR} ${innerR} 0 1 0 ${(CX - innerR).toFixed(2)} ${CY}`,
    `A ${innerR} ${innerR} 0 1 0 ${(CX + innerR).toFixed(2)} ${CY}`,
  ].join(" ");
}
