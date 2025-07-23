FROM node:18-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package.json ./
RUN npm install --production

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]