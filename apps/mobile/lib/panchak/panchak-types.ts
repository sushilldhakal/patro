/** Panchak variety by weekday the period begins (classical Patro convention). */
export type PanchakVarietyId = "mrityu" | "agni" | "raja" | "chora" | "roga";

export interface PanchakVariety {
  id: PanchakVarietyId;
  labelEn: string;
  labelNe: string;
  noteEn: string;
  noteNe: string;
}

export const PANCHAK_VARIETIES: PanchakVariety[] = [
  {
    id: "mrityu",
    labelEn: "Mrityu Panchak",
    labelNe: "मृत्यु पञ्चक",
    noteEn: "When Panchak begins on Sunday — indicates death-like suffering or serious illness.",
    noteNe: "आइतबार सुरु हुने पञ्चक — मृत्यु समान कष्ट वा गम्भीर रोगको संकेत।",
  },
  {
    id: "agni",
    labelEn: "Agni Panchak",
    labelNe: "अग्नी पञ्चक",
    noteEn: "When Panchak begins on Tuesday — increased risk of fire or accidents.",
    noteNe: "मङ्गलबार सुरु — आगलागी वा दुर्घटनाको जोखिम बढी।",
  },
  {
    id: "raja",
    labelEn: "Raja Panchak",
    labelNe: "राज पञ्चक",
    noteEn: "When Panchak begins on Monday — mental stress or government-related trouble.",
    noteNe: "सोमबार सुरु — मानसिक तनाव वा सरकारी झमेलाको संकेत।",
  },
  {
    id: "chora",
    labelEn: "Chora Panchak",
    labelNe: "चोर पञ्चक",
    noteEn: "When Panchak begins on Friday — fear of theft or financial loss.",
    noteNe: "शुक्रबार सुरु — धन हानि वा चोरीको डर बढी।",
  },
  {
    id: "roga",
    labelEn: "Roga Panchak",
    labelNe: "रोग पञ्चक",
    noteEn: "When Panchak begins on Saturday — health problems and chronic ailments.",
    noteNe: "शनिबार सुरु — स्वास्थ्य समस्या र दीर्घकालीन रोगको संकेत।",
  },
];

const VARIETY_BY_WEEKDAY: Partial<Record<number, PanchakVarietyId>> = {
  0: "mrityu",
  1: "raja",
  2: "agni",
  5: "chora",
  6: "roga",
};

export function panchakVarietyFromStartAd(adIso: string): PanchakVariety | undefined {
  const d = new Date(`${adIso}T12:00:00`);
  const id = VARIETY_BY_WEEKDAY[d.getDay()];
  return id ? PANCHAK_VARIETIES.find((v) => v.id === id) : undefined;
}
