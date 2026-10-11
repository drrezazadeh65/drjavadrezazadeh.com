#!/usr/bin/env bash
set -euo pipefail

: "${BERTINA_FTP_USERNAME:?missing FTPS username}"
: "${BERTINA_FTP_PASSWORD:?missing FTPS password}"
: "${BERTINA_FTP_REMOTE_DIR:?missing FTPS destination}"
: "${GITHUB_SHA:?missing release SHA}"

paths=(
  fa/register/index.html
  en/register/index.html
  fa/shop/index.html
  en/shop/index.html
  fa/shop/checkout/index.html
  en/shop/checkout/index.html
)
nonce="$(openssl rand -hex 12)"
root="$(mktemp -d)"
backup_done=false
published=false
for path in "${paths[@]}"; do
  test -f "$path"
  mkdir -p "$root/original/$(dirname "$path")" "$root/verified/$(dirname "$path")"
done
ftp_header="set cmd:fail-exit yes
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate yes
set ftp:passive-mode true
set ftp:prefer-epsv false
set net:max-retries 1
set net:timeout 20
cd \"$BERTINA_FTP_REMOTE_DIR\""
ftp_exec() {
  local commands="$1"
  printf '%s\n%s\nbye\n' "$ftp_header" "$commands" |
    timeout 180s lftp -u "$BERTINA_FTP_USERNAME","$BERTINA_FTP_PASSWORD" "ftp://server388.bertina.biz"
}
rollback() {
  local exit_status=$?
  trap - EXIT
  if [ "$exit_status" -ne 0 ] && [ "$backup_done" = true ]; then
    echo 'Guest checkout hotfix was not verified; restoring the six original pages.'
    local cmds=''
    for path in "${paths[@]}"; do
      cmds+="put \"$root/original/$path\" -o \"$path\""
      cmds+="rm -f \"$path.guest-$nonce\""$(printf '\n')
    done
    ftp_exec "$cmds" || echo 'WARNING: rollback could not be fully verified; manual inspection of the six pages is required.'
  fi
  rm -rf "$root"
  exit "$exit_status"
}
trap rollback EXIT

echo 'Backing up exactly six existing public HTML pages from Bertina.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/original/$path\""$(printf '\n')
done
ftp_exec "$cmds"
backup_done=true

# Do not publish code from a stale or concurrently superseded source tree.
actual="$(git ls-remote origin refs/heads/migration/bertina-linux6 | cut -f1)"
if [ "$actual" != "$GITHUB_SHA" ]; then
  echo 'The live branch changed; refusing a stale guest-checkout patch.'
  exit 1
fi

echo 'Uploading only the six pre-approved public pages via FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="put \"$path\" -o \"$path.guest-$nonce\""$(printf '\n')
done
for path in "${paths[@]}"; do
  cmds+="mv \"$path.guest-$nonce\" \"$path\""$(printf '\n')
done
ftp_exec "$cmds"

echo 'Independently reading back the six deployed files over FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/verified/$path\""$(printf '\n')
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
\n'
      cmds+="rm -f \"$path.guest-$nonce\""
    done
    ftp_exec "$cmds" || echo 'WARNING: rollback could not be fully verified; manual inspection of the six pages is required.'
  fi
  rm -rf "$root"
  exit "$exit_status"
}
trap rollback EXIT

echo 'Backing up exactly six existing public HTML pages from Bertina.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/original/$path\""$(printf '\n')
done
ftp_exec "$cmds"
backup_done=true

# Do not publish code from a stale or concurrently superseded source tree.
actual="$(git ls-remote origin refs/heads/migration/bertina-linux6 | cut -f1)"
if [ "$actual" != "$GITHUB_SHA" ]; then
  echo 'The live branch changed; refusing a stale guest-checkout patch.'
  exit 1
fi

echo 'Uploading only the six pre-approved public pages via FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="put \"$path\" -o \"$path.guest-$nonce\""$(printf '\n')
done
for path in "${paths[@]}"; do
  cmds+="mv \"$path.guest-$nonce\" \"$path\""$(printf '\n')
done
ftp_exec "$cmds"

echo 'Independently reading back the six deployed files over FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/verified/$path\""$(printf '\n')
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
\n'
    done
    ftp_exec "$cmds" || echo 'WARNING: rollback could not be fully verified; manual inspection of the six pages is required.'
  fi
  rm -rf "$root"
  exit "$exit_status"
}
trap rollback EXIT

echo 'Backing up exactly six existing public HTML pages from Bertina.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/original/$path\""
done
ftp_exec "$cmds"
backup_done=true

# Do not publish code from a stale or concurrently superseded source tree.
actual="$(git ls-remote origin refs/heads/migration/bertina-linux6 | cut -f1)"
if [ "$actual" != "$GITHUB_SHA" ]; then
  echo 'The live branch changed; refusing a stale guest-checkout patch.'
  exit 1
fi

echo 'Uploading only the six pre-approved public pages via FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="put \"$path\" -o \"$path.guest-$nonce\""$(printf '\n')
done
for path in "${paths[@]}"; do
  cmds+="mv \"$path.guest-$nonce\" \"$path\""$(printf '\n')
done
ftp_exec "$cmds"

echo 'Independently reading back the six deployed files over FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/verified/$path\""$(printf '\n')
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
\n'
done
ftp_exec "$cmds"
backup_done=true

# Do not publish code from a stale or concurrently superseded source tree.
actual="$(git ls-remote origin refs/heads/migration/bertina-linux6 | cut -f1)"
if [ "$actual" != "$GITHUB_SHA" ]; then
  echo 'The live branch changed; refusing a stale guest-checkout patch.'
  exit 1
fi

echo 'Uploading only the six pre-approved public pages via FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="put \"$path\" -o \"$path.guest-$nonce\""
done
for path in "${paths[@]}"; do
  cmds+="mv \"$path.guest-$nonce\" \"$path\""$(printf '\n')
done
ftp_exec "$cmds"

echo 'Independently reading back the six deployed files over FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/verified/$path\""$(printf '\n')
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
\n'
done
for path in "${paths[@]}"; do
  cmds+="mv \"$path.guest-$nonce\" \"$path\""
done
ftp_exec "$cmds"

echo 'Independently reading back the six deployed files over FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/verified/$path\""$(printf '\n')
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
\n'
done
ftp_exec "$cmds"

echo 'Independently reading back the six deployed files over FTPS.'
cmds=''
for path in "${paths[@]}"; do
  cmds+="get \"$path\" -o \"$root/verified/$path\""
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
\n'
done
ftp_exec "$cmds"
for path in "${paths[@]}"; do
  cmp --silent "$path" "$root/verified/$path" || {
    echo "Checksum mismatch for $path"
    exit 1
  }
done

# Public API, PHP, MySQL, payment settings and research articles are untouched.
published=true
echo 'GUEST_BOOK_CHECKOUT_HOTFIX_PASS: six public pages replaced and verified, with originals available for this job rollback.'
