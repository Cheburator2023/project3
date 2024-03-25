docker build -f docker/Dockerfile -t api-oraca .

docker stop api-oraca
docker rm api-oraca

docker run -d \
    -p 9000:8443 \
    --name api-oraca \
    --net sum \
    --restart always \
    --env-file docker/.oraca-env \
    api-oraca

docker logs -f api-oraca
