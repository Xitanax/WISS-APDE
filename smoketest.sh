#!/usr/bin/env bash
set -euo pipefail

need() { command -v "$1" >/dev/null || { echo "Fehlt: $1"; exit 1; }; }
need curl; need jq

iso() {
  # ISO-8601 UTC (Linux date oder coreutils gdate)
  if command -v date >/dev/null && date -u -d "0" +%s >/dev/null 2>&1; then
    date -u -d "$1" +%FT%TZ
  else
    gdate -u -d "$1" +%FT%TZ
  fi
}

echo "== Health =="
curl -sS -i http://localhost:8080/api/health | head -n 1

echo "== Admin-Login =="
ADM="$(curl -sS -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@chocadies.local","password":"secret123"}' | jq -r .token)"
test -n "$ADM" && test "$ADM" != "null" || { echo "!! ADM token leer"; exit 1; }
echo "ADM token ok (${#ADM} bytes)"

echo "== Public Jobs =="
curl -sS http://localhost:8080/api/public/jobs | jq
JOBID="$(curl -sS http://localhost:8080/api/public/jobs | jq -r '.[0].id // .[0]._id')"
test -n "$JOBID" && test "$JOBID" != "null" || { echo "!! Keine JobID"; exit 1; }
echo "JOBID=$JOBID"

echo "== LinkedIn: publish (Dummy) =="
curl -sS -X POST "http://localhost:8080/api/v2/linkedin/publish/${JOBID}" \
  -H "Authorization: Bearer ${ADM}" | jq

echo "== Jobs (intern) mit linkedinPostId =="
curl -sS http://localhost:8080/api/v2/jobs -H "Authorization: Bearer ${ADM}" \
  | jq 'map({
      id: (._id // .id // .["id"]),
      title: .title,
      linkedinPostId: (.linkedinPostId // null)
    })'

echo "== LinkedIn: unpublish =="
curl -sS -X DELETE "http://localhost:8080/api/v2/linkedin/publish/${JOBID}" \
  -H "Authorization: Bearer ${ADM}" | jq

echo "== Applicant registrieren + login =="
curl -sS -X POST http://localhost:8080/api/public/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@app.local","password":"secret123","birthdate":"1995-05-20","address":"Musterstraße 1, 8000 Zürich"}' \
  | jq || true

ATOK="$(curl -sS -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@app.local","password":"secret123"}' | jq -r .token)"
test -n "$ATOK" && test "$ATOK" != "null" || { echo "!! ATOK leer"; exit 1; }
echo "ATOK ok (${#ATOK} bytes)"

echo "== Bewerbung erstellen =="
RESP="$(mktemp)"
CODE=$(curl -sS -o "$RESP" -w '%{http_code}' \
  -X POST http://localhost:8080/api/v2/applications \
  -H "Authorization: Bearer ${ATOK}" -H 'Content-Type: application/json' \
  -d "{\"jobId\":\"${JOBID}\"}")

echo "HTTP $CODE"
if [ "$CODE" = "200" ] || [ "$CODE" = "201" ]; then
  cat "$RESP" | jq .
elif [ "$CODE" = "409" ]; then
  echo "(already applied)"
  cat "$RESP" | jq .
else
  echo "Body:"; sed -n '1,200p' "$RESP"
  exit 1
fi

echo "== Meine Bewerbungen (Applicant) =="
curl -sS http://localhost:8080/api/v2/applications/me -H "Authorization: Bearer ${ATOK}" | jq

echo "== Bewerbungen (HR/Admin) für Job =="
curl -sS "http://localhost:8080/api/v2/applications?jobId=${JOBID}" -H "Authorization: Bearer ${ADM}" | jq
APPID="$(curl -sS "http://localhost:8080/api/v2/applications?jobId=${JOBID}" -H "Authorization: Bearer ${ADM}" | jq -r '.[0].id // empty')"

echo "== Meeting (Applicant schlägt Termin vor) =="
START="$(iso '+2 days 10:00')"
END="$(iso '+2 days 10:30')"
curl -sS -X POST http://localhost:8080/api/v2/meetings \
  -H "Authorization: Bearer ${ATOK}" -H 'Content-Type: application/json' \
  -d "{\"jobId\":\"${JOBID}\",\"startsAt\":\"${START}\",\"endsAt\":\"${END}\",\"mode\":\"online\",\"location\":\"Teams-Link folgt\"}" \
  | jq

echo "== HR erstellt Meeting für Applicant =="
HSTART="$(iso '+3 days 09:00')"
HEND="$(iso '+3 days 09:30')"
curl -sS -X POST http://localhost:8080/api/v2/meetings \
  -H "Authorization: Bearer ${ADM}" -H 'Content-Type: application/json' \
  -d "{\"jobId\":\"${JOBID}\",\"applicantEmail\":\"bob@app.local\",\"startsAt\":\"${HSTART}\",\"endsAt\":\"${HEND}\",\"mode\":\"onsite\",\"location\":\"Zürich HQ\"}" | jq

echo "== Meine Meetings (Applicant) =="
curl -sS http://localhost:8080/api/v2/meetings/me -H "Authorization: Bearer ${ATOK}" | jq

echo "== Meetings (HR/Admin) =="
curl -sS "http://localhost:8080/api/v2/meetings?jobId=${JOBID}" -H "Authorization: Bearer ${ADM}" | jq
MEETID="$(curl -sS "http://localhost:8080/api/v2/meetings?jobId=${JOBID}" -H "Authorization: Bearer ${ADM}" | jq -r '.[0].id // empty')"

if [ -n "${MEETID:-}" ]; then
  echo "== Meeting akzeptieren (HR) =="
  curl -sS -X PATCH "http://localhost:8080/api/v2/meetings/${MEETID}" \
    -H "Authorization: Bearer ${ADM}" -H "Content-Type: application/json" \
    -d '{"status":"accepted","location":"MS Teams: https://teams.example/abc"}' | jq
fi

echo "== LinkedIn-Import (Dummy) – Applicant + optional Bewerbung =="
curl -sS -X POST http://localhost:8080/api/v2/linkedin/import-applicant \
  -H "Authorization: Bearer ${ADM}" -H "Content-Type: application/json" \
  -d "{\"profileUrl\":\"https://www.linkedin.com/in/jane-doe\",\"email\":\"jane@app.local\",\"name\":\"Jane Doe\",\"birthdate\":\"1993-03-14\",\"address\":\"Limmatstr. 1, 8005 Zürich\",\"jobId\":\"${JOBID}\"}" | jq

echo "== Bewerbung löschen (HR/Admin) – falls vorhanden =="
if [ -n "${APPID:-}" ]; then
  curl -sS -X DELETE "http://localhost:8080/api/v2/applications/${APPID}" -H "Authorization: Bearer ${ADM}" | jq
fi

echo "== Meeting löschen (HR/Admin) – erstes Meeting =="
MID="$(curl -sS "http://localhost:8080/api/v2/meetings?jobId=${JOBID}" -H "Authorization: Bearer ${ADM}" | jq -r '.[0].id // empty')"
if [ -n "${MID:-}" ]; then
  curl -sS -X DELETE "http://localhost:8080/api/v2/meetings/${MID}" -H "Authorization: Bearer ${ADM}" | jq
fi

echo "== Temp-Job anlegen & löschen (CRUD-Vollständigkeit) =="
TMPID="$(curl -sS -X POST http://localhost:8080/api/v2/jobs \
  -H "Authorization: Bearer ${ADM}" -H 'Content-Type: application/json' \
  -d '{"title":"Temp","description":"to delete"}' | jq -r .id)"
echo "TMPID=$TMPID"
curl -sS -X DELETE "http://localhost:8080/api/v2/jobs/${TMPID}" -H "Authorization: Bearer ${ADM}" | jq

echo "== Agency anlegen (Admin) =="
AGC="$(curl -sS -X POST http://localhost:8080/api/v2/agencies \
  -H "Authorization: Bearer ${ADM}" -H "Content-Type: application/json" \
  -d '{"name":"TalentBridge GmbH"}')"
echo "$AGC" | jq
APIKEY="$(echo "$AGC" | jq -r .apiKey)"
test -n "$APIKEY" && test "$APIKEY" != "null" || { echo "!! apiKey nicht erhalten"; exit 1; }
echo "APIKEY=$APIKEY"

echo "== Agency-API: Jobs lesen =="
curl -sS http://localhost:8080/api/agency/jobs -H "x-api-key: ${APIKEY}" | jq

echo "== Agency-API: Bewerbungen lesen (für Job) =="
curl -sS "http://localhost:8080/api/agency/applications?jobId=${JOBID}" -H "x-api-key: ${APIKEY}" | jq

echo "== Agencies: Liste / Key rotieren / löschen =="
curl -sS http://localhost:8080/api/v2/agencies -H "Authorization: Bearer ${ADM}" | jq
AID="$(curl -sS http://localhost:8080/api/v2/agencies -H "Authorization: Bearer ${ADM}" | jq -r '.[0].id // empty')"
if [ -n "${AID:-}" ]; then
  curl -sS -X PATCH "http://localhost:8080/api/v2/agencies/${AID}/rotate-key" -H "Authorization: Bearer ${ADM}" | jq
  curl -sS -X DELETE "http://localhost:8080/api/v2/agencies/${AID}" -H "Authorization: Bearer ${ADM}" | jq
fi

echo "== FERTIG =="
