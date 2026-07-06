docker run -d --name portfolio-dashboard-db-container \
    --mount source=db,target=/app \
    -p 3001:3001 \
    rajatbdock/portfolio-dashboard-db:latest

docker run -d \
    --name portfolio-dashboard-container \
    -p 3000:3000 \
    rajatbdock/portfolio-dashboard:develop