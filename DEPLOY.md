# Deploying TRUCKGEAR.IO to Google Cloud Run

## Prerequisites

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. Create a Google Cloud project and enable billing
3. Log in: `gcloud auth login`
4. Set your project: `gcloud config set project YOUR_PROJECT_ID`

## Step 1: Set Up Cloud SQL (PostgreSQL)

```bash
gcloud services enable sqladmin.googleapis.com

gcloud sql instances create truckgear-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=asia-southeast1

gcloud sql databases create truckgear --instance=truckgear-db

gcloud sql users set-password postgres \
  --instance=truckgear-db \
  --password=YOUR_DB_PASSWORD
```

Note the connection name from:
```bash
gcloud sql instances describe truckgear-db --format="value(connectionName)"
```

## Step 2: Build and Push Docker Image

```bash
gcloud services enable artifactregistry.googleapis.com

gcloud artifacts repositories create truckgear-repo \
  --repository-format=docker \
  --location=asia-southeast1

gcloud builds submit --tag asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest
```

## Step 3: Deploy to Cloud Run

```bash
gcloud services enable run.googleapis.com

gcloud run deploy truckgear \
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest \
  --region=asia-southeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --set-env-vars="SESSION_SECRET=YOUR_SESSION_SECRET" \
  --set-env-vars="SHOPIFY_API_KEY=YOUR_SHOPIFY_KEY" \
  --set-env-vars="SHOPIFY_STORE_URL=YOUR_SHOPIFY_URL" \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@/truckgear?host=/cloudsql/YOUR_CONNECTION_NAME"
```

Replace all `YOUR_*` placeholders with your actual values.

## Running Locally with Docker Compose

To test locally before deploying:

```bash
docker-compose up --build
```

The app will be available at http://localhost:8080

## Updating the Deployment

After making changes, rebuild and redeploy:

```bash
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest

gcloud run deploy truckgear \
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest \
  --region=asia-southeast1
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| SESSION_SECRET | Yes | Secret key for session encryption |
| PORT | No | Server port (defaults to 8080) |
| SHOPIFY_API_KEY | No | Shopify Admin API access token |
| SHOPIFY_STORE_URL | No | Your Shopify store URL |

## Troubleshooting

**Container fails to start:** Check that DATABASE_URL is correct and the Cloud SQL instance is running.

**Database tables missing:** The container automatically runs `drizzle-kit push` on startup to create tables. Check Cloud Run logs if this fails.

**Connection refused:** Make sure the Cloud SQL instance connection name is added with `--add-cloudsql-instances`.
