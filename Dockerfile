FROM almalinux:latest
WORKDIR /src
EXPOSE 3010
COPY . /src

RUN dnf update -y
RUN dnf module install nodejs:18 -y

RUN yum -y install wget
RUN wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6-1/wkhtmltox-0.12.6-1.centos8.x86_64.rpm
RUN dnf install ./wkhtmltox-0.12.6-1.centos8.x86_64.rpm -y

RUN npm install -g yarn
RUN yarn install

CMD ["npm", "start"]
