FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 8000

CMD ["npm", "start"]
