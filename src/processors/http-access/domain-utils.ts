export function extractDomain(url: string): string {
  let domain = url;

  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/^www\./, "");

  const slashIndex = domain.indexOf("/");
  if (slashIndex !== -1) {
    domain = domain.slice(0, slashIndex);
  }

  return domain;
}
