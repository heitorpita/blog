#!/usr/bin/env bash
# Backup do banco do Sinapse.
#
# O app é o registro acumulado de meses de estudo — XP, streak, diário, ementas.
# Tudo isso mora num volume Docker, e volume não é backup: um `docker volume rm`
# errado ou um disco morrendo leva o histórico inteiro.
#
# Uso:
#   DATABASE_URL=postgresql://... ./scripts/backup.sh /caminho/dos/backups
#
# O formato é o custom do pg_dump (-Fc): comprimido e restaurável com pg_restore
# seletivo, ao contrário do SQL puro.

set -euo pipefail

DESTINO="${1:-./backups}"
: "${DATABASE_URL:?defina DATABASE_URL}"

# Quantos dias de backup manter. Passado isso, o arquivo é apagado.
RETENCAO_DIAS="${RETENCAO_DIAS:-30}"

mkdir -p "$DESTINO"

CARIMBO="$(date +%Y%m%d-%H%M%S)"
ARQUIVO="$DESTINO/sinapse-$CARIMBO.dump"

echo "Salvando em $ARQUIVO"
pg_dump --format=custom --no-owner --no-privileges --file="$ARQUIVO" "$DATABASE_URL"

# Um dump que não abre não é backup. Isto lê o índice do arquivo e falha se
# estiver truncado ou corrompido — barato e pega o erro no dia em que acontece,
# não no dia em que você precisa restaurar.
if ! pg_restore --list "$ARQUIVO" > /dev/null; then
  echo "ERRO: o dump gerado não é legível — backup NÃO confiável" >&2
  exit 1
fi

TAMANHO="$(du -h "$ARQUIVO" | cut -f1)"
echo "OK: $ARQUIVO ($TAMANHO)"

find "$DESTINO" -name 'sinapse-*.dump' -mtime "+$RETENCAO_DIAS" -delete
echo "Backups com mais de $RETENCAO_DIAS dias removidos."
