export interface EdgeLinkProps {
  id: string;
  domain: string;
  key: string;
  url: string;
  shortLink: string;
  proxy: boolean;
  title: string;
  description: string;
  image: string;
  video: string;
  rewrite: boolean;
  password: string | null;
  expiresAt: string | null;
  ios: string | null;
  android: string | null;
  geo: object | null;
  projectId: string;
  publicStats: boolean;
  expiredUrl: string | null;
  createdAt: string;
  trackConversion: boolean;
  programId: string | null;
  partnerId: string | null;
}

export interface EdgeDomainProps {
  id: string;
  slug: string;
  logo: string | null;
  verified: boolean;
  placeholder: string;
  expiredUrl: string | null;
  notFoundUrl: string | null;
  primary: boolean;
  archived: boolean;
  projectId: string;
  lastChecked: string;
  createdAt: string;
  updatedAt: string;
}
