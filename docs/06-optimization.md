# Agent 10: DevOps, Scaling & India Optimization

## Performance Targets for Bharat

| Metric | Target | Strategy |
|--------|--------|----------|
| App Size | < 5 MB APK | Code splitting, no embedded assets, download-on-demand |
| Minimum RAM | 2 GB | Lazy loading, minimal state, no heavy frameworks |
| Solve Latency | < 3 seconds | Edge caching, model routing, response streaming |
| Offline Support | Full NCERT | SQLite local DB, pre-downloaded solution packs |
| Network | Works on 2G/3G | Compressed API responses, progressive loading |
| Battery | < 2% per session | No background processes, efficient rendering |

## Cost Optimization

### AI Inference Costs
| Model | Use Case | Cost/solve | Monthly (1M solves) |
|-------|----------|-----------|---------------------|
| Llama 3.1 70B (self-hosted) | Basic NCERT | ₹0.08 | ₹80,000 |
| Claude 3.5 Sonnet | JEE/NEET | ₹0.25 | ₹2,50,000 |
| GPT-4o | Hard problems | ₹0.80 | ₹8,00,000 |
| **Weighted average** | **Mixed** | **₹0.15** | **₹1,50,000** |

### Caching Strategy
- **Redis**: Cache identical questions (40% cache hit expected for NCERT)
- **CDN**: Edge cache popular NCERT solutions at CloudFront Mumbai
- **Local**: Offline packs reduce server load by 30%
- **Projected savings**: 50% reduction in inference costs

### Infrastructure (AWS Mumbai ap-south-1)
| Service | Spec | Monthly Cost |
|---------|------|-------------|
| EC2 (API) | 2x t3.medium | ₹8,000 |
| RDS PostgreSQL | db.t3.medium | ₹6,000 |
| ElastiCache Redis | cache.t3.micro | ₹3,000 |
| S3 + CloudFront | 100GB + CDN | ₹2,000 |
| EC2 (Llama 3.1) | g5.xlarge | ₹80,000 |
| Vercel (Frontend) | Pro plan | ₹1,600 |
| **Total** | | **~₹1,00,000/mo** |

### Scaling Plan
- **0-100K users**: Single API server + managed DB
- **100K-1M users**: Auto-scaling group, read replicas
- **1M-10M users**: Kubernetes on EKS, multi-region, dedicated GPU fleet
