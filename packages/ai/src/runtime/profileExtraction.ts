export type RuntimeProfileSourceType =
  | "portfolio"
  | "github"
  | "website"
  | (string & {});

export interface RuntimeCandidateEvidence {
  sourceUrl: string;
  sourceType?: RuntimeProfileSourceType;
  quote?: string;
  extractor?: string;
  confidence?: number;
}

export interface RuntimeSkillCandidate {
  id: string;
  skill: string;
  evidence?: RuntimeCandidateEvidence[];
}

export interface RuntimeProjectCandidate extends RuntimeProjectLike {
  id: string;
}

export interface RuntimeProjectLike {
  name: string;
  url?: string;
  description?: string;
  evidence?: RuntimeCandidateEvidence[];
}

export interface RuntimeExperienceCandidate {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
  evidence?: RuntimeCandidateEvidence[];
}

export interface RuntimeInlineProfileSignals {
  skills: string[];
  experienceItems: string[];
  projectItems: string[];
  projectNames: string[];
  certifications: string[];
  noiseFilteredCount: number;
}

export interface RuntimeInlineSourceFinding {
  url: string;
  sourceType: RuntimeProfileSourceType;
  signals: RuntimeInlineProfileSignals;
}

const normalizeOptionalText = (value: string | undefined): string =>
  (value ?? "").trim().toLowerCase();

const normalizeOptionalUrl = (value: string | undefined): string => {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized.toLowerCase() : "";
};

export const normalizeSkillFingerprint = (skill: string): string => normalizeOptionalText(skill);

export const normalizeProjectFingerprint = (project: RuntimeProjectLike): string =>
  `${normalizeOptionalText(project.name)}|${normalizeOptionalUrl(project.url)}`;

export const normalizeProjectNameFingerprint = (project: { name: string }): string =>
  normalizeOptionalText(project.name);

export const normalizeExperienceFingerprint = (entry: {
  title: string;
  company: string;
  period: string;
  description: string;
}): string =>
  `${normalizeOptionalText(entry.title)}|${normalizeOptionalText(entry.company)}|${normalizeOptionalText(entry.period)}|${normalizeOptionalText(entry.description)}`;

export const mergeCandidateEvidence = (
  current: RuntimeCandidateEvidence[] | undefined,
  next: RuntimeCandidateEvidence[] | undefined,
): RuntimeCandidateEvidence[] | undefined => {
  if (!current?.length && !next?.length) return undefined;
  const merged = [...(current ?? []), ...(next ?? [])];
  const seen = new Set<string>();
  const deduped: RuntimeCandidateEvidence[] = [];
  for (const item of merged) {
    const key = `${normalizeOptionalUrl(item.sourceUrl)}|${normalizeOptionalText(item.quote)}|${normalizeOptionalText(item.extractor)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
};

export const scoreProjectCandidateRichness = (candidate: RuntimeProjectLike): number => {
  const urlScore = candidate.url?.trim() ? 2 : 0;
  const descriptionScore = Math.min((candidate.description?.trim().length ?? 0) / 120, 3);
  const evidenceScore = Math.min(candidate.evidence?.length ?? 0, 3);
  return urlScore + descriptionScore + evidenceScore;
};

export const pickRicherProjectCandidate = <TProject extends RuntimeProjectLike>(
  left: TProject,
  right: TProject,
): TProject => {
  const leftScore = scoreProjectCandidateRichness(left);
  const rightScore = scoreProjectCandidateRichness(right);
  if (rightScore > leftScore) {
    return {
      ...right,
      evidence: mergeCandidateEvidence(right.evidence, left.evidence),
    };
  }
  return {
    ...left,
    url: left.url ?? right.url,
    description: left.description ?? right.description,
    evidence: mergeCandidateEvidence(left.evidence, right.evidence),
  };
};

const dedupeByKey = <TEntry>(entries: TEntry[], getKey: (entry: TEntry) => string): TEntry[] => {
  const seen = new Set<string>();
  const deduped: TEntry[] = [];
  for (const entry of entries) {
    const key = getKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
};

export const dedupeSkillCandidates = <TSkill extends RuntimeSkillCandidate>(
  entries: TSkill[],
): TSkill[] => dedupeByKey(entries, (entry) => normalizeSkillFingerprint(entry.skill));

export const dedupeProjectCandidates = <TProject extends RuntimeProjectLike>(
  entries: TProject[],
): TProject[] => dedupeByKey(entries, (entry) => normalizeProjectFingerprint(entry));

export const dedupeExperienceCandidates = <TExperience extends RuntimeExperienceCandidate>(
  entries: TExperience[],
): TExperience[] => dedupeByKey(entries, (entry) => normalizeExperienceFingerprint(entry));

export const dedupeProjectCandidatesByNamePreferRichest = <
  TProject extends RuntimeProjectLike,
>(
  entries: TProject[],
): TProject[] => {
  const byName = new Map<string, TProject>();
  for (const entry of entries) {
    const key = normalizeProjectNameFingerprint(entry);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, entry);
      continue;
    }
    byName.set(key, pickRicherProjectCandidate(existing, entry));
  }
  return [...byName.values()];
};
