// The verification pipeline every seller project moves through (PRD §4.1).
export const STAGES = [
  "Submitted",
  "Document Review",
  "Verifier Assigned",
  "Site/MRV Audit",
  "Registry Cross-Check",
  "Approval",
  "Tokenization",
  "Live",
] as const;

export type Stage = (typeof STAGES)[number];

export const stageIndex = (s: string) => Math.max(0, STAGES.indexOf(s as Stage));
export const nextStage = (s: string): Stage => {
  const i = stageIndex(s);
  return STAGES[Math.min(i + 1, STAGES.length - 1)];
};
export const stageProgress = (s: string) => (stageIndex(s) / (STAGES.length - 1)) * 100;

export const SELLER_ACCOUNT_ID = "00000000-0000-4000-8000-000000000002";
