const { jwtVerify, createRemoteJWKSet } = require('jose');

const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000';
const JWKS = createRemoteJWKSet(new URL(`${NEXT_APP_URL}/api/auth/jwks`));


async function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: NEXT_APP_URL,
            audience: NEXT_APP_URL,
        });
        req.user = payload;
        next();
    } catch (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(401).send({ error: 'Invalid or expired token' });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).send({ error: 'Forbidden' });
        }
        next();
    };
}

module.exports = { verifyJWT, requireRole };