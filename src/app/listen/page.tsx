import { Listener } from "@/components/Listener";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

/**
 * The phone's half of pay-by-sound.
 *
 * Reached by scanning the QR on the panel's pay screen, so a listener is two
 * taps away on a device that was never signed in — which is the situation the
 * feature exists for.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: requested } = await searchParams;
  const lang: Lang = isLang(requested) ? requested : DEFAULT_LANG;
  return <Listener lang={lang} />;
}
