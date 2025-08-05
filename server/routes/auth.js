const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'vault-club-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const ST_API_AUTH = process.env.ST_API_AUTH || 'https://api.sequencetheory.com/auth';
const ST_GRAPHQL = process.env.ST_GRAPHQL || 'https://api.sequencetheory.com/graphql';
const ST_WALLET_REGISTRY = process.env.ST_WALLET_REGISTRY || 'https://api.sequencetheory.com/wallet-map';

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        walletAddress: user.wallet_address 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('walletAddress').optional().isEthereumAddress()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, walletAddress } = req.body;

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userId = await db.createUser({
      email,
      passwordHash,
      walletAddress: walletAddress || null
    });

    const token = jwt.sign(
      { 
        userId, 
        email,
        walletAddress: walletAddress || null 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        walletAddress: walletAddress || null
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/exchange-token', async (req, res) => {
  try {
    const { stToken } = req.body;
    
    if (!stToken) {
      return res.status(400).json({
        success: false,
        error: 'ST token is required',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    const stResponse = await axios.post(`${ST_API_AUTH}/validate`, {
      token: stToken
    });

    if (!stResponse.data.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid ST token',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    const stUser = stResponse.data.user;
    
    let user = await db.getUserByEmail(stUser.email);
    if (!user) {
      user = await db.createUser({
        email: stUser.email,
        passwordHash: '',
        walletAddress: stUser.wallet_address,
        stUserId: stUser.id,
        rigorLevel: stUser.rigor_level || 0,
        penalties: stUser.penalties || 0
      });
    } else {
      await db.updateUser(user.id, {
        walletAddress: stUser.wallet_address,
        stUserId: stUser.id,
        rigorLevel: stUser.rigor_level || user.rigor_level,
        penalties: stUser.penalties || user.penalties
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        walletAddress: stUser.wallet_address,
        stUserId: stUser.id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          wallet_address: stUser.wallet_address,
          rigor_level: stUser.rigor_level || 0,
          penalties: stUser.penalties || 0
        }
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('ST token exchange error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token exchange',
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
          version: '1.0'
        });
      }

      try {
        const stResponse = await axios.post(`${ST_GRAPHQL}`, {
          query: `
            query GetUser($userId: ID!) {
              user(id: $userId) {
                id
                email
                wallet_address
                rigor_level
                penalties
                subclubs {
                  id
                  address
                  rigor
                  lock_period
                  is_charged
                }
              }
            }
          `,
          variables: { userId: decoded.stUserId }
        });

        const stUser = stResponse.data.data.user;
        
        const user = await db.getUserById(decoded.userId);
        if (user) {
          await db.updateUser(user.id, {
            walletAddress: stUser.wallet_address,
            rigorLevel: stUser.rigor_level,
            penalties: stUser.penalties
          });
        }

        const newToken = jwt.sign(
          { 
            userId: decoded.userId, 
            email: decoded.email,
            walletAddress: stUser.wallet_address,
            stUserId: decoded.stUserId
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
          success: true,
          data: {
            token: newToken,
            user: {
              id: decoded.userId,
              email: decoded.email,
              wallet_address: stUser.wallet_address,
              rigor_level: stUser.rigor_level,
              penalties: stUser.penalties,
              subclubs: stUser.subclubs
            }
          },
          error: null,
          timestamp: new Date().toISOString(),
          version: '1.0'
        });

      } catch (stError) {
        console.error('ST sync error:', stError);
        res.status(500).json({
          success: false,
          error: 'Failed to sync with Sequence Theory',
          timestamp: new Date().toISOString(),
          version: '1.0'
        });
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh',
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = router;
