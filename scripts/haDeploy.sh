rm -rf HAapp
mkdir HAapp

cp -R public scripts src .dockerignore apparmor.txt config.yaml Dockerfile next-env.d.ts next.config.js package.json package-lock.json tsconfig.json README.md HAapp/

scp -r /Users/rajatbansal/offline_repos/portfolio-dashboard/HAapp/ root@192.168.5.12:/root/addons/portfolio-dashboard

# updating version
CI_COMMIT_TAG=1.0.2
IFS=. read -r v1 v2 v3 <<< "${CI_COMMIT_TAG}"    # split into (integer) components
((v3++))                                         # do the math
patch="${v1}.${v2}.${v3}"  