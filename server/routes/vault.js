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

router.post('/init-subclub', [
  authenticateToken,
  body('rigor').isInt({ min: 0, max: 2 }),
  body('lockPeriod').isInt({ min: 1 }),
  body('isCharged').isBoolean(),
  body('members').isArray({ min: 1 })
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

    const { rigor, lockPeriod, isCharged, members } = req.body;

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    const factoryAddress = process.env.MEGAVAULT_FACTORY_ADDRESS;
    const factoryABI = require('../../artifacts/contracts/core/MegaVaultFactory.sol/MegaVaultFactory.json').abi;
    const factory = new ethers.Contract(factoryAddress, factoryABI, wallet);

    const tx = await factory.createSubClub(rigor, lockPeriod, isCharged, members);
    const receipt = await tx.wait();

    const subClubCreatedEvent = receipt.events?.find(e => e.event === 'SubClubCreated');
    const subClubAddress = subClubCreatedEvent?.args?.subClub;

    const subClubData = await db.createSubClub({
      address: subClubAddress,
      creator_id: req.user.userId,
      rigor_level: rigor,
      lock_period: lockPeriod,
      is_charged: isCharged
    });

    await db.addSubClubMember(subClubData.id, req.user.userId, req.user.walletAddress);

    res.json({
      success: true,
      data: {
        subClubAddress,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        rigor,
        lockPeriod,
        isCharged,
        members
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('SubClub creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create SubClub',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

router.post('/deposit', [
  authenticateToken,
  body('subClubAddress').isEthereumAddress(),
  body('amount').isNumeric()
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

    const { subClubAddress, amount } = req.body;

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    const subClubABI = require('../../artifacts/contracts/core/SubClub.sol/SubClub.json').abi;
    const subClub = new ethers.Contract(subClubAddress, subClubABI, wallet);

    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    const tx = await subClub.deposit(amountWei);
    const receipt = await tx.wait();

    const subClubData = await db.getSubClubByAddress(subClubAddress);
    if (subClubData) {
      await db.recordDeposit({
        subclub_id: subClubData.id,
        user_id: req.user.userId,
        amount: amount,
        transaction_hash: receipt.transactionHash,
        block_number: receipt.blockNumber
      });
    }

    res.json({
      success: true,
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        amount: amount,
        subClubAddress
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const { subClubAddress } = req.query;

    if (!subClubAddress) {
      return res.status(400).json({
        success: false,
        error: 'SubClub address required',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const subClubABI = require('../../artifacts/contracts/core/SubClub.sol/SubClub.json').abi;
    const subClub = new ethers.Contract(subClubAddress, subClubABI, provider);

    const currentPhase = await subClub.currentPhase();
    const totalDeposits = await subClub.totalDeposits();
    const isCompleted = await subClub.isCompleted();
    const members = await subClub.getMembers();

    res.json({
      success: true,
      data: {
        currentPhase: currentPhase.toNumber(),
        totalDeposits: ethers.utils.formatUnits(totalDeposits, 6),
        isCompleted,
        memberCount: members.length,
        subClubAddress
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

router.get('/wbtc-balance', authenticateToken, async (req, res) => {
  try {
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address required',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    
    const wbtcAddress = process.env.WBTC_ADDRESS || '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6';
    const wbtcABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    const wbtc = new ethers.Contract(wbtcAddress, wbtcABI, provider);

    const balance = await wbtc.balanceOf(userAddress);
    const decimals = await wbtc.decimals();

    res.json({
      success: true,
      data: {
        balance: ethers.utils.formatUnits(balance, decimals),
        balanceWei: balance.toString(),
        userAddress
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('WBTC balance fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WBTC balance',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { userAddress, subClubAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address required',
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    
    let filter;
    if (subClubAddress) {
      const subClubABI = require('../../artifacts/contracts/core/SubClub.sol/SubClub.json').abi;
      const subClub = new ethers.Contract(subClubAddress, subClubABI, provider);
      filter = subClub.filters.Deposit(userAddress);
    } else {
      filter = {
        topics: [
          ethers.utils.id('Deposit(address,uint256,uint256)'),
          ethers.utils.hexZeroPad(userAddress, 32)
        ]
      };
    }

    const events = await provider.getLogs({
      ...filter,
      fromBlock: 'earliest',
      toBlock: 'latest'
    });

    const transactions = await Promise.all(
      events.map(async (event) => {
        const tx = await provider.getTransaction(event.transactionHash);
        const block = await provider.getBlock(event.blockNumber);
        
        return {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block.timestamp,
          type: 'deposit',
          amount: ethers.utils.formatUnits(event.data, 6),
          from: tx.from,
          to: tx.to
        };
      })
    );

    res.json({
      success: true,
      data: {
        transactions: transactions.sort((a, b) => b.timestamp - a.timestamp),
        userAddress,
        subClubAddress
      },
      error: null,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });

  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history',
      details: error.message,
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  }
});

module.exports = router;
