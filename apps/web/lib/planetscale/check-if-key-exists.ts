import { punyEncode } from "@dub/utils";
import {
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";

export const checkIfKeyExists = async ({
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
    (await conn`SELECT 1 FROM "Link" WHERE domain = ${domain} AND "key" = ${keyToQuery} LIMIT 1`) || [];

  return rows && Array.isArray(rows) && rows.length > 0;
};
