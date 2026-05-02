import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { getCityBySlug } from "@/lib/cities";

export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { city: string };
}) {
  const city = await getCityBySlug(params.city);
  if (!city || !city.is_active) notFound();

  return (
    <>
      <AppHeader city={params.city} />
      <main id="main" className="min-h-screen pb-20 md:pb-0">{children}</main>
      <AppFooter />
    </>
  );
}
