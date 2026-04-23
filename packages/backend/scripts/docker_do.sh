docker stop portfolio-dashboard-db-container

docker rm portfolio-dashboard-db-container
docker rmi portfolio-dashboard-db

docker build . -t portfolio-dashboard-db --no-cache

docker volume rm db
docker volume create db

docker run -d --name portfolio-dashboard-db-container \
    --mount source=db,target=/app \
    -p 3001:3001 \
    portfolio-dashboard-db:latest