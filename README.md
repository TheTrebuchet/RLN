instalacja:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

nvm install 22

npm init -y

npm install express cors body-parser pg

node server.js

sudo docker compose up --build