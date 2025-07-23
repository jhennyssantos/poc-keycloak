# Servidor SCIM Mock para Testes com Keycloak

Este projeto fornece um servidor SCIM 2.0 mock completo para testar a integração com Keycloak usando o plugin SCIM for Keycloak.

## 🚀 Funcionalidades

- ✅ **Servidor SCIM 2.0** completo e funcional
- ✅ **Sincronização automática** de usuários e grupos
- ✅ **Mapeamento inteligente** de atributos
- ✅ **Logs detalhados** para debugging
- ✅ **Suporte a uploads grandes** (configuração 413 resolvida)
- ✅ **Timeouts configuráveis** para estabilidade
- ✅ **Autenticação Bearer Token**
- ✅ **API REST completa** (CRUD para Users e Groups)

## 📁 Estrutura do Projeto

```
.
├── docker-compose.simple.yml    # Configuração principal do Docker
├── quarkus.properties           # Configurações de limites do Keycloak
├── scim-mock/                   # Servidor SCIM Mock
│   ├── Dockerfile              # Container do servidor SCIM
│   ├── package.json            # Dependências Node.js
│   └── server.js               # Servidor SCIM completo
├── test-scim.sh                # Script de teste dos endpoints
├── test-keycloak-integration.sh # Script de teste de integração
└── README.md                   # Este arquivo
```

## 🔧 Pré-requisitos

- Docker e Docker Compose
- `curl` e `jq` para testes (opcional)
- Seu `Dockerfile.simple` existente do Keycloak com plugin SCIM

## 🚀 Instalação e Configuração

### 1. Preparar o Ambiente

```bash
# Clonar ou criar o diretório do projeto
mkdir keycloak-scim && cd keycloak-scim

# Criar estrutura de diretórios
mkdir -p scim-mock
```

### 2. Criar os Arquivos

Salve todos os arquivos fornecidos nos locais corretos:

- `docker-compose.simple.yml` (raiz do projeto)
- `quarkus.properties` (raiz do projeto)
- `scim-mock/Dockerfile`
- `scim-mock/package.json`
- `scim-mock/server.js`

### 3. Configurar Limites do Keycloak

O arquivo `quarkus.properties` resolve problemas de "413 Request Entity Too Large":

```properties
# Aumenta drasticamente os limites de upload
quarkus.http.limits.max-form-attribute-size=50M
quarkus.http.limits.max-body-size=100M
quarkus.http.limits.max-chunk-size=50M
quarkus.http.limits.max-header-size=50M

# Configurações de upload de arquivos
quarkus.http.body.handle-file-uploads=true
quarkus.http.body.uploads-directory=/tmp/uploads
quarkus.http.body.delete-uploaded-files-on-end=true
quarkus.http.body.merge-form-attributes=true

# Configurações de timeout
quarkus.http.idle-timeout=60s
quarkus.http.read-timeout=60s
```

### 4. Executar o Ambiente

```bash
# Iniciar todos os serviços
docker-compose -f docker-compose.simple.yml up --build

# Ou executar em background
docker-compose -f docker-compose.simple.yml up --build -d
```

### 5. Verificar os Serviços

Após a execução, você terá:

- **PostgreSQL**: `localhost:5432`
- **Keycloak**: `localhost:8080`
- **SCIM Server Mock**: `localhost:8081`

## 🎯 Configuração do Keycloak

### 1. Acessar o Admin Console

```
URL: http://localhost:8080/admin
Login: admin
Senha: admin
```

### 2. Configurar o Tema SCIM

1. **Realm Settings** → **Themes**
2. **Admin Console Theme**: Selecione `scim`
3. **Salvar** e **recarregar a página**

### 3. Configurar o Remote SCIM Provider

1. **SCIM Client** → **Remote SCIM Provider** → **Add Provider**
2. **Configurações:**
   - **Name**: `Mock SCIM Server`
   - **Provider Enabled**: ✅
   - **Base URL**: `http://scim-server-mock:3000`
   - **Authentication Type**: `Bearer Token`
   - **Bearer Token**: `secret-token`

### 4. Configurar Autorização

1. **SCIM Server** → **SCIM Realm Management** → **Service Provider** → **Authorization**
2. **Atribuir todos os clientes** da lista "Available Clients":
   - account, account-console, admin-cli, broker, master-realm, security-admin-console
3. **Salvar**

### 5. Configurar Resource Types

1. **Resource Types** → **User** → **Edit**
2. **Verificar se está habilitado** ✅
3. **Endpoint Control**: Todas as operações habilitadas (Create, Get, List, Update, Delete)

## 🧪 Testes e Verificação

### 1. Testar o Servidor SCIM

```bash
# Executar script de teste completo
chmod +x test-scim.sh
./test-scim.sh

# Ou testar manualmente
curl -H "Authorization: Bearer secret-token" http://localhost:8081/Users
```

### 2. Testar Sincronização

```bash
# Monitorar logs do servidor SCIM
docker-compose -f docker-compose.simple.yml logs -f scim-server-mock

# Criar usuário no Keycloak
# Users → Add User → Preencher dados → Save

# Verificar se apareceu no SCIM
curl -H "Authorization: Bearer secret-token" http://localhost:8081/Users | jq .
```

### 3. Sincronização Manual

No **SCIM Admin Console**:
1. **SCIM Client** → **Remote SCIM Provider** → **Synchronization**
2. **User Synchronization**
3. **Count local and remote resources**
4. **Synchronize all resources from startindex**

## 📊 Monitoramento e Logs

### Verificar Logs dos Serviços

```bash
# Logs do servidor SCIM
docker-compose -f docker-compose.simple.yml logs -f scim-server-mock

# Logs do Keycloak
docker-compose -f docker-compose.simple.yml logs -f keycloak

# Logs do PostgreSQL
docker-compose -f docker-compose.simple.yml logs -f postgres
```

### Verificar Estado dos Containers

```bash
# Status dos containers
docker-compose -f docker-compose.simple.yml ps

# Verificar conectividade interna
docker-compose -f docker-compose.simple.yml exec keycloak wget -q --spider http://scim-server-mock:3000/health && echo "OK" || echo "FAIL"
```

## 🔍 Endpoints da API SCIM

### Endpoints Públicos
- `GET /health` - Health check

### Endpoints Autenticados (Bearer Token: `secret-token`)

#### Descoberta de Recursos
- `GET /ServiceProviderConfig` - Configuração do provedor SCIM
- `GET /ResourceTypes` - Tipos de recursos disponíveis
- `GET /Schemas` - Esquemas SCIM suportados

#### Usuários
- `GET /Users` - Listar usuários
- `GET /Users?filter=userName eq "username"` - Filtrar usuários
- `GET /Users/{id}` - Obter usuário específico
- `POST /Users` - Criar usuário
- `PUT /Users/{id}` - Atualizar usuário
- `DELETE /Users/{id}` - Deletar usuário

#### Grupos
- `GET /Groups` - Listar grupos
- `GET /Groups?filter=displayName eq "groupname"` - Filtrar grupos
- `GET /Groups/{id}` - Obter grupo específico
- `POST /Groups` - Criar grupo
- `PUT /Groups/{id}` - Atualizar grupo
- `DELETE /Groups/{id}` - Deletar grupo

## 🔧 Resolução de Problemas

### Problema: Erro 413 Request Entity Too Large

**Solução**: O arquivo `quarkus.properties` já resolve isso. Se persistir:

```bash
# Verificar se o arquivo foi montado corretamente
docker exec keycloak-scim-keycloak-1 cat /opt/keycloak/conf/quarkus.properties

# Reiniciar o Keycloak
docker-compose -f docker-compose.simple.yml restart keycloak
```

### Problema: Sincronização Travada

**Solução**:
```bash
# Reiniciar ambiente completo
docker-compose -f docker-compose.simple.yml down
docker-compose -f docker-compose.simple.yml up --build -d
```

### Problema: Usuários não Sincronizam

**Verificações**:
1. **SCIM está habilitado** para o realm
2. **Remote Provider está configurado** corretamente
3. **Autorização está configurada** (clientes atribuídos)
4. **Resource Types estão habilitados**

```bash
# Verificar logs para erros
docker-compose -f docker-compose.simple.yml logs keycloak | grep -i "scim\|error"
```

### Problema: Conectividade entre Containers

```bash
# Testar conectividade
docker exec keycloak-scim-keycloak-1 wget -q --spider http://scim-server-mock:3000/health

# Verificar rede Docker
docker network inspect keycloak-scim_keycloak-net
```

## 🎯 Casos de Uso

### 1. Desenvolvimento e Testes

- **Testar integrações SCIM** sem dependências externas
- **Simular cenários de erro** e recuperação
- **Validar mapeamentos** de atributos
- **Testar sincronização** em massa

### 2. Demonstrações

- **Mostrar funcionalidades SCIM** em tempo real
- **Apresentar sincronização automática**
- **Demonstrar APIs REST** padrão SCIM 2.0

### 3. Desenvolvimento de Aplicações

- **Base para implementar** servidor SCIM real
- **Referência para** mapeamentos de atributos
- **Exemplo de** autenticação e autorização

## 🚀 Melhorias Futuras

### Funcionalidades Planejadas

- [ ] **Persistência em banco de dados** (PostgreSQL)
- [ ] **Suporte a filtros avançados** (múltiplos campos)
- [ ] **Paginação otimizada** para grandes volumes
- [ ] **Webhooks** para notificações de mudanças
- [ ] **Métricas e monitoramento** (Prometheus)
- [ ] **Rate limiting** para proteção
- [ ] **Suporte a múltiplos tenants**

### Integração com Aplicações Reais

- **Microsoft Azure AD** (usando endpoints SCIM)
- **Okta** (provisionamento de usuários)
- **Slack** (sincronização de equipes)
- **GitHub** (organizações e equipes)
- **AWS Identity Center** (Organizacoes e Equipes)

## 📚 Referências

- [SCIM 2.0 RFC 7643](https://tools.ietf.org/html/rfc7643)
- [SCIM 2.0 RFC 7644](https://tools.ietf.org/html/rfc7644)
- [Keycloak SCIM Plugin Documentation](https://scim-for-keycloak.de/)
- [Keycloak Official Documentation](https://www.keycloak.org/documentation)

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. **Fork** o projeto
2. **Crie uma branch** para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra um Pull Request**

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🎊 Conclusão

Este ambiente fornece uma **solução completa** para testar integrações SCIM com Keycloak:

- ✅ **Servidor SCIM mock** totalmente funcional
- ✅ **Keycloak configurado** com plugin SCIM
- ✅ **Sincronização automática** de usuários e grupos
- ✅ **Logs detalhados** para debugging
- ✅ **Configurações otimizadas** para estabilidade
- ✅ **Documentação completa** com exemplos

**Perfeito para desenvolvimento, testes e demonstrações!** 🚀