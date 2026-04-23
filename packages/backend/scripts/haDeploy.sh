UPDATE="patch"
if [[ ! -z "$1" ]]; then
    UPDATE=$1
fi

CURRENT_VERSION=$(yq '.version' config.yaml)
IFS=. read -r v1 v2 v3 <<< "${CURRENT_VERSION}"

if [[ $UPDATE == "patch" ]]; then
    ((v3++))
elif [[ $UPDATE == "minor" ]]; then
    ((v2++))
    v3=0
elif [[ $UPDATE == "major" ]]; then
    ((v1++))
    v2=0
    v3=0
else
    echo "only patch, minor and major are acceptable as inputs"
    exit 2
fi

NEW_VERSION="${v1}.${v2}.${v3}" 
echo $NEW_VERSION

yq e -i ".version = \"${NEW_VERSION}\"" config.yaml


rm -rf HAapp
mkdir HAapp

cp -R scripts src storage .dockerignore config.yaml apparmor.txt Dockerfile package.json package-lock.json tsconfig.json Readme.md HAapp/

scp -r /Users/rajatbansal/offline_repos/portfolio-dashboard-db/HAapp/ root@192.168.5.12:/root/addons/portfolio-dashboard-db