#!/usr/bin/env bash
# Commit under the teammate who owns the part being changed.
#
#   ./scripts/commit.sh can  "Anchor: SEP-38 firm quotes"
#   ./scripts/commit.sh berk "Panel: funding board"
#
# The other teammate is added as co-author, because the work is reviewed
# together even when one person owns the component. Whoever is named as author
# is the person who decided how that part works — not necessarily whose
# keyboard it came from.
set -euo pipefail

CAN_NAME="Can Sarıhan"
CAN_EMAIL="cansarihan@bluenetwork.com.tr"
BERK_NAME="Berk Çiçek"
BERK_EMAIL="90208101+berkcicekk@users.noreply.github.com"

who="${1:-}"; shift || true
message="${*:-}"

if [ -z "$who" ] || [ -z "$message" ]; then
  echo "kullanım: ./scripts/commit.sh <can|berk> \"commit mesajı\"" >&2
  exit 1
fi

case "$who" in
  can)  author="$CAN_NAME <$CAN_EMAIL>";  co="$BERK_NAME <$BERK_EMAIL>" ;;
  berk) author="$BERK_NAME <$BERK_EMAIL>"; co="$CAN_NAME <$CAN_EMAIL>" ;;
  *) echo "bilinmeyen: $who (can ya da berk)" >&2; exit 1 ;;
esac

git commit --author="$author" -m "$message" -m "Co-authored-by: $co"
git --no-pager log -1 --format="  %h · yazar: %an · ortak: %(trailers:key=Co-authored-by,valueonly)"
