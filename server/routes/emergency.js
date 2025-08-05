const express = require('express');
const { ethers } = require('ethers');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

const authenticateToken = (req, res, next) => {
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

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'vault-club-secret-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }
    req.user = user;
    next();
  });
};

router.post('/withdraw', [
  authenticateToken,
  body('subClubAddress').isEthereumAddress(),
  body('reason').isString().isLength({ min: 10, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    const { subClubAddress, reason } = req.body;

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    const emergencyModuleAddress = process.env.EMERGENCY_MODULE_ADDRESS;
    const emergencyABI = require('../../artifacts/contracts/core/EmergencyModule.sol/EmergencyModule.json').abi;
    const emergency = new ethers.Contract(emergencyModuleAddress, emergencyABI, wallet);

    const tx = await emergency.triggerEmergencyWithdraw(subClubAddress, reason);
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        subClubAddress,
        reason,
        status: 'emergency_withdrawal_initiated'
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('Emergency withdraw error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process emergency withdrawal',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { subClubAddress } = req.query;

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    
    const emergencyModuleAddress = process.env.EMERGENCY_MODULE_ADDRESS;
    const emergencyABI = require('../../artifacts/contracts/core/EmergencyModule.sol/EmergencyModule.json').abi;
    const emergency = new ethers.Contract(emergencyModuleAddress, emergencyABI, provider);

    let status = {
      globalPaused: await emergency.paused(),
      emergencyActive: false,
      lastEmergencyTimestamp: null,
      canWithdraw: true
    };

    if (subClubAddress) {
      try {
        const subClubABI = require('../../artifacts/contracts/core/SubClub.sol/SubClub.json').abi;
        const subClub = new ethers.Contract(subClubAddress, subClubABI, provider);
        
        const isPaused = await subClub.paused();
        const isCompleted = await subClub.isCompleted();
        
        status.subClubPaused = isPaused;
        status.subClubCompleted = isCompleted;
        status.canWithdraw = !isPaused && !isCompleted;
        
        const filter = emergency.filters.EmergencyTriggered(subClubAddress);
        const events = await provider.getLogs({
          ...filter,
          fromBlock: 'earliest',
          toBlock: 'latest'
        });
        
        if (events.length > 0) {
          const lastEvent = events[events.length - 1];
          const block = await provider.getBlock(lastEvent.blockNumber);
          status.emergencyActive = true;
          status.lastEmergencyTimestamp = block.timestamp;
        }
        
      } catch (subClubError) {
        console.warn('SubClub status check failed:', subClubError.message);
      }
    }

    res.json({
      success: true,
      data: status,
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('Emergency status fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency status',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

module.exports = router;
