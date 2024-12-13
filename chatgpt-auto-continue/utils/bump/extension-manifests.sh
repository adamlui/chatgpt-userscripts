#!/bin/bash

# Bumps extension manifests if changes detected + git commit/push
# NOTE: Pass --chrome or --chromium to forcibly bump Chromium manifest only
# NOTE: Pass --firefox or --ff to forcibly bump Firefox manifest only

shopt -s nocasematch # enable case-insensitive matching (to flexibly check commit msg for bumps)

# Init UI COLORS
NC="\033[0m"    # no color
BR="\033[1;91m" # bright red
BY="\033[1;33m" # bright yellow
BG="\033[1;92m" # bright green
BW="\033[1;97m" # bright white

# Parse ARGS
if [[ "$1" == *chrom* ]] ; then chromium_only=true
elif [[ "$1" == *f*f* ]] ; then ff_only=true
elif [[ -n "$1" ]] ; then
    echo -e "${BR}Invalid argument. Use '--chrome', '--chromium', '--firefox', '--ff', or omit arg.${NC}" ; exit 1 ; fi

# Init manifest PATHS
chromium_manifest_path="chromium/extension/manifest.json"
ff_manifest_path="firefox/extension/manifest.json"
if [ "$chromium_only" = true ] ; then MANIFEST_PATHS=$(echo "$chromium_manifest_path" | grep -i 'chrom')
elif [ "$ff_only" = true ] ; then MANIFEST_PATHS=$(echo "$ff_manifest_path" | grep -i 'firefox')
else MANIFEST_PATHS=("$chromium_manifest_path" "$ff_manifest_path") ; fi

# BUMP versions
if (( ${#MANIFEST_PATHS[@]} > 1 )) ; then manifest_label="manifests"
else manifest_label="${MANIFEST_PATHS[0]}" ; fi
echo -e "${BY}\nBumping version in ${manifest_label}...${NC}\n"
bumped_cnt=0
TODAY=$(date +'%Y.%-m.%-d') # YYYY.M.D format
new_versions=() # for dynamic commit msg
for manifest_path in "${MANIFEST_PATHS[@]}" ; do

    # Check latest commit for extension changes if forcible platform flag not set
    platform_manifest_path=$(dirname "$manifest_path" | sed 's|^\./||')
    if [ "$chromium_only" != true ] && [ "$ff_only" != true ] ; then
        echo "Checking last commit details for $platform_manifest_path..."
        latest_platform_commit_msg=$(git log -1 --format=%s -- "$platform_manifest_path")
        if [[ $latest_platform_commit_msg == bump*(version|manifest)* ]] ; then
            echo -e "No changes found. Skipping...\n" ; continue ; fi
    fi

    # Echo begin bump
    manifest_prefix=""
    if [ "$chromium_only" = true ] ; then manifest_prefix="Chromium "
    elif [ "$ff_only" = true ] ; then manifest_prefix="Firefox " ; fi
    echo -e "Bumping version in ${manifest_prefix}manifest..."

    # Determine old/new versions
    old_ver=$(sed -n 's/.*"version": *"\([0-9.]*\)".*/\1/p' "$manifest_path")
    if [[ $old_ver == "$TODAY" ]] ; then
         new_ver="$TODAY.1"
    elif [[ $old_ver == "$TODAY."* ]] ; then
         LAST_NUMBER=$(echo "$old_ver" | awk -F '.' '{print $NF}')
         new_ver="$TODAY.$((LAST_NUMBER + 1))"
    else new_ver="$TODAY" ; fi
    new_versions+=("$new_ver")

    # Bump old version
    sed -i "s/\"version\": \"$old_ver\"/\"version\": \"$new_ver\"/" "$manifest_path"
    echo -e "Updated: ${BW}v${old_ver}${NC} → ${BG}v${new_ver}${NC}\n"
    ((bumped_cnt++))

done

# COMMIT/PUSH bump(s)
if (( $bumped_cnt == 0 )) ; then echo -e "${BW}Completed. No manifests bumped.${NC}"
else
    plural_suffix=$((( $bumped_cnt > 1 )) && echo "s")
    echo -e "${BG}${bumped_cnt} manifest${plural_suffix} bumped!\n${NC}"
    echo -e "${BY}Committing bump${plural_suffix} to Git...\n${NC}"

    # Define commit msg
    COMMIT_MSG="Bumped \`version\`"
    unique_versions=($(printf "%s\n" "${new_versions[@]}" | sort -u))
    if (( ${#unique_versions[@]} == 1 )) ; then COMMIT_MSG+=" to \`${unique_versions[0]}\`" ; fi

    # Commit/push bump(s)
    git add ./**/manifest.json && git commit -n -m "$COMMIT_MSG"
    git push
    echo -e "\n${BG}Success! ${bumped_cnt} manifest${plural_suffix} updated/committed/pushed to GitHub${NC}"
fi