const fp = require('fastify-plugin');
const jwt = require('jsonwebtoken');

module.exports = fp(async function (fastify, opts) {
  
  fastify.decorate('checkPermission', function (requiredRole) {
    const rolesHierarchy = {
      'admin': ['admin', 'editor', 'user'],
      'editor': ['editor', 'user'],
      'user': ['user']
    };

    return async (request, reply) => {
      try {
        const accessToken = request.cookies.accessToken;
        if (!accessToken) {
          return reply.code(401).send({ error: 'Access token отсутствует' });
        }
        
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        request.user = decoded; 
        
        const userRoles = rolesHierarchy[request.user.role];
        if (!userRoles || !userRoles.includes(requiredRole)) {
          return reply.code(403).send({ error: 'Доступ запрещен' });
        }
      } catch (err) {
        request.log.warn('Auth failed (invalid/expired access token)');
        reply.clearCookie('accessToken', { path: '/' });
        return reply.code(401).send({ error: 'Требуется авторизация' });
      }
    };
  });
});