"""
15 Google Cloud tasks in 3 clusters.
These reflect what real enterprise teams do with Antigravity on GCP.
Within each cluster, tasks are structurally similar but target different services.
Shared memory shines here — the pattern transfers across services.
"""

TASKS = [
    {
        "id": "a1",
        "task": "Deploy a Cloud Function triggered by Firestore document creation that processes the new document and writes a summary to a different collection. Use --gen2 flag and set appropriate IAM permissions for the service account.",
        "cluster": "cloud_functions",
        "service": "firestore_trigger",
    },
    {
        "id": "a2",
        "task": "Deploy a Cloud Function triggered by Pub/Sub messages that parses incoming JSON payloads and stores structured data in Cloud SQL. Use --gen2 flag and configure the VPC connector for private SQL access.",
        "cluster": "cloud_functions",
        "service": "pubsub_trigger",
    },
    {
        "id": "a3",
        "task": "Deploy a Cloud Function triggered by Cloud Storage uploads that generates thumbnails for uploaded images and saves them to a separate bucket. Use --gen2, set memory to 512MB, and configure the timeout to 120s.",
        "cluster": "cloud_functions",
        "service": "storage_trigger",
    },
    {
        "id": "a4",
        "task": "Deploy an HTTP-triggered Cloud Function as a webhook receiver that validates incoming request signatures, processes the payload, and forwards events to a Pub/Sub topic. Use --gen2 and set --allow-unauthenticated.",
        "cluster": "cloud_functions",
        "service": "http_trigger",
    },
    {
        "id": "a5",
        "task": "Deploy a scheduled Cloud Function using Cloud Scheduler that queries a BigQuery dataset daily, computes aggregate metrics for the past 7 days, and writes results to a summary table. Use --gen2 and configure the scheduler cron expression.",
        "cluster": "cloud_functions",
        "service": "scheduler_trigger",
    },
    {
        "id": "b1",
        "task": "Create a BigQuery scheduled query that runs daily at 2am UTC, joins a users table with an events table, computes per-user engagement metrics for the trailing 7 days, and writes results to a date-partitioned summary table.",
        "cluster": "bigquery",
        "service": "scheduled_query",
    },
    {
        "id": "b2",
        "task": "Set up a BigQuery data transfer from Cloud Storage that runs hourly, ingesting newline-delimited JSON files from a GCS bucket into a partitioned BigQuery table with schema auto-detection and write disposition WRITE_APPEND.",
        "cluster": "bigquery",
        "service": "data_transfer",
    },
    {
        "id": "b3",
        "task": "Create a BigQuery ML logistic regression model using CREATE MODEL on a user churn dataset with feature columns for session_count, days_since_last_login, and plan_type. Generate predictions on a holdout set using ML.PREDICT.",
        "cluster": "bigquery",
        "service": "bqml",
    },
    {
        "id": "b4",
        "task": "Build a BigQuery authorized view that joins data from three datasets across two GCP projects, granting the view access to the underlying tables via authorized view configuration in each source dataset.",
        "cluster": "bigquery",
        "service": "cross_project",
    },
    {
        "id": "b5",
        "task": "Implement a BigQuery streaming insert pipeline using the Storage Write API in Python with committed mode, handling batching of 500 rows, automatic retries with exponential backoff, and dead-letter logging for failed rows.",
        "cluster": "bigquery",
        "service": "streaming",
    },
    {
        "id": "c1",
        "task": "Configure Workload Identity Federation for a GitHub Actions pipeline to deploy to Cloud Run without service account keys. Create the workload identity pool, OIDC provider, set attribute mappings, and bind the service account.",
        "cluster": "iam_security",
        "service": "workload_identity",
    },
    {
        "id": "c2",
        "task": "Set up VPC Service Controls around BigQuery and Cloud Storage, creating a regular service perimeter, configuring access levels for the engineering team's IP range, and defining ingress policies for CI/CD service accounts.",
        "cluster": "iam_security",
        "service": "vpc_sc",
    },
    {
        "id": "c3",
        "task": "Create a custom IAM role with least-privilege permissions for a data analyst who needs read access to BigQuery datasets and Cloud Storage buckets, but cannot create, modify, or delete any resources.",
        "cluster": "iam_security",
        "service": "custom_role",
    },
    {
        "id": "c4",
        "task": "Configure Organization Policy constraints to restrict Cloud Function deployment to us-central1 and europe-west1 only, require CMEK encryption for all new BigQuery datasets, and disable external IP addresses on Compute Engine instances.",
        "cluster": "iam_security",
        "service": "org_policy",
    },
    {
        "id": "c5",
        "task": "Set up Secret Manager to store database credentials and API keys, create a rotation schedule using a Cloud Function that generates new credentials every 90 days, and grant secretAccessor role to the application's service account only.",
        "cluster": "iam_security",
        "service": "secret_manager",
    },
]


def get_tasks_for_demo(cluster: str | None = None, count: int = 10) -> list[dict]:
    if cluster:
        return [t for t in TASKS if t["cluster"] == cluster][:count]
    return TASKS[:count]


def get_demo_pairs(cluster: str | None = None, count: int = 4) -> list[dict]:
    """Cold and ZeroG always run different tasks in the same cluster."""
    pool = [t for t in TASKS if t["cluster"] == cluster] if cluster else TASKS
    if len(pool) < 2:
        raise ValueError(f"Need at least 2 tasks in cluster {cluster!r}")
    count = min(count, len(pool) - 1)
    pairs = []
    for i in range(count):
        cold = pool[i % len(pool)]
        zerog = pool[(i + 2) % len(pool)]
        if zerog["id"] == cold["id"]:
            zerog = pool[(i + 1) % len(pool)]
        pairs.append({"index": i, "cold": cold, "zerog": zerog})
    return pairs
