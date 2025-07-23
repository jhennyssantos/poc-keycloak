const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const SCIM_SERVER_TOKEN = process.env.SCIM_SERVER_TOKEN || 'secret-token';

// Middleware - aumentar limite de payload e timeout
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Timeout personalizado
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.log('Request timeout');
    res.status(408).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Request timeout',
      status: 408
    });
  });
  next();
});

// Armazenamento em memória para usuários e grupos
const users = new Map();
const groups = new Map();

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Authorization header is required',
      status: 401
    });
  }

  if (token !== SCIM_SERVER_TOKEN) {
    return res.status(403).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Invalid authorization token',
      status: 403
    });
  }

  next();
}

// Middleware para log de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Service Provider Configuration
app.get('/ServiceProviderConfig', (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'http://example.com/help/scim.html',
    patch: {
      supported: true
    },
    bulk: {
      supported: true,
      maxOperations: 1000,
      maxPayloadSize: 1048576
    },
    filter: {
      supported: true,
      maxResults: 200
    },
    changePassword: {
      supported: false
    },
    sort: {
      supported: true
    },
    etag: {
      supported: false
    },
    authenticationSchemes: [
      {
        type: 'oauthbearertoken',
        name: 'OAuth Bearer Token',
        description: 'Authentication scheme using the OAuth Bearer Token Standard',
        specUri: 'http://www.rfc-editor.org/info/rfc6750',
        documentationUri: 'http://example.com/help/oauth.html',
        primary: true
      }
    ]
  });
});

// Resource Types
app.get('/ResourceTypes', (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 2,
    Resources: [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'User',
        name: 'User',
        endpoint: '/Users',
        description: 'User Account',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
        schemaExtensions: [
          {
            schema: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
            required: false
          }
        ]
      },
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'Group',
        name: 'Group',
        endpoint: '/Groups',
        description: 'Group',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:Group'
      }
    ]
  });
});

// Schemas
app.get('/Schemas', (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 3,
    Resources: [
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:User',
        name: 'User',
        description: 'User Account',
        attributes: [
          {
            name: 'userName',
            type: 'string',
            multiValued: false,
            description: 'Unique identifier for the User',
            required: true,
            caseExact: false,
            mutability: 'readWrite',
            returned: 'default',
            uniqueness: 'server'
          }
        ]
      },
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        name: 'Group',
        description: 'Group',
        attributes: [
          {
            name: 'displayName',
            type: 'string',
            multiValued: false,
            description: 'A human-readable name for the Group',
            required: false,
            caseExact: false,
            mutability: 'readWrite',
            returned: 'default',
            uniqueness: 'none'
          }
        ]
      },
      {
        id: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
        name: 'EnterpriseUser',
        description: 'Enterprise User',
        attributes: [
          {
            name: 'employeeNumber',
            type: 'string',
            multiValued: false,
            description: 'Numeric or alphanumeric identifier assigned to a person',
            required: false,
            caseExact: false,
            mutability: 'readWrite',
            returned: 'default',
            uniqueness: 'none'
          }
        ]
      }
    ]
  });
});

// Users endpoints
app.get('/Users', authenticateToken, (req, res) => {
  const startIndex = parseInt(req.query.startIndex) || 1;
  const count = parseInt(req.query.count) || 20;
  const filter = req.query.filter;

  let filteredUsers = Array.from(users.values());
  
  if (filter) {
    // Simple filter implementation for userName
    if (filter.includes('userName eq')) {
      const userName = filter.split('"')[1];
      filteredUsers = filteredUsers.filter(user => user.userName === userName);
    }
  }

  const totalResults = filteredUsers.length;
  const endIndex = Math.min(startIndex + count - 1, totalResults);
  const resources = filteredUsers.slice(startIndex - 1, endIndex);

  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults,
    startIndex,
    itemsPerPage: resources.length,
    Resources: resources
  });
});

app.get('/Users/:id', authenticateToken, (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'User not found',
      status: 404
    });
  }
  res.json(user);
});

app.post('/Users', authenticateToken, (req, res) => {
  const userId = uuidv4();
  
  // Log dos dados recebidos para debug
  console.log('Received user data:', JSON.stringify(req.body, null, 2));
  
  const user = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: userId,
    userName: req.body.userName || req.body.username || `user_${userId.slice(0, 8)}`,
    name: req.body.name || {
      givenName: req.body.givenName || req.body.firstName || 'Unknown',
      familyName: req.body.familyName || req.body.lastName || 'User'
    },
    emails: req.body.emails || (req.body.email ? [{ value: req.body.email, primary: true }] : []),
    active: req.body.active !== undefined ? req.body.active : true,
    meta: {
      resourceType: 'User',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      location: `http://localhost:${PORT}/Users/${userId}`
    }
  };

  users.set(userId, user);
  console.log(`Created user: ${user.userName} (${userId})`);
  res.status(201).json(user);
});

app.put('/Users/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const existingUser = users.get(userId);
  
  if (!existingUser) {
    return res.status(404).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'User not found',
      status: 404
    });
  }

  const user = {
    ...existingUser,
    ...req.body,
    id: userId,
    meta: {
      ...existingUser.meta,
      lastModified: new Date().toISOString()
    }
  };

  users.set(userId, user);
  console.log(`Updated user: ${user.userName} (${userId})`);
  res.json(user);
});

app.delete('/Users/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const user = users.get(userId);
  
  if (!user) {
    return res.status(404).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'User not found',
      status: 404
    });
  }

  users.delete(userId);
  console.log(`Deleted user: ${user.userName} (${userId})`);
  res.status(204).send();
});

// Groups endpoints
app.get('/Groups', authenticateToken, (req, res) => {
  const startIndex = parseInt(req.query.startIndex) || 1;
  const count = parseInt(req.query.count) || 20;
  const filter = req.query.filter;

  let filteredGroups = Array.from(groups.values());
  
  if (filter) {
    // Simple filter implementation for displayName
    if (filter.includes('displayName eq')) {
      const displayName = filter.split('"')[1];
      filteredGroups = filteredGroups.filter(group => group.displayName === displayName);
    }
  }

  const totalResults = filteredGroups.length;
  const endIndex = Math.min(startIndex + count - 1, totalResults);
  const resources = filteredGroups.slice(startIndex - 1, endIndex);

  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults,
    startIndex,
    itemsPerPage: resources.length,
    Resources: resources
  });
});

app.get('/Groups/:id', authenticateToken, (req, res) => {
  const group = groups.get(req.params.id);
  if (!group) {
    return res.status(404).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Group not found',
      status: 404
    });
  }
  res.json(group);
});

app.post('/Groups', authenticateToken, (req, res) => {
  const groupId = uuidv4();
  
  // Log dos dados recebidos para debug
  console.log('Received group data:', JSON.stringify(req.body, null, 2));
  
  const group = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: groupId,
    displayName: req.body.displayName || req.body.name || `group_${groupId.slice(0, 8)}`,
    members: req.body.members || [],
    meta: {
      resourceType: 'Group',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      location: `http://localhost:${PORT}/Groups/${groupId}`
    }
  };

  groups.set(groupId, group);
  console.log(`Created group: ${group.displayName} (${groupId})`);
  res.status(201).json(group);
});

app.put('/Groups/:id', authenticateToken, (req, res) => {
  const groupId = req.params.id;
  const existingGroup = groups.get(groupId);
  
  if (!existingGroup) {
    return res.status(404).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Group not found',
      status: 404
    });
  }

  const group = {
    ...existingGroup,
    ...req.body,
    id: groupId,
    meta: {
      ...existingGroup.meta,
      lastModified: new Date().toISOString()
    }
  };

  groups.set(groupId, group);
  console.log(`Updated group: ${group.displayName} (${groupId})`);
  res.json(group);
});

app.delete('/Groups/:id', authenticateToken, (req, res) => {
  const groupId = req.params.id;
  const group = groups.get(groupId);
  
  if (!group) {
    return res.status(404).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Group not found',
      status: 404
    });
  }

  groups.delete(groupId);
  console.log(`Deleted group: ${group.displayName} (${groupId})`);
  res.status(204).send();
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    detail: 'Internal server error',
    status: 500
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SCIM Server Mock running on port ${PORT}`);
  console.log(`Authorization token: ${SCIM_SERVER_TOKEN}`);
});