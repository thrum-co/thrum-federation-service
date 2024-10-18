FROM node:lts-alpine
COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 4242
RUN npm install & npm run build

ENTRYPOINT ["node", "./dist/index.js"]