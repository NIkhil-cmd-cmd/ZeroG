# ZeroG demo in Antigravity IDE

## What goes wrong (don't do this)

Antigravity sometimes **ignores the skill** and writes `run_harness_task.py` that imports `ZeroGHarness`. That bypasses the demo entirely and fakes success. **Reject that** — paste the prompt below instead.

- Do **not** create `run_harness_task.py` or import `ZeroGHarness` / `ZeroGMemory`
- Do **not** call `/train` or run the web demo harness from Antigravity
- Do **not** skip retrieve — that hides ZeroG

## Setup (once)

```bash
export ZEROG_ENGINE_URL=http://localhost:8000
cd ~/ChorusAI/engine && ./run.sh server   # keep running
```

Install skill (workspace or global), then **new Antigravity conversation**.

## Demo script (ZeroG session) — paste this prompt

```
Use the zerog-shared-memory skill only via shell — no new Python files.

1. Run: ~/ChorusAI/skill/scripts/zerog_demo.sh "Deploy a Cloud Function triggered by Firestore document creation that processes the new document and writes a summary to a different collection. Use --gen2 flag and set appropriate IAM permissions for the service account." cloud_functions

2. Show me the layer and tool order from retrieve.

3. Deploy using your normal GCP tools in this order: write_function → set_iam(roles/cloudfunctions.invoker) → gcloud_deploy(--gen2) → DONE

4. Record: ~/ChorusAI/skill/scripts/memory_client.sh record "<same task text>" "write_function,set_iam,gcloud_deploy,DONE" success cloud_functions

5. Run retrieve again for a DIFFERENT task (HTTP webhook CF) and show few_shot picked up the Firestore trace.
```

## Cold session (for side-by-side) — separate chat, no skill

```
Deploy an HTTP-triggered Cloud Function as a webhook receiver with --gen2, set IAM, deploy. Do not use ZeroG memory.
```

Then in ZeroG chat, retrieve for Firestore task — should show `few_shot` with prior HTTP/cold trace if you recorded it.

## Verify engine

```bash
~/ChorusAI/skill/scripts/memory_client.sh health
```
