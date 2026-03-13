# Deploying Truckgear Truck Parts Store to Google Cloud Run

## Prerequisites

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. Create a Google Cloud project and enable billing
3. Log in: `gcloud auth login`
4. Set your project: `gcloud config set project YOUR_PROJECT_ID`

---

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

Save the connection name — you will need it in Step 3:
```bash
gcloud sql instances describe truckgear-db --format="value(connectionName)"
# Example output: your-project-id:asia-southeast1:truckgear-db
```

---

## Step 2: Build and Push Docker Image

```bash
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com

# Create the Artifact Registry repository (one-time setup)
gcloud artifacts repositories create truckgear-repo \
  --repository-format=docker \
  --location=asia-southeast1

# Build and push using Cloud Build (runs the build remotely on Google servers)
gcloud builds submit \
  --tag asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest
```

> The build uploads your source code to Cloud Build, installs dependencies, runs
> `npm run build`, and pushes the image to Artifact Registry. This takes ~3–5 minutes.

---

## Step 3: Deploy to Cloud Run

> **Important:** All `--set-env-vars` values must be in a single comma-separated list.
> Using multiple `--set-env-vars` flags causes each one to overwrite the previous.

```bash
gcloud services enable run.googleapis.com

gcloud run deploy truckgear \
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest \
  --region=asia-southeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="SESSION_SECRET=YOUR_SESSION_SECRET,SHOPIFY_API_KEY=YOUR_SHOPIFY_KEY,SHOPIFY_STORE_URL=YOUR_SHOPIFY_URL,DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@/truckgear?host=/cloudsql/YOUR_CONNECTION_NAME"
```

Replace all `YOUR_*` placeholders with your actual values:

| Placeholder | Example |
|---|---|
| `YOUR_PROJECT_ID` | `my-gcp-project-123` |
| `YOUR_CONNECTION_NAME` | `my-gcp-project-123:asia-southeast1:truckgear-db` |
| `YOUR_DB_PASSWORD` | The password you set in Step 1 |
| `YOUR_SESSION_SECRET` | Any long random string (32+ characters) |
| `YOUR_SHOPIFY_KEY` | Your Shopify Admin API access token (optional) |
| `YOUR_SHOPIFY_URL` | Your Shopify store URL e.g. `mystore.myshopify.com` (optional) |

On first startup, the container automatically runs `drizzle-kit push` to create all
database tables before the server starts.

---

## Running Locally with Docker Compose

Test the full stack locally before deploying:

```bash
# Build and start app + PostgreSQL
docker-compose up --build

# Run in background
docker-compose up --build -d

# Stop
docker-compose down
```

The app will be available at **http://localhost:8080**

To customize local environment variables, edit the `environment` section in
`docker-compose.yml` before running.

---

## Updating After Code Changes

After making changes, rebuild the image and redeploy:

```bash
gcloud builds submit \
  --tag asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest

gcloud run deploy truckgear \
  --image=asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/truckgear-repo/truckgear:latest \
  --region=asia-southeast1
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret key for session encryption (use a long random string) |
| `PORT` | No | Server port — Cloud Run sets this to 8080 automatically |
| `SHOPIFY_API_KEY` | No | Shopify Admin API access token |
| `SHOPIFY_STORE_URL` | No | Your Shopify store domain e.g. `mystore.myshopify.com` |

---

## Troubleshooting

**Build fails with missing file errors**
Make sure `attached_assets/` exists in your project root — it contains the company
logo that is bundled into the frontend during build.

**Container fails to start**
Check Cloud Run logs:
```bash
gcloud run services logs read truckgear --region=asia-southeast1
```
Most common cause: `DATABASE_URL` is incorrect or the Cloud SQL instance is not running.

**Database tables missing**
The container runs `drizzle-kit push --force` automatically on startup to create tables.
If this step fails, the server will not start. Check the logs for database connection errors.

**Connection refused to Cloud SQL**
Ensure the Cloud SQL instance connection name is included with `--add-cloudsql-instances`
in the deploy command. Without this, Cloud Run cannot reach the private Cloud SQL socket.

**Out of memory errors**
Increase memory in the deploy command: `--memory=1Gi`
