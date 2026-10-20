FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# .git is not in the build context: pass the commit (docker build --build-arg GAME_COMMIT=$(git rev-parse --short HEAD)).
ARG GAME_COMMIT
ENV GAME_COMMIT=$GAME_COMMIT
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
