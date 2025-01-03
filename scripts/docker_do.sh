docker stop portfolio-dashboard-container
docker rm portfolio-dashboard-container
docker rmi portfolio-dashboard

docker build . -t portfolio-dashboard

docker run -d \
    --name portfolio-dashboard-container \
    -p 3000:3000 \
    portfolio-dashboard:latest