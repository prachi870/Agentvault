#!/usr/bin/env bash
# ============================================================================
# ESAKIP — AWS Infrastructure Setup Script
# Run once to create the foundational AWS resources for production.
# Requires: aws-cli v2 configured with admin-level credentials.
#
# IMPORTANT: Review and edit the variables below before running!
# ============================================================================
set -euo pipefail

# ---- Configuration (edit these) ----
REGION="us-east-1"
APP="esakip"
ENV="prod"
VPC_ID="vpc-XXXXXXXX"           # Your VPC
SUBNET_IDS="subnet-aaa,subnet-bbb"  # Private subnets (2+ AZs)
PUBLIC_SUBNET_IDS="subnet-ccc,subnet-ddd"  # Public subnets for ALB
DOMAIN="your-domain.com"        # Your domain for ACM cert
DB_PASSWORD="CHANGE_ME_$(openssl rand -hex 16)"
S3_BUCKET="${APP}-documents-${ENV}"

echo "=== Creating ESAKIP AWS Infrastructure ==="
echo "Region: ${REGION} | App: ${APP} | Env: ${ENV}"
echo ""

# ---- 1. ECR Repositories ----
echo "→ Creating ECR repositories..."
for REPO in "${APP}-api" "${APP}-frontend"; do
    aws ecr create-repository --repository-name "${REPO}" --region "${REGION}" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 \
        2>/dev/null || echo "  (${REPO} already exists)"
done

# ---- 2. S3 Bucket (SSE-KMS) ----
echo "→ Creating S3 bucket: ${S3_BUCKET}..."
aws s3api create-bucket --bucket "${S3_BUCKET}" --region "${REGION}" \
    2>/dev/null || echo "  (bucket already exists)"
aws s3api put-bucket-encryption --bucket "${S3_BUCKET}" \
    --server-side-encryption-configuration '{
        "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}, "BucketKeyEnabled": true}]
    }'
aws s3api put-public-access-block --bucket "${S3_BUCKET}" \
    --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

# ---- 3. Secrets Manager ----
echo "→ Creating Secrets Manager entries..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
RECEIPT_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")

for SECRET_NAME in "secret-key" "receipt-signing-key" "database-url" "redis-url" \
                   "qdrant-url" "qdrant-api-key" "google-api-key"; do
    case "${SECRET_NAME}" in
        secret-key)       VALUE="${SECRET_KEY}" ;;
        receipt-signing-key) VALUE="${RECEIPT_KEY}" ;;
        database-url)     VALUE="postgresql://esakip:${DB_PASSWORD}@FILL_IN_RDS_ENDPOINT:5432/esakip" ;;
        *)                VALUE="FILL_ME_IN" ;;
    esac
    aws secretsmanager create-secret \
        --name "${APP}/${ENV}/${SECRET_NAME}" \
        --secret-string "${VALUE}" \
        --region "${REGION}" \
        2>/dev/null || echo "  (${SECRET_NAME} already exists — update manually)"
done

# ---- 4. RDS PostgreSQL ----
echo "→ Creating RDS PostgreSQL instance..."
echo "  (Create a security group allowing port 5432 from ECS tasks first)"
echo ""
echo "  aws rds create-db-instance \\"
echo "    --db-instance-identifier ${APP}-${ENV} \\"
echo "    --db-instance-class db.t3.medium \\"
echo "    --engine postgres --engine-version 16.4 \\"
echo "    --master-username esakip --master-user-password '${DB_PASSWORD}' \\"
echo "    --allocated-storage 50 --storage-encrypted \\"
echo "    --vpc-security-group-ids sg-XXXXXXXX \\"
echo "    --db-subnet-group-name your-db-subnet-group \\"
echo "    --backup-retention-period 7 \\"
echo "    --multi-az --no-publicly-accessible \\"
echo "    --region ${REGION}"
echo ""

# ---- 5. ElastiCache Redis ----
echo "→ Creating ElastiCache Redis cluster..."
echo ""
echo "  aws elasticache create-replication-group \\"
echo "    --replication-group-id ${APP}-${ENV} \\"
echo "    --replication-group-description 'ESAKIP Redis' \\"
echo "    --engine redis --cache-node-type cache.t3.medium \\"
echo "    --num-cache-clusters 2 \\"
echo "    --at-rest-encryption-enabled --transit-encryption-enabled \\"
echo "    --security-group-ids sg-XXXXXXXX \\"
echo "    --cache-subnet-group-name your-cache-subnet-group \\"
echo "    --region ${REGION}"
echo ""

# ---- 6. ECS Cluster ----
echo "→ Creating ECS cluster..."
aws ecs create-cluster --cluster-name "${APP}-${ENV}" --region "${REGION}" \
    --configuration 'executeCommandConfiguration={logging=DEFAULT}' \
    --capacity-providers FARGATE FARGATE_SPOT \
    2>/dev/null || echo "  (cluster already exists)"

# ---- 7. CloudWatch Log Groups ----
echo "→ Creating CloudWatch log groups..."
for GROUP in "/ecs/${APP}-api" "/ecs/${APP}-frontend"; do
    aws logs create-log-group --log-group-name "${GROUP}" --region "${REGION}" \
        2>/dev/null || echo "  (${GROUP} already exists)"
    aws logs put-retention-policy --log-group-name "${GROUP}" --retention-in-days 30 --region "${REGION}"
done

# ---- 8. CloudWatch Alarms ----
echo "→ Creating CloudWatch alarms..."

# High error rate alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${APP}-${ENV}-api-5xx" \
    --alarm-description "ESAKIP API 5xx error rate > 5% for 5 minutes" \
    --namespace "AWS/ApplicationELB" \
    --metric-name "HTTPCode_Target_5XX_Count" \
    --dimensions Name=TargetGroup,Value="targetgroup/${APP}-api/XXXXXXXX" \
    --statistic Sum --period 300 --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 --treat-missing-data notBreaching \
    --region "${REGION}" \
    2>/dev/null || echo "  (alarm exists — update target group ARN)"

# High latency alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${APP}-${ENV}-api-latency" \
    --alarm-description "ESAKIP API p95 latency > 30s for 5 minutes" \
    --namespace "AWS/ApplicationELB" \
    --metric-name "TargetResponseTime" \
    --dimensions Name=TargetGroup,Value="targetgroup/${APP}-api/XXXXXXXX" \
    --extended-statistic p95 --period 300 --threshold 30 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 --treat-missing-data notBreaching \
    --region "${REGION}" \
    2>/dev/null || echo "  (alarm exists — update target group ARN)"

# CPU utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${APP}-${ENV}-api-cpu" \
    --alarm-description "ESAKIP API CPU > 80% for 10 minutes" \
    --namespace "AWS/ECS" \
    --metric-name "CPUUtilization" \
    --dimensions Name=ClusterName,Value="${APP}-${ENV}" Name=ServiceName,Value="${APP}-api-service" \
    --statistic Average --period 300 --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 --treat-missing-data notBreaching \
    --region "${REGION}" \
    2>/dev/null || echo "  (alarm exists)"

echo ""
echo "=== Infrastructure setup complete ==="
echo ""
echo "Manual steps remaining:"
echo "  1. Create ALB with target groups for API (port 8000) and frontend (port 3000)"
echo "  2. Request ACM certificate for ${DOMAIN} and attach to ALB"
echo "  3. Create ECS services using deploy/ecs/*-task-definition.json"
echo "  4. Update Secrets Manager entries with real values (RDS endpoint, Redis endpoint, etc.)"
echo "  5. Run initial 'alembic upgrade head' against the production database"
echo "  6. Configure DNS (Route 53 or external) to point ${DOMAIN} → ALB"
echo "  7. Enable AWS WAF on the ALB for additional security"
echo "  8. Set up SNS topic + subscription for CloudWatch alarm notifications"
