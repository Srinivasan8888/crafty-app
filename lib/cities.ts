import { prisma } from "./db";
import { cache } from "react";

export const getCities = cache(async () => {
  return prisma.city.findMany({
    where: { is_active: true },
    orderBy: { display_order: "asc" },
  });
});

export const getCityBySlug = cache(async (slug: string) => {
  return prisma.city.findUnique({ where: { slug } });
});
