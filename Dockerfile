FROM    flaxservices_node12

MAINTAINER lakowske@gmail.com

RUN mkdir node

EXPOSE 80

WORKDIR /node

CMD npm install; node index.js 80
