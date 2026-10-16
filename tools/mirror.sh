#!/usr/bin/env bash
# Вежливое зеркалирование публичной части https://www.dommeda.ru/ в ./site
# Один поток (wget однопоточный), пауза 1.5 c ± random-wait, robots.txt соблюдается.
set -euo pipefail
cd "$(dirname "$0")/.."

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 dommeda-prototype-mirror"

wget \
  --mirror --level=inf \
  --page-requisites \
  --adjust-extension \
  --convert-links \
  --restrict-file-names=windows \
  --no-host-directories \
  --directory-prefix=site \
  --wait=1.5 --random-wait \
  --tries=3 --timeout=30 --waitretry=10 \
  --compression=auto \
  --user-agent="$UA" \
  --reject-regex='[?&](sort|display)=|[?]$|/search[?]' \
  --output-file=logs/wget.log \
  https://www.dommeda.ru/
