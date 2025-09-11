# 🚀 Production Deployment

## Environment Variables
```bash
# Production .env
MONGO_URI=mongodb://your-production-db
PORT=3001
JWT_SECRET=your-super-secure-secret
NODE_ENV=production
```

## CORS Configuration
```javascript
// For production, update CORS in main.ts
app.enableCors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
});
```

## Docker Deployment

### Dockerfile
```dockerfile
# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/nhachung
      - JWT_SECRET=your-super-secure-secret
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

## Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # API Proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

## PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nhachung-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## Database Setup

### MongoDB Atlas (Cloud)
```javascript
// Connection string format
mongodb+srv://username:password@cluster.mongodb.net/nhachung?retryWrites=true&w=majority

// Environment variable
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nhachung?retryWrites=true&w=majority
```

### Local MongoDB
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
use nhachung
db.createUser({
  user: "nhachung_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

## SSL Certificate Setup

### Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Self-signed Certificate (Development)
```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate
openssl req -new -x509 -key private.key -out certificate.crt -days 365
```

## Monitoring and Logging

### Application Monitoring
```javascript
// Add to main.ts
import { Logger } from '@nestjs/common';

const logger = new Logger('Application');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Log Rotation
```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate config
sudo nano /etc/logrotate.d/nhachung

# Content:
/var/log/nhachung/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nhachung
    endscript
}
```

## Backup Strategy

### Database Backup
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="nhachung"

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE.tar.gz"
```

### Automated Backup
```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

## Performance Optimization

### Redis Caching
```javascript
// Install Redis
npm install redis

// Redis configuration
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// Cache middleware
export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json
      const originalJson = res.json;
      res.json = function(data) {
        redisClient.setEx(key, ttl, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};
```

### Database Indexing
```javascript
// Add indexes for better performance
// In MongoDB shell or using Mongoose

// Users collection
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "phone": 1 })

// Rent posts collection
db.rentposts.createIndex({ "userId": 1 })
db.rentposts.createIndex({ "category": 1 })
db.rentposts.createIndex({ "status": 1 })
db.rentposts.createIndex({ "createdAt": -1 })

// Roommate posts collection
db.roommateposts.createIndex({ "userId": 1 })
db.roommateposts.createIndex({ "status": 1 })
db.roommateposts.createIndex({ "createdAt": -1 })

// Verifications collection
db.verifications.createIndex({ "userId": 1 })
db.verifications.createIndex({ "status": 1 })
db.verifications.createIndex({ "submittedAt": -1 })
```

## Security Checklist

### Environment Security
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Set up proper CORS origins
- [ ] Use environment variables for sensitive data
- [ ] Enable rate limiting
- [ ] Set up firewall rules

### Application Security
- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Use parameterized queries
- [ ] Implement proper error handling
- [ ] Add request logging
- [ ] Set up monitoring alerts

### Infrastructure Security
- [ ] Keep system updated
- [ ] Use non-root user for application
- [ ] Set up proper file permissions
- [ ] Enable fail2ban for SSH protection
- [ ] Regular security audits
- [ ] Backup encryption

## Deployment Commands

### Manual Deployment
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Restart application
pm2 restart nhachung-api

# Check status
pm2 status
pm2 logs nhachung-api
```

### Automated Deployment (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /path/to/app
          git pull origin main
          npm ci --only=production
          npm run build
          pm2 restart nhachung-api
```

## Troubleshooting

### Common Issues
```bash
# Check application logs
pm2 logs nhachung-api

# Check system resources
htop
df -h
free -h

# Check database connection
mongo --eval "db.adminCommand('ismaster')"

# Check network connectivity
netstat -tlnp | grep :3001
curl -I http://localhost:3001/api

# Restart services
sudo systemctl restart nginx
pm2 restart all
```

### Performance Monitoring
```bash
# Install monitoring tools
npm install -g clinic

# Run performance analysis
clinic doctor -- node dist/main.js

# Memory analysis
clinic heapprofiler -- node dist/main.js
```
