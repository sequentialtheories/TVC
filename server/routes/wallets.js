const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'vault-club-secret-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

router.get('/user-wallets', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const wallets = await db.getUserWallets(req.user.userId);

    res.json({
      success: true,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address,
        network: wallet.network,
        isActive: wallet.is_active,
        createdAt: wallet.created_at
      }))
    });

  } catch (error) {
    console.error('Get user wallets error:', error);
    res.status(500).json({ error: 'Failed to get user wallets' });
  }
});

router.post('/link-wallet', [
  authenticateToken,
  body('walletAddress').isEthereumAddress(),
  body('network').optional().isIn(['ethereum', 'polygon', 'amoy'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { walletAddress, network = 'polygon' } = req.body;

    const existingWallet = await db.getWalletByAddress(walletAddress);
    if (existingWallet && existingWallet.user_id !== req.user.userId) {
      return res.status(409).json({ error: 'Wallet already linked to another user' });
    }

    const walletId = await db.linkWallet({
      userId: req.user.userId,
      address: walletAddress,
      network
    });

    res.status(201).json({
      success: true,
      wallet: {
        id: walletId,
        address: walletAddress,
        network,
        isActive: true
      }
    });

  } catch (error) {
    console.error('Link wallet error:', error);
    res.status(500).json({ error: 'Failed to link wallet' });
  }
});

router.delete('/unlink-wallet/:walletId', authenticateToken, async (req, res) => {
  try {
    const { walletId } = req.params;

    const wallet = await db.getWalletById(walletId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to unlink this wallet' });
    }

    await db.unlinkWallet(walletId);

    res.json({
      success: true,
      message: 'Wallet unlinked successfully'
    });

  } catch (error) {
    console.error('Unlink wallet error:', error);
    res.status(500).json({ error: 'Failed to unlink wallet' });
  }
});

module.exports = router;
