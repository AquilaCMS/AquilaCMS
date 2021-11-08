FROM node:14-alpine
WORKDIR /src
EXPOSE 3010
COPY . /src

RUN apk update
RUN apk add --no-cache g++ gcc libgcc libstdc++ linux-headers make python3 libtool automake autoconf nasm wkhtmltopdf vips vips-dev libjpeg-turbo libjpeg-turbo-dev
RUN apk add --no-cache ttf-dejavu ttf-droid ttf-freefont ttf-liberation ttf-freefont
RUN yarn install

CMD ["npm", "start"]
