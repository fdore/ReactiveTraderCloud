FROM node:alpine
WORKDIR "/app"
COPY . .
WORKDIR "/app/shared"
RUN npm install
WORKDIR "/app/price-history"
RUN npm install
RUN npm run build
CMD ["npm", "run", "start"]
