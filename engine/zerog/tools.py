"""Executable GCP tool implementations — LLM chooses calls, tools return real structured outcomes."""

from dataclasses import dataclass, field


@dataclass
class TaskState:
    task: str
    function_code: str = ""
    gen2: bool = False
    iam_bound: bool = False
    permissions_checked: bool = False
    deployed: bool = False
    config_written: bool = False
    tests_passed: bool = False
    deploy_attempts: int = 0
    history: list[str] = field(default_factory=list)


TOOL_NAMES = [
    "read_docs",
    "write_function",
    "gcloud_deploy",
    "set_iam",
    "check_permissions",
    "query_bigquery",
    "write_config",
    "run_tests",
    "gcloud_check_status",
    "gcloud_delete",
    "DONE",
]


def execute_tool(name: str, args: dict, state: TaskState) -> tuple[str, str]:
    """Returns (result_text, status) where status is complete|error|running."""
    if name == "read_docs":
        topic = args.get("topic", "cloud functions")
        state.history.append(f"read_docs:{topic}")
        return (
            f"Docs for '{topic}': Cloud Functions gen2 requires --gen2 flag, "
            f"Cloud Run backing, and roles/cloudfunctions.invoker on the runtime service account.",
            "complete",
        )

    if name == "write_function":
        code = args.get("code", "")
        use_gen2 = args.get("use_gen2", False) or "gen2" in state.task.lower()
        state.function_code = code or "# handler exported\nexports.process = async (req, res) => {}"
        state.gen2 = use_gen2 or "--gen2" in state.task
        state.history.append("write_function")
        return (
            f"Wrote function ({len(state.function_code)} chars). gen2={'yes' if state.gen2 else 'no'}.",
            "complete",
        )

    if name == "gcloud_deploy":
        state.deploy_attempts += 1
        state.history.append("gcloud_deploy")
        if not state.function_code:
            return "ERROR: no function code — call write_function first", "error"
        if not state.gen2 and "--gen2" in state.task.lower():
            return "ERROR: --gen2 required for Cloud Run backing", "error"
        if not state.gen2:
            return "ERROR: --gen2 required for Cloud Run backing", "error"
        if not state.iam_bound:
            return "ERROR: missing roles/cloudfunctions.invoker on service account", "error"
        state.deployed = True
        return f"Deployed Cloud Function (gen2) successfully on attempt {state.deploy_attempts}", "complete"

    if name == "set_iam":
        role = args.get("role", "roles/cloudfunctions.invoker")
        state.iam_bound = True
        state.history.append("set_iam")
        return f"IAM binding applied: {role} → runtime service account", "complete"

    if name == "check_permissions":
        state.permissions_checked = True
        state.history.append("check_permissions")
        missing = [] if state.iam_bound else ["roles/cloudfunctions.invoker"]
        if missing:
            return f"Missing permissions: {', '.join(missing)}", "complete"
        return "All required permissions present", "complete"

    if name == "query_bigquery":
        sql = args.get("sql", "SELECT 1")
        state.history.append("query_bigquery")
        return f"BigQuery job completed: {sql[:80]}… → 1,024 rows", "complete"

    if name == "write_config":
        state.config_written = True
        state.history.append("write_config")
        return "Configuration written to deploy.yaml", "complete"

    if name == "run_tests":
        state.tests_passed = True
        state.history.append("run_tests")
        return "All 12 unit tests passed", "complete"

    if name == "gcloud_check_status":
        state.history.append("gcloud_check_status")
        status = "ACTIVE" if state.deployed else "NOT_FOUND"
        return f"Function status: {status}", "complete"

    if name == "gcloud_delete":
        state.deployed = False
        state.history.append("gcloud_delete")
        return "Cloud Function deleted", "complete"

    if name == "DONE":
        state.history.append("DONE")
        if state.deployed or state.config_written:
            return "Task marked complete", "complete"
        return "ERROR: cannot finish — deployment or config not complete", "error"

    return f"Unknown tool: {name}", "error"


def task_succeeded(state: TaskState) -> bool:
    return state.deployed or (state.config_written and state.iam_bound)


def gemini_tool_declarations():
    from google.genai import types

    def obj(**props):
        return types.Schema(
            type=types.Type.OBJECT,
            properties=props,
            required=list(props.keys()),
        )

    str_ = lambda desc: types.Schema(type=types.Type.STRING, description=desc)
    bool_ = lambda desc: types.Schema(type=types.Type.BOOLEAN, description=desc)

    return [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="read_docs",
                    description="Read Google Cloud documentation for a topic",
                    parameters=obj(topic=str_("Documentation topic e.g. cloud functions gen2")),
                ),
                types.FunctionDeclaration(
                    name="write_function",
                    description="Write Cloud Function source code",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "code": str_("Function source code"),
                            "use_gen2": bool_("Use gen2 runtime"),
                        },
                        required=["code"],
                    ),
                ),
                types.FunctionDeclaration(
                    name="gcloud_deploy",
                    description="Deploy the Cloud Function with gcloud",
                    parameters=obj(flags=str_("Deploy flags e.g. --gen2")),
                ),
                types.FunctionDeclaration(
                    name="set_iam",
                    description="Set IAM binding on service account",
                    parameters=obj(role=str_("IAM role to grant")),
                ),
                types.FunctionDeclaration(
                    name="check_permissions",
                    description="Verify IAM permissions for the deployment",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
                ),
                types.FunctionDeclaration(
                    name="query_bigquery",
                    description="Run a BigQuery SQL query",
                    parameters=obj(sql=str_("SQL query")),
                ),
                types.FunctionDeclaration(
                    name="write_config",
                    description="Write deployment or pipeline configuration",
                    parameters=obj(content=str_("Config content")),
                ),
                types.FunctionDeclaration(
                    name="run_tests",
                    description="Run unit tests before deploy",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
                ),
                types.FunctionDeclaration(
                    name="gcloud_check_status",
                    description="Check Cloud Function deployment status",
                    parameters=obj(name=str_("Function name")),
                ),
                types.FunctionDeclaration(
                    name="gcloud_delete",
                    description="Delete a Cloud Function",
                    parameters=obj(name=str_("Function name")),
                ),
                types.FunctionDeclaration(
                    name="DONE",
                    description="Mark the task complete when all work is finished",
                    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
                ),
            ]
        )
    ]
