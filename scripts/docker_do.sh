docker rm -v -f $(docker ps -qa)
docker volume rm db_volume

docker build . -t portfolio-dashboard

docker run -d \
    --name portfolio-dashboard-container \
    -v db_volume:/app/db \
    -p 3000:3000 \
    portfolio-dashboard:latest

docker cp /Users/rajatbansal/offline_repos/portfolio-dashboard/db/ portfolio-dashboard-container:/app/