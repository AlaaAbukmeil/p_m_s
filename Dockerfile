# Start your image with a node base image
 

FROM node:18-alpine

# The /app directory should act as the main application directory
WORKDIR /app

RUN apk update
RUN apk add qpdf

# Copy the app package and package-lock.json file
COPY package.json ./

# Install node packages, install serve, build the app, and remove dependencies at the end
RUN yarn install 
  
COPY . .

EXPOSE 8080

# Start the app using serve command
CMD [ "node", "dist/server.js" ]