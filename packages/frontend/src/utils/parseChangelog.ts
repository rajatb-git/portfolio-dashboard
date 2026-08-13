export type ChangelogSection = {
  type: string;
  items: string[];
};

export type ChangelogRelease = {
  version: string;
  date: string;
  sections: ChangelogSection[];
};

const RELEASE_HEADER = /^##\s*\[([^\]]+)\]\s*[–—-]\s*(.+)$/;
const SECTION_HEADER = /^###\s+(.+)$/;
const BULLET_ITEM = /^-\s+(.+)$/;

/** Parses Keep-a-Changelog formatted markdown (see root CHANGELOG.md) into structured releases. */
export function parseChangelog(raw: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const line of raw.split('\n')) {
    const releaseMatch = line.match(RELEASE_HEADER);
    if (releaseMatch) {
      currentRelease = { version: releaseMatch[1].trim(), date: releaseMatch[2].trim(), sections: [] };
      releases.push(currentRelease);
      currentSection = null;
      continue;
    }

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch && currentRelease) {
      currentSection = { type: sectionMatch[1].trim(), items: [] };
      currentRelease.sections.push(currentSection);
      continue;
    }

    const bulletMatch = line.match(BULLET_ITEM);
    if (bulletMatch && currentSection) {
      currentSection.items.push(bulletMatch[1].trim());
    }
  }

  return releases;
}
