import { normalizeWorkspaceId } from "../api/workspaces/workspace-id";
import { WorkspaceProps } from "../types";
import { conn } from "./connection";

export const getWorkspaceViaEdge = async ({
  workspaceId,
  includeDomains = false,
}: {
  workspaceId: string;
  includeDomains?: boolean;
}) => {
  const normalizedId = normalizeWorkspaceId(workspaceId);

  const rows = includeDomains
    ? (await conn`
        SELECT
          w.*,
          d.slug
        FROM "Project" w
        LEFT JOIN "Domain" d ON w.id = d."projectId"
        WHERE w.id = ${normalizedId}
        LIMIT 100
      `) || []
    : (await conn`
        SELECT
          w.*
        FROM "Project" w
        WHERE w.id = ${normalizedId}
        LIMIT 1
      `) || [];

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  if (!includeDomains) {
    return rows[0] as WorkspaceProps;
  }

  const firstRow = rows[0] as any;
  const workspaceData = { ...firstRow };
  const domains: { slug: string }[] = [];

  // Process all rows to collect domains
  rows.forEach((row: any) => {
    if (row.slug) {
      domains.push({
        slug: row.slug,
      });
    }
  });

  // Remove domain fields from workspace object
  const { slug, ...cleanWorkspaceData } = workspaceData;

  return {
    ...cleanWorkspaceData,
    domains,
  } as WorkspaceProps & { domains: { slug: string }[] };
};
