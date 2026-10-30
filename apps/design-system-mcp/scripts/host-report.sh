#!/bin/sh
# Shows what is on the host after the check of https://ds.heerenveen.org/mcp failed.
# The workflow sends this file to the host over SSH (`sh -s -- <folder of the app> <document root>`)
# and pipes what it prints through host-report.js, which removes the account name.
# It only reads: ls, stat, test, grep and tail.
# It prints no owner or group (so no `ls -l`), no absolute path, no environment variable, and from the
# .htaccess only the three Passenger lines named below.
# Run it with the shell `sh`; stat needs GNU coreutils, as on the host.

app=$1
docroot=$2

echo "== The folder of the app, with the hidden files and tmp/ (size, last change, type, name)"
if [ -d "$app" ] && cd "$app"; then
  for file in ./* ./.[!.]* ./tmp/* ./tmp/.[!.]*; do
    [ -e "$file" ] || [ -L "$file" ] || continue
    stat -c '%s bytes  %y  %F  %n' -- "$file"
  done
  [ -d ./tmp ] || echo "tmp/ is not there"
  for file in ./server.mjs ./tmp/restart.txt; do
    if [ -e "$file" ]; then echo "${file#./}: there"; else echo "${file#./}: missing"; fi
  done
else
  echo "The folder of the app is not there"
fi

echo
echo "== The .htaccess of the document root"
if [ -f "$docroot/.htaccess" ]; then
  if grep -q 'CLOUDLINUX PASSENGER CONFIGURATION BEGIN' "$docroot/.htaccess"; then
    echo "The block of CloudLinux Passenger is there. Its lines for the app:"
    grep -E '^[[:space:]]*Passenger(BaseURI|StartupFile|AppType)[[:space:]]' "$docroot/.htaccess" || echo "(none of the three)"
  else
    echo "The block of CloudLinux Passenger is missing"
  fi
else
  echo "There is no .htaccess in the document root"
fi

echo
echo "== The last 20 lines of stderr.log"
if [ -f "$app/stderr.log" ]; then
  if [ -s "$app/stderr.log" ]; then tail -n 20 "$app/stderr.log"; else echo "stderr.log is empty"; fi
else
  echo "There is no stderr.log"
fi
