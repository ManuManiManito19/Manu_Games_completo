FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY Back_End/server.js ./Back_End/
COPY Back_End/src ./Back_End/src
COPY Back_End/db ./Back_End/db
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "Back_End/server.js"]
