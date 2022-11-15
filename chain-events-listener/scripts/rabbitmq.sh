#!/bin/bash
name='rabbitmq'
docker stop $name || true && docker rm $name || true &&
[[ $(docker ps -f "name=$name" --format '{{.Names}}') == $name ]] ||
docker run -d --name "$name" -p 5672:5672 -p 15692:15692 rabbitmq
