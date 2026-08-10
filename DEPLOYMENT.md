# CivicAudit - Deployment Guide

Complete guide for deploying CivicAudit to production and development environments.

---

## 📋 Table of Contents

1. [Local Development](#local-development)
2. [Docker Development](#docker-development)
3. [Production Deployment](#production-deployment)
4. [Database Setup](#database-setup)
5. [Management Commands](#management-commands)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🚀 Local Development

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Git

### Setup Steps

```bash
# Clone repository
git clone https://github.com/Wasim-Shaikh25/student-hub.git
cd student-hub

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with local settings
nano .env
```

### Database Setup

```bash
# Create database
createdb civic_audit

# Apply schema
psql -d civic_audit -f migrations/001_initial_schema.sql

# Verify (optional)
psql -d civic_audit -c "\dt"  # List tables
```

### Run Development Server

```bash
# From backend directory
python -m uvicorn app.main:app --reload --port 8000

# Server will be at http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app

# Specific test file
pytest tests/test_auth.py -v
```

---

## 🐳 Docker Development

### Prerequisites

- Docker
- Docker Compose

### Quick Start

```bash
# Start all services (database, Redis, API)
docker-compose up --build

# In another terminal, create admin user
docker exec civic_audit_api python -m cli.management create-admin \
  --email admin@example.com \
  --name "Admin User"

# Create demo data
docker exec civic_audit_api python -m cli.management create-demo-data
```

### Access Services

- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **PostgreSQL:** localhost:5432
  - User: `civic_audit`
  - Password: `secure_password_change_me` (in docker-compose.yml)
  - Database: `civic_audit`
- **Redis:** localhost:6379

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Remove everything (including volumes)
docker-compose down -v

# Rebuild containers
docker-compose up --build

# Run CLI commands
docker exec civic_audit_api python -m cli.management <command>
```

### Modify Configuration

Edit `docker-compose.yml` to change:
- Database password
- Ports
- Environment variables
- Volumes

---

## 🌐 Production Deployment

### Architecture Overview

```
                     ┌──────────────┐
                     │  Cloudflare  │
                     │     CDN      │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │   Nginx      │
                     │   Reverse    │
                     │   Proxy      │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
         │ Gunicorn│  │Gunicorn │  │Gunicorn │
         │ Worker1 │  │ Worker2 │  │ Worker3 │
         └────┬────┘  └────┬────┘  └────┬────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                     ┌──────▼───────────┐
                     │   PostgreSQL     │
                     │   + PostGIS      │
                     └──────────────────┘
                     
                     ┌──────────────────┐
                     │   Redis          │
                     │   (Celery)       │
                     └──────────────────┘
                     
                     ┌──────────────────┐
                     │   S3 / Storage   │
                     └──────────────────┘
```

### Prerequisites

- AWS/GCP/Azure account
- Docker & Docker Compose
- SSL certificates (Let's Encrypt)
- Domain name

### Deployment on AWS

#### 1. Create RDS PostgreSQL Instance

```bash
# In AWS Console:
# - Create RDS PostgreSQL 14+ with PostGIS enabled
# - Enable public accessibility (with security groups)
# - Create backup retention (30 days)
# - Enable encryption
```

#### 2. Create EC2 Instance

```bash
# Launch Ubuntu 22.04 t3.medium or larger

# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
sudo apt install -y docker.io docker-compose-v2 git

# Add user to docker group
sudo usermod -aG docker $USER

# Install Nginx
sudo apt install -y nginx
```

#### 3. Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/Wasim-Shaikh25/student-hub.git
sudo chown -R ubuntu:ubuntu student-hub
cd student-hub

# Create production .env
cp backend/.env.example backend/.env.prod
nano backend/.env.prod

# Update values:
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/civic_audit
SECRET_KEY=generate-secure-key-here
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### 4. Setup Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/civic-audit
```

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Static files (if any)
    location /static/ {
        alias /app/static/;
    }

    # API routes
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/civic-audit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 5. Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/civic-audit.service
```

```ini
[Unit]
Description=CivicAudit FastAPI Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/student-hub/backend
Environment="PATH=/opt/student-hub/backend/venv/bin"
ExecStart=/opt/student-hub/backend/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --log-level info \
    app.main:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable civic-audit
sudo systemctl start civic-audit
sudo systemctl status civic-audit
```

#### 6. Setup Database

```bash
# Connect to RDS
psql -h rds-endpoint -U username -d civic_audit

# Run migrations
psql -h rds-endpoint -U username -d civic_audit < migrations/001_initial_schema.sql
```

### Deployment on Docker Swarm / Kubernetes

For larger scale, use Kubernetes:

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: civic-audit-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: civic-audit-api
  template:
    metadata:
      labels:
        app: civic-audit-api
    spec:
      containers:
      - name: api
        image: civic-audit:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: civic-audit-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## 🗄️ Database Setup

### PostgreSQL + PostGIS

```bash
# Create database with PostGIS
createdb civic_audit
psql -d civic_audit -c "CREATE EXTENSION postgis;"

# Verify PostGIS
psql -d civic_audit -c "SELECT PostGIS_version();"
```

### Backups

```bash
# Backup database
pg_dump civic_audit > civic_audit_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql civic_audit < civic_audit_backup_20240810_120000.sql

# Automated backups (crontab)
0 2 * * * pg_dump civic_audit | gzip > /backups/civic_audit_$(date +\%Y\%m\%d).sql.gz
```

### Performance Tuning

```sql
-- Add indexes for common queries
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX idx_evidence_issue ON civic_evidence(issue_id);

-- Vacuum
VACUUM ANALYZE;
```

---

## ⚙️ Management Commands

### Create Admin User

```bash
python -m cli.management create-admin
# or
python -m cli.management create-admin --email admin@example.com --name "Admin User" --password "secure123"
```

### Create Demo Data

```bash
python -m cli.management create-demo-data
# Creates: 4 states, 12 districts, 3 demo users
```

### Ingest Government Data

```bash
# Ingest all sources
python -m cli.management ingest-data --source all --year 2024-25

# Specific source
python -m cli.management ingest-data --source datagov --year 2024-25
```

### Database Operations

```bash
# Create/migrate schema
python -m cli.management migrate-database

# Reset database (development only!)
python -m cli.management reset-database

# List users
python -m cli.management list-users

# Ban user
python -m cli.management ban-user --email user@example.com --reason "Spam"

# Show configuration
python -m cli.management show-config
```

---

## 📊 Monitoring & Maintenance

### Logging

```bash
# View application logs
journalctl -u civic-audit -f

# Nginx access logs
tail -f /var/log/nginx/access.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log
```

### Health Checks

```bash
# Check API health
curl http://localhost:8000/health

# Check database connection
psql -h localhost -U civic_audit -d civic_audit -c "SELECT 1;"
```

### Performance Monitoring

```bash
# Monitor database size
psql -d civic_audit -c "SELECT pg_size_pretty(pg_database_size('civic_audit'));"

# Monitor connections
psql -d civic_audit -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Scaling Considerations

1. **Horizontal Scaling**
   - Run multiple API instances behind load balancer
   - Use connection pooling (PgBouncer)

2. **Database Scaling**
   - Read replicas for analytics queries
   - Partitioning large tables by date

3. **Caching**
   - Redis for session/cache
   - CDN for static assets

4. **Async Tasks**
   - Celery for background jobs
   - Data ingestion scheduled tasks

---

## 🔒 Security Checklist

- [ ] Change default passwords
- [ ] Enable SSL/TLS
- [ ] Setup firewall rules
- [ ] Enable database backups
- [ ] Setup log rotation
- [ ] Enable audit logging
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Setup intrusion detection
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities

---

## 🆘 Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U civic_audit -d civic_audit -c "SELECT 1;"
```

### API Not Responding

```bash
# Check service status
sudo systemctl status civic-audit

# Check logs
journalctl -u civic-audit -n 50 -f

# Check port
netstat -tlnp | grep 8000
```

### High Database Load

```sql
-- Kill long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Analyze tables
ANALYZE;

-- Vacuum
VACUUM FULL;
```

---

## 📞 Support

- **Documentation:** `/docs` endpoint
- **Issues:** GitHub Issues
- **Email:** support@civicaudit.io

---

**Last Updated:** August 10, 2026
