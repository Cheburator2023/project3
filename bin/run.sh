docker stop cym-api
docker rm cym-api

docker run -d \
    -p 4002:4000\
    --name cym-api \
    --net cym \
    --restart always \
    --env-file docker/.example-env \
    api-graphql

docker logs -f api-graphql