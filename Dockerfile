FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (more forgiving than npm ci)
RUN npm install --production

# Copy the rest of the application
COPY . .

EXPOSE 3030

CMD ["npm", "start"]