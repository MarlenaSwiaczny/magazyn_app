Archiwum plików oznaczonych jako deprecated / backup

Ten folder zawiera listę plików i skrypt pomagający przenieść elementy z repo
do archiwum. Nie wykonywałem automatycznego przeniesienia — uruchom skrypt
`scripts/move-deprecated-to-archive.sh` po ręcznym sprawdzeniu listy.

Cel:
- uporządkować strukturę repo bez natychmiastowego usuwania plików
- zachować kopię referencyjną przed usunięciem z historii

Instrukcja:
1. Sprawdź zawartość `MOVED_FILES.txt`.
2. Uruchom:

```bash
bash scripts/move-deprecated-to-archive.sh archive/deprecated-20260122
```

Skrypt spróbuje wykonać `git mv` dla istniejących ścieżek, a w razie potrzeby
użyje `mv`. Jeśli chcesz, mogę uruchomić ten skrypt za Ciebie.
