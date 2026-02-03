# Magazyn App

Lekka aplikacja magazynowa (frontend React + backend Express + Prisma). README zawiera instrukcje uruchomienia, budowania i publikacji projektu.

## Zawartość repozytorium
- `client/` — aplikacja React (frontend)
- `server/` — serwer Express, Prisma i skrypty serwera
- `server/prisma/` — schemat i migracje bazy danych

## Wymagania
- Node.js 18+ (zalecane LTS)
- npm 8+ lub yarn
- PostgreSQL (jeśli chcesz uruchomić serwer lokalnie z bazą)

## Zmienne środowiskowe
Utwórz plik `.env` w katalogu `server/` na bazie `server/.env.example` i — opcjonalnie — `.env` w katalogu głównym. Przykładowe klucze:

- `DATABASE_URL` — URL do Postgres (np. `postgresql://user:pass@localhost:5432/magazyn`)
- `JWT_SECRET` — sekret do podpisywania tokenów
- `PORT` — port serwera (domyślnie 5000)

Pliki przykładowe: `server/.env.example`, `.env.example` (root).

## Uruchomienie w trybie developerskim
1. Zainstaluj zależności root / client / server:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

2. Uruchom serwer (w katalogu `server/`):

```bash
cd server
npm run dev
```

3. Uruchom klienta (w katalogu `client/`):

```bash
cd client
npm start
```

Frontend używa proxy `http://localhost:5000` do komunikacji z backendem w środowisku developerskim.

## Budowanie aplikacji (production)

1. Zbuduj frontend:

```bash
cd client
npm run build
```

2. Pliki produkcyjne znajdą się w `client/build`. Możesz serwować je dowolnym serwerem lub skonfigurować serwer Express tak, aby serwował `client/build`.

## Migracje i baza danych (Prisma)

Instrukcje uruchamiania migracji i seedów (w katalogu `server`):

- Upewnij się, że w `server/.env` jest ustawiona zmienna `DATABASE_URL`.

- Instalacja/aktualizacja klienta Prisma:

```bash
cd server
npx prisma generate
```

- Tryb developerski (lokalnie, tworzy migracje i stosuje je):

```bash
npx prisma migrate dev --name init
```

- Tryb produkcyjny (stosuj istniejące migracje bez ich tworzenia):

```bash
npx prisma migrate deploy
```

- Seed danych (jeśli projekt zawiera skrypt seed):

```bash
# jeśli używasz Prisma seed (zdefiniowanego w prisma/seed.js lub package.json)
npx prisma db seed
# lub uruchom skrypt seeda ręcznie, np.:
node prisma/seed.js
```

Jeśli nie masz skryptu seed, możesz przygotować plik `server/prisma/seed.js` lub dodać polecenie `prisma db seed` w `package.json`.


## Linter / formatowanie

W root repo są skrypty:

- `npm run lint` — uruchamia ESLint dla `server` i `client/src`
- `npm run format` — uruchamia Prettier

Uruchom w root:

```bash
npm run lint
npm run format
```

## CI (GitHub Actions)
W repo dodany jest prosty workflow CI (lint + client build). Zobacz `.github/workflows/ci.yml`.

## Licencja
Projekt licencjonowany na licencji MIT — plik `LICENSE` w repo.

