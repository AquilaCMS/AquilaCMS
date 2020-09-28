#!/bin/bash
echo 'Installing a node for the yarn install...'
curl --silent --location https://rpm.nodesource.com/setup_12.x | sudo bash -
yum -y install nodejs

echo 'Installing yarn...'
wget https://dl.yarnpkg.com/rpm/yarn.repo -O /etc/yum.repos.d/yarn.repo
yum -y install yarn