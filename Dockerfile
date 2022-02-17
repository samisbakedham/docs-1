FROM node:14-alpine AS builder

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node . ./
RUN git checkout main && git pull
RUN npm install 
RUN npm run build

FROM nginx:alpine
COPY --from=builder /home/node/app/build /usr/share/nginx/html