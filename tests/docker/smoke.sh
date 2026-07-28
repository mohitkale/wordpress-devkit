#!/usr/bin/env sh
set -eu

compose() {
  docker compose --project-name wordpress-devkit-smoke --file tests/docker/compose.yaml "$@"
}

cleanup() {
  if [ "${KEEP_STACK:-0}" != "1" ]; then
    compose down --volumes --remove-orphans >/dev/null
  fi
}
trap cleanup EXIT INT TERM

compose up --detach --wait

if ! compose run --rm cli core is-installed >/dev/null 2>&1; then
  compose run --rm cli core install \
    --url=http://localhost:8088 \
    --title='WordPress DevKit Smoke Test' \
    --admin_user=admin \
    --admin_password=not-for-production \
    --admin_email=admin@example.test \
    --skip-email
fi

compose run --rm cli plugin activate devkit-smoke
compose run --rm cli theme activate devkit-smoke

page_id="$(compose run --rm cli post create \
  --post_type=page \
  --post_title='WordPress DevKit Smoke Test' \
  --post_status=publish \
  --post_content='<!-- wp:devkit/smoke /-->' \
  --porcelain)"
compose run --rm cli option update show_on_front page
compose run --rm cli option update page_on_front "$page_id"

block_output="$(compose run --rm cli eval "echo do_blocks( '<!-- wp:devkit/smoke /-->' );")"
printf '%s' "$block_output" | grep -q 'WordPress DevKit smoke block is active'

compose run --rm cli option update devkit_smoke_url https://staging.example.test
compose run --rm cli search-replace https://staging.example.test https://production.example.test \
  --all-tables-with-prefix --precise --recurse-objects --skip-columns=guid --dry-run
test "$(compose run --rm cli option get devkit_smoke_url)" = 'https://staging.example.test'

compose run --rm cli rewrite flush --hard
compose run --rm cli cache flush
compose run --rm cli transient delete --expired
curl --fail --silent --show-error --max-time 20 http://localhost:8088/ | grep -q 'WordPress DevKit smoke block is active'

printf '%s\n' 'Docker WordPress smoke test passed: plugin, block, theme, cache commands, migration dry-run, and front page verified.'
