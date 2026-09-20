#!/usr/bin/env bash
# Fresh walkthrough invoices, for the take about to be recorded.
#
# An ETTN is spent the moment it reaches the contract, so a file that was
# uploaded once will open on a refusal ever after. This overwrites the pair
# rather than adding to it: there is never a question of which one is still good.
set -euo pipefail

SITE="${SITE:-https://payper.live}"
OUT="${OUT:-$HOME/Downloads/payper-video-faturalar}"
SESSION="take-$(date +%s)"

mkdir -p "$OUT"
curl -fsS "$SITE/api/demo-invoice?variant=video&session=$SESSION"      -o "$OUT/fatura-A.xml"
curl -fsS "$SITE/api/demo-invoice?variant=video-copy&session=$SESSION" -o "$OUT/fatura-A-kopya.xml"

ettn() { grep -oE '<cbc:UUID>[^<]*' "$1" | cut -d'>' -f2; }
amount() { grep -oE 'PayableAmount[^>]*>[^<]*' "$1" | grep -oE '[0-9]+\.[0-9]+' | head -1; }

printf '\n\033[1mFresh pair\033[0m  %s\n\n' "$OUT"
printf '  %-20s %s ₺  ETTN %s\n' "fatura-A.xml" "$(amount "$OUT/fatura-A.xml")" "$(ettn "$OUT/fatura-A.xml")"
printf '  %-20s %s ₺  ETTN %s\n' "fatura-A-kopya.xml" "$(amount "$OUT/fatura-A-kopya.xml")" "$(ettn "$OUT/fatura-A-kopya.xml")"

if [ "$(ettn "$OUT/fatura-A.xml")" = "$(ettn "$OUT/fatura-A-kopya.xml")" ]; then
  printf '\n  \033[32m✓\033[0m same ETTN on both — the refusal will come from the identifier\n\n'
else
  printf '\n  \033[31m✕\033[0m the two carry different identifiers\n\n'
  exit 1
fi
