import { App } from "@/components/App";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: requested } = await searchParams;
  const lang: Lang = isLang(requested) ? requested : DEFAULT_LANG;
  return <App lang={lang} />;
}
