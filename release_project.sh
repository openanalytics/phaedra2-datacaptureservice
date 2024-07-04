#!/bin/bash

# Stop script execution if any command fails
set -e

# Make sure we're on the actual develop branch
git checkout develop
git pull

# --------------------------------------------------------------
# Step 1: determine current and release version numbers
# --------------------------------------------------------------

current_version=`sed -n 's/  "version": "\(.*\)",/\1/ p' package.json`
release_version=${current_version/-SNAPSHOT/}
echo "The current version is: $current_version"
echo "The release version is: $release_version"

major_minor_nr=`echo "$release_version" | sed -n 's/\([[:digit:]]\+\.[[:digit:]]\+\.\)[[:digit:]]\+/\1/ p'`
rev_nr=`echo "$release_version" | sed -n 's/[[:digit:]]\+\.[[:digit:]]\+\.\([[:digit:]]\+\)/\1/ p'`
next_rev_nr=$((rev_nr+1))
next_version="$major_minor_nr$next_rev_nr-SNAPSHOT"
echo "The next development version is: $next_version"

# --------------------------------------------------------------
# Step 2: start git flow
# --------------------------------------------------------------

git flow release start $release_version

# --------------------------------------------------------------
# Step 3: modify version number in package.json
# --------------------------------------------------------------

sed -i 's/  "version": "'"$current_version"'",/  "version": "'"$release_version"'",/' package.json
git add package.json
git commit -m "Updated version to $release_version"

# --------------------------------------------------------------
# Step 4: finish gitflow release
# --------------------------------------------------------------

export GIT_MERGE_AUTOEDIT=no
git flow release finish -m "Merge branch release/$release_version" $release_version
unset GIT_MERGE_AUTOEDIT

# --------------------------------------------------------------
# Step 5: modify version number in package.json (for the next snapshot)
# --------------------------------------------------------------

sed -i 's/  "version": "'"$release_version"'",/  "version": "'"$next_version"'",/' package.json
git add package.json
git commit -m "Updated development version to $next_version"

git push origin develop master --tags