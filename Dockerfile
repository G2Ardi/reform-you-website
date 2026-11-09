# Reform You Pilates Studio: Betrieb im eigenen Rechenzentrum
#
# Zwei Ziele aus einem Build:
#   laufzeit  schlanker Server der Website (Standard fuer "docker compose up")
#   werkzeug  Image mit allem Noetigen fuer Migrationen, Seed und Terminerzeugung
#
# Einzelheiten und Befehle: BETRIEB.md

FROM node:22-bookworm-slim AS basis
# openssl fuer die Prisma-Engine, tzdata damit TZ=Europe/Berlin wirkt
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------- Abhaengigkeiten
FROM basis AS abhaengigkeiten
COPY package.json package-lock.json ./
# prisma/ wird vor "npm ci" gebraucht, weil postinstall "prisma generate" ausfuehrt
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------- Bauen
FROM abhaengigkeiten AS bauen
COPY . .
# Beim Bauen gibt es keine Datenbank. Die Seiten rendern erst zur Laufzeit, der
# Platzhalter verhindert nur Fehlermeldungen wegen einer fehlenden Variable.
ENV DATABASE_URL="postgresql://bauen:bauen@127.0.0.1:5432/bauen"
# Zweiter Versuch: Next.js zeigt manchmal beim ersten Aufruf einen Hinweis auf ein
# Update und bricht dabei ab, der zweite Lauf baut normal durch.
RUN npm run build || npm run build

# ---------------------------------------------------------------- Werkzeug
# Enthaelt Prisma CLI, tsx und den Quellcode: Migrationen, Seed, Termine.
FROM bauen AS werkzeug
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------- Laufzeit
FROM basis AS laufzeit
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Berlin
COPY --from=bauen --chown=node:node /app/.next/standalone ./
COPY --from=bauen --chown=node:node /app/.next/static ./.next/static
COPY --from=bauen --chown=node:node /app/public ./public
# Prisma-Client mit der Linux-Engine sicher mitnehmen
COPY --from=bauen --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=bauen --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client
USER node
EXPOSE 3000
CMD ["node", "server.js"]
