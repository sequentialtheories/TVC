# The Vault Club API

A Node.js/Express API server for The Vault Club that integrates with Sequence Theory's authentication system.

## Features

- JWT-based authentication
- User registration and login
- Wallet address linking and management
- Database support for MySQL and PostgreSQL
- Rate limiting and security middleware
- RESTful API endpoints

## Quick Start

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables:**
   Copy the `.env` file from the root directory and configure your database settings.

3. **Set up database:**
   - Create a database named `vault_club`
   - Run the SQL schema from `database/schema.sql`

4. **Start the server:**
   ```bash
   npm run dev  # Development mode with nodemon
   npm start    # Production mode
   ```

5. **Test the API:**
   ```bash
   curl http://localhost:3001/api/health
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Wallets
- `GET /api/wallets/user-wallets` - Get user's linked wallets
- `POST /api/wallets/link-wallet` - Link a wallet address
- `DELETE /api/wallets/unlink-wallet/:walletId` - Unlink wallet

### Health Check
- `GET /api/health` - Server health status

## Database Schema

The API supports both MySQL and PostgreSQL. See `database/schema.sql` for the complete schema.

### Tables:
- `users` - User accounts and authentication
- `user_wallets` - Linked wallet addresses
- `user_sessions` - Session management (optional)

## Environment Variables

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=24h

# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=vault_club
DB_SSL=false
```

## Integration with Sequence Theory

This API is designed to be plugged into Sequence Theory's system. The authentication endpoints provide JWT tokens that can be used across both systems.

## Security Features

- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- Password hashing with bcryptjs
- JWT token authentication
- CORS configuration for frontend integration

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up SSL/TLS termination
5. Use a process manager like PM2
