import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.baseUrl;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/fr`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/fr/routes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/fr/events`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/fr/newsletters`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/fr/dons`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/fr/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/fr/carte`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/en`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const routes = await prisma.route.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
  });

  return [
    ...staticPages,
    ...routes.map((r) => ({
      url: `${base}/fr/routes/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
