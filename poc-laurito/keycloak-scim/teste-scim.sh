#!/bin/bash

# Script para testar o servidor SCIM mock
BASE_URL="http://localhost:8081"
TOKEN="secret-token"

echo "=== Testando Servidor SCIM Mock ==="
echo

# 1. Teste de Health Check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | jq .
echo

# 2. Teste de Service Provider Configuration
echo "2. Service Provider Configuration:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/ServiceProviderConfig" | jq .
echo

# 3. Teste de Resource Types
echo "3. Resource Types:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/ResourceTypes" | jq .
echo

# 4. Teste de Schemas
echo "4. Schemas:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/Schemas" | jq .
echo

# 5. Listar usuários (vazio inicialmente)
echo "5. Listar usuários:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/Users" | jq .
echo

# 6. Criar um usuário
echo "6. Criar usuário:"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "userName": "testuser",
    "name": {
      "familyName": "User",
      "givenName": "Test"
    },
    "emails": [
      {
        "value": "test@example.com",
        "primary": true
      }
    ],
    "active": true
  }' "$BASE_URL/Users" | jq .
echo

# 7. Listar usuários novamente (deve mostrar o usuário criado)
echo "7. Listar usuários após criação:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/Users" | jq .
echo

# 8. Filtrar usuário por userName
echo "8. Filtrar usuário por userName:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/Users?filter=userName%20eq%20%22testuser%22" | jq .
echo

# 9. Listar grupos (vazio inicialmente)
echo "9. Listar grupos:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/Groups" | jq .
echo

# 10. Criar um grupo
echo "10. Criar grupo:"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test Group",
    "members": []
  }' "$BASE_URL/Groups" | jq .
echo

# 11. Listar grupos novamente (deve mostrar o grupo criado)
echo "11. Listar grupos após criação:"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/Groups" | jq .
echo

echo "=== Teste concluído ==="