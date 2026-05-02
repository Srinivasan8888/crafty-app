import { redirect } from "next/navigation";

export default function HomeRoot() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CITY || "bengaluru";
  redirect(`/${slug}`);
}
