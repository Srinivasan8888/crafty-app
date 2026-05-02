import { redirect } from "next/navigation";

// Root → default city homepage. Per Issue 1.1 — city in path.
export default function HomeRoot() {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CITY || "bengaluru";
  redirect(`/${slug}`);
}
