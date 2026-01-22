#!/usr/bin/env bash
set -euo pipefail

TARGET=${1:-archive/deprecated-$(date +%Y%m%d)}
BASE_DIR=$(pwd)
LIST_FILE="$BASE_DIR/archive/deprecated-20260122/MOVED_FILES.txt"

if [ ! -f "$LIST_FILE" ]; then
  echo "Nie znaleziono $LIST_FILE" >&2
  exit 1
fi

echo "Przenoszenie plików wg listy do: $TARGET"

while IFS= read -r line || [ -n "$line" ]; do
  p=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  # ignoruj puste linie i komentarze
  if [ -z "$p" ] || [[ $p == \#* ]]; then
    continue
  fi

  if [ ! -e "$p" ]; then
    echo "Brak: $p — pomijam"
    continue
  fi

  dest="$TARGET/$p"
  destdir=$(dirname "$dest")
  mkdir -p "$destdir"

  # Preferuj git mv dla zachowania historii, fallback na mv
  if git ls-files --error-unmatch "$p" > /dev/null 2>&1; then
    echo "git mv $p -> $dest"
    git mv "$p" "$dest" || { echo "git mv nie powiodło się, używam mv"; mv -f "$p" "$dest"; git add "$dest"; git rm -r --cached "$p" 2>/dev/null || true; }
  else
    echo "mv $p -> $dest"
    mv -f "$p" "$dest"
  fi
done < "$LIST_FILE"

echo "Przenoszenie zakończone. Sprawdź zmiany i wykonaj commit:"
echo "  git status"
echo "  git add $TARGET"
echo "  git commit -m 'archive: move deprecated/backup files to $TARGET'"
