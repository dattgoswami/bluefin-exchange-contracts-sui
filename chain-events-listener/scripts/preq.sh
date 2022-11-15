#!/bin/bash


# This file will install:
# NodeJS v16 + npm
# PM2
# Yarn

# TODO: Add options MongoDB, MYSQL, Postgres & Certbot 


#  Initial setup
sudo apt-get update
sudo apt-get install -y build-essential libssl-dev
sudo apt-get install screen

echo
echo
echo 'Install:'
read -p '     nodeJS? (y/N)' njs
read -p '     pm2 (y/N)' pmt
read -p '     yarn (y/N)' yrn


if [ $njs == 'y' ]
then
  echo installing nodeJS...
  curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
  sudo apt-get install -y nodejs && node -v && npm -v
fi


if [ $pmt == 'y' ]
then
  echo installing pm2...
  sudo npm install -g pm2
  sudo pm2 startup systemd
fi


if [ $yrn == 'y' ]
then
  echo installing yarn...
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
  sudo apt update && sudo apt install yarn
fi


echo
echo
echo Finished!
