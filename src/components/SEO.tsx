import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  path: string;
}

const SITE = "https://mcqx.lovable.app";

export function SEO({ title, description, path }: SEOProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}
