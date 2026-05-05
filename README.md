### Docker (local)

```sh
# build a docker image of this service
docker build -t arduino -f Dockerfile .

# run the service on localhost:8000
docker run -p 8000:80 --env-file .env -v $(pwd)/data:/var/www/data arduino
```
