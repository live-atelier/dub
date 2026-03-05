import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

export const getLinkViaEdge = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) => {
  const isCaseSensitive = isCaseSensitiveDomain(domain);
  const keyToQuery = isCaseSensitive
    ? // for case sensitive domains, we need to encode the key
      encodeKey(key)
    : // for non-case sensitive domains, we need to make sure that the key is always URI-decoded + punycode-encoded
      // (cause that's how we store it in the database)
      punyEncode(decodeURIComponent(key));

  const rows =
    (await conn('SELECT * FROM "Link" WHERE domain = $1 AND "key" = $2', [
      domain,
      keyToQuery,
    ])) || [];

  const link =
    rows && Array.isArray(rows) && rows.length > 0
      ? (rows[0] as EdgeLinkProps)
      : null;

  return link
    ? { ...link, key: decodeKeyIfCaseSensitive({ domain, key }) }
    : null;
};
