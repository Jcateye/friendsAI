# Enhance project.sh Error Reporting

## TL;DR

> **Quick Summary**: Modify `project.sh` to provide comprehensive error reporting for service startup failures, including port listening verification, timeouts, and consolidated failure summaries after attempting all service starts.
>
> **Deliverables**: Modified `project.sh` script with enhanced error reporting for `start_client`, `start_server`, `start_worker`, `start`, and `start_mvp` functions.
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential
> **Critical Path**: Implement `check_service_status` -> Integrate into `start_*` functions -> Consolidate reporting.

---

## Context

### Original Request
The user reported that `project.sh` service starts often fail silently without clear notification. They require a more robust error reporting mechanism.

### Interview Summary
**Key Discussions**:
- **Error Reporting:** When a service fails to start, output a direct, prominent error message to the terminal. Each error message should indicate which log file to check for more details. The script should attempt to start all services (`client`, `server`, `worker`) before providing a consolidated report of all failures at the end.
- **Validation:** For services that listen on a port (client, server), the script must actively wait for and verify that the specified port is genuinely listening before considering the service "started".
- **Timeout:** The maximum waiting time for a port to start listening should be 30 seconds. If the port is not listening within this time, the service should be considered failed.
- **Log Output:** Upon any service startup failure, the error message should include the last 10 lines of that service's log file to aid immediate diagnosis.

### Metis Review
(Metis consultation was skipped/failed due to environment constraints. Proceeding based on clear user requirements.)

---

## Work Objectives

### Core Objective
To enhance the `project.sh` script to prevent silent failures during service startup by implementing proactive status checks, port listening verification, and consolidated, informative error reporting.

### Concrete Deliverables
- A `check_service_status` helper function in `project.sh`.
- Modified `start_client` function in `project.sh` to use `check_service_status` and report errors.
- Modified `start_server` function in `project.sh` to use `check_service_status` and report errors.
- Modified `start_worker` function in `project.sh` to use `check_service_status` and report errors.
- Modified `start` function in `project.sh` to aggregate and report service startup results.
- Modified `start_mvp` function in `project.sh` to aggregate and report service startup results.

### Definition of Done
- [x] Running `./project.sh start` successfully starts all services and reports success for each.
- [x] Running `./project.sh start` with one or more services intentionally failing to start (e.g., port already in use, invalid script) results in clear error messages for each failed service, includes the last 10 log lines, and a consolidated failure summary at the end.
- [x] Services with ports (client:10086, server:3000) are verified for actual port listening within 30 seconds.
- [x] Worker service failure is correctly reported (e.g., PID check, or if a log keyword check is later implemented).

### Must Have
- Clear, prominent error messages on service startup failure.
- Indication of relevant log file for debugging.
- Consolidated failure report for all services attempted to start.
- Verification of port listening for client/server services.
- 30-second timeout for port listening checks.
- Last 10 lines of relevant log on failure.

### Must NOT Have (Guardrails)
- Silent failures during service startup.
- Incomplete error messages that don't point to logs.
- Immediate exit on first service failure (should attempt all).
- Hardcoded port numbers outside of environment variables or constants.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Shell script execution, log files)
- **User wants tests**: Manual-only (via script execution)
- **Framework**: bash

### Manual Verification
Each TODO will include:
- Specific commands to run.
- Expected outputs to verify (success messages, error messages, log lines).
- Interactive verification steps (e.g., checking `lsof` or browser for port activity).

---

## Execution Strategy

### Parallel Execution Waves
This task involves sequential modifications to a single script. Parallel execution is not applicable.

### Dependency Matrix
| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None |
| 2 | 1 | 3 | None |
| 3 | 2 | 4 | None |
| 4 | 3 | 5 | None |
| 5 | 4 | 6 | None |
| 6 | 5 | None | None |

### Agent Dispatch Summary
All tasks will be handled sequentially by a `quick` category agent to apply direct script modifications.

---

## TODOs

- [x] 1. Implement `check_service_status` function in `project.sh`

  **What to do**:
  - Add a new shell function `check_service_status` to `project.sh`.
  - This function should take service name, PID file path, log file path, and optional port number as arguments.
  - It should:
    - Verify PID file existence and process status (`kill -0`).
    - If `port` is provided, use `lsof` to wait for the port to be in a listening state for up to 30 seconds.
    - If checks fail, print a prominent error message including service name, PID file, and log file path.
    - If checks fail, read and print the last 10 lines of the specified log file.
    - Return a non-zero exit code on failure, 0 on success.

  **Must NOT do**:
  - Introduce new external dependencies.
  - Change existing `is_*_running` functions, as these are for quick checks, not robust verification.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Direct script modification, focused on adding a helper function.
  - **Skills**: [`bash`]
    - Reason: Requires shell scripting expertise.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 2, 3, 4, 5, 6
  - **Blocked By**: None

  **References**:
  - `project.sh`: The target script for modification.
  - `is_client_running`: Existing function for PID check pattern.
  - `kill_port`: Existing function for port checking pattern using `lsof`.

  **Acceptance Criteria**:
  - [ ] `check_service_status` function exists in `project.sh`.
  - [ ] The function correctly identifies a running service (PID and optionally port).
  - [ ] The function correctly identifies a non-running service (PID missing/dead, or port not listening).
  - [ ] The function correctly waits for 30 seconds for port listening if a port is provided.
  - [ ] On failure, it prints an error message to stdout and the last 10 lines of the log file.
  - [ ] On success, it returns 0; on failure, it returns a non-zero exit code.
  - **Manual Verification:**
    ```bash
    # Manually test the new function (after implementation)
    # Simulate a running service:
    # echo $$ > .test.pid && sleep 60 & # run a dummy process
    # ./project.sh (manually call check_service_status with dummy args)
    # Simulate a failed service:
    # rm .test.pid
    # ./project.sh (manually call check_service_status with dummy args)
    ```

- [x] 2. Modify `start_client` function in `project.sh`

  **What to do**:
  - After starting the client service with `nohup`, immediately call the new `check_service_status` function.
  - Pass `client`, `$CLIENT_PID_FILE`, `$CLIENT_LOG`, and the client port (`10086`) to `check_service_status`.
  - Store the result of `check_service_status` to determine if the client started successfully.
  - Do NOT exit immediately on failure; store the failure status.

  **Must NOT do**:
  - Change the core `nohup` command for starting the client.
  - Exit the script.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Direct script modification, integrating a new helper function.
  - **Skills**: [`bash`]
    - Reason: Requires shell scripting expertise.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 3, 4, 5, 6
  - **Blocked By**: 1

  **References**:
  - `project.sh`: The target script.
  - `check_service_status`: The newly implemented function.
  - `CLIENT_LOG`, `CLIENT_PID_FILE`: Existing variables.

  **Acceptance Criteria**:
  - [ ] `start_client` calls `check_service_status` after attempting to start the service.
  - [ ] `start_client` captures the success/failure status of `check_service_status`.
  - [ ] `start_client` prints an appropriate message (e.g., success or "attempted to start, checking status...").
  - **Manual Verification:**
    ```bash
    # Stop all services first
    ./project.sh stop all
    # Simulate client success (ensure no process on 10086)
    ./project.sh start client
    # Simulate client failure (e.g., manually occupy port 10086 before starting)
    # python -m http.server 10086 &
    # ./project.sh start client
    # kill %1 (to free the port)
    ```

- [x] 3. Modify `start_server` function in `project.sh`

  **What to do**:
  - After starting the server service with `nohup`, immediately call the new `check_service_status` function.
  - Pass `server`, `$SERVER_PID_FILE`, `$SERVER_LOG`, and the server port (`${PORT:-3000}`) to `check_service_status`.
  - Store the result of `check_service_status` to determine if the server started successfully.
  - Do NOT exit immediately on failure; store the failure status.

  **Must NOT do**:
  - Change the core `nohup` command for starting the server.
  - Exit the script.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Direct script modification, integrating a new helper function.
  - **Skills**: [`bash`]
    - Reason: Requires shell scripting expertise.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 4, 5, 6
  - **Blocked By**: 2

  **References**:
  - `project.sh`: The target script.
  - `check_service_status`: The newly implemented function.
  - `SERVER_LOG`, `SERVER_PID_FILE`, `PORT`: Existing variables.

  **Acceptance Criteria**:
  - [ ] `start_server` calls `check_service_status` after attempting to start the service.
  - [ ] `start_server` captures the success/failure status of `check_service_status`.
  - [ ] `start_server` prints an appropriate message (e.g., success or "attempted to start, checking status...").
  - **Manual Verification:**
    ```bash
    # Stop all services first
    ./project.sh stop all
    # Simulate server success (ensure no process on 3000)
    ./project.sh start server
    # Simulate server failure (e.g., manually occupy port 3000 before starting)
    # python -m http.server 3000 &
    # ./project.sh start server
    # kill %1 (to free the port)
    ```

- [x] 4. Modify `start_worker` function in `project.sh`

  **What to do**:
  - After starting the worker service with `nohup`, immediately call the new `check_service_status` function.
  - Pass `worker`, `$WORKER_PID_FILE`, `$WORKER_LOG` to `check_service_status`. (Worker does not listen on a port).
  - Store the result of `check_service_status` to determine if the worker started successfully.
  - Do NOT exit immediately on failure; store the failure status.

  **Must NOT do**:
  - Change the core `nohup` command for starting the worker.
  - Exit the script.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Direct script modification, integrating a new helper function.
  - **Skills**: [`bash`]
    - Reason: Requires shell scripting expertise.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 5, 6
  - **Blocked By**: 3

  **References**:
  - `project.sh`: The target script.
  - `check_service_status`: The newly implemented function.
  - `WORKER_LOG`, `WORKER_PID_FILE`: Existing variables.

  **Acceptance Criteria**:
  - [ ] `start_worker` calls `check_service_status` after attempting to start the service.
  - [ ] `start_worker` captures the success/failure status of `check_service_status`.
  - [ ] `start_worker` prints an appropriate message (e.g., success or "attempted to start, checking status...").
  - **Manual Verification:**
    ```bash
    # Stop all services first
    ./project.sh stop all
    # Simulate worker success (no specific port to check)
    ./project.sh start:mvp # (this starts worker)
    # Simulate worker failure (e.g., comment out command in packages/server/package.json for worker)
    # Modify worker script in package.json to fail: "worker": "exit 1"
    # ./project.sh start:mvp
    # Revert worker script
    ```

- [x] 5. Modify `start` function in `project.sh` for consolidated reporting

  **What to do**:
  - The `start` function currently calls `start_client` and `start_server`.
  - Introduce variables (e.g., `client_status`, `server_status`) to store the return codes of `start_client` and `start_server`.
  - After attempting to start all requested services (client, server, or both), create a consolidated report.
  - If any service failed, print a final summary indicating which services failed, and reiterate to check their logs.
  - The `start` function should return a non-zero exit code if any service failed.

  **Must NOT do**:
  - Change the `case` statement logic for `client`, `server`, `all`.
  - Remove the `start_client` or `start_server` calls.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Direct script modification, focused on flow control and reporting.
  - **Skills**: [`bash`]
    - Reason: Requires shell scripting expertise.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 6
  - **Blocked By**: 4

  **References**:
  - `project.sh`: The target script.
  - `start_client`, `start_server`: Functions to be called.

  **Acceptance Criteria**:
  - [ ] `start` function stores individual service startup results.
  - [ ] `start` function provides a consolidated summary at the end, listing all failed services.
  - [ ] `start` function returns a non-zero exit code if any service failed.
  - **Manual Verification:**
    ```bash
    # Stop all services first
    ./project.sh stop all
    # Simulate client failure (occupy port 10086)
    # python -m http.server 10086 &
    # ./project.sh start all
    # Expect consolidated error report for client
    # kill %1
    # Simulate server failure (occupy port 3000)
    # python -m http.server 3000 &
    # ./project.sh start all
    # Expect consolidated error report for server
    # kill %1
    # Simulate both failure
    # python -m http.server 10086 & python -m http.server 3000 &
    # ./project.sh start all
    # Expect consolidated error report for both
    # kill %1; kill %2
    ```

- [x] 6. Modify `start_mvp` function in `project.sh` for consolidated reporting

  **What to do**:
  - The `start_mvp` function calls `start_db`, `run_migrate`, `start_server`, `start_worker`, `start_client`.
  - Introduce variables to store the return codes of `start_server`, `start_worker`, and `start_client`. (No need to verify `start_db` and `run_migrate` in the same way, as they are not long-running services to monitor.)
  - After attempting to start all relevant services, create a consolidated report.
  - If any service failed, print a final summary indicating which services failed, and reiterate to check their logs.
  - The `start_mvp` function should return a non-zero exit code if any service failed.

  **Must NOT do**:
  - Change the core logic of `start_db` or `run_migrate`.
  - Exit immediately on first service failure.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Direct script modification, focused on flow control and reporting.
  - **Skills**: [`bash`]
    - Reason: Requires shell scripting expertise.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: 5

  **References**:
  - `project.sh`: The target script.
  - `start_client`, `start_server`, `start_worker`: Functions to be called.

  **Acceptance Criteria**:
  - [ ] `start_mvp` function stores individual service startup results.
  - [ ] `start_mvp` function provides a consolidated summary at the end, listing all failed services.
  - [ ] `start_mvp` function returns a non-zero exit code if any service failed.
  - **Manual Verification:**
    ```bash
    # Stop all services first
    ./project.sh stop all
    # Simulate server failure (occupy port 3000)
    # python -m http.server 3000 &
    # ./project.sh start:mvp
    # Expect consolidated error report for server
    # kill %1
    # Simulate client failure (occupy port 10086)
    # python -m http.server 10086 &
    # ./project.sh start:mvp
    # Expect consolidated error report for client
    # kill %1
    ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat: add check_service_status helper function` | `project.sh` | Manual test function |
| 2 | `feat: integrate check_service_status into start_client` | `project.sh` | Manual test client start/fail |
| 3 | `feat: integrate check_service_status into start_server` | `project.sh` | Manual test server start/fail |
| 4 | `feat: integrate check_service_status into start_worker` | `project.sh` | Manual test worker start/fail |
| 5 | `feat: add consolidated error reporting to start command` | `project.sh` | Manual test start all/partial fail |
| 6 | `feat: add consolidated error reporting to start:mvp command` | `project.sh` | Manual test start:mvp all/partial fail |

---

## Success Criteria

### Verification Commands
```bash
# Test successful startup of all services
./project.sh stop all
./project.sh start all
# Expected: All services report "✅" and no error summary. Script exits with 0.

# Test successful startup of MVP
./project.sh stop all
./project.sh start:mvp
# Expected: All MVP services report "✅" and no error summary. Script exits with 0.

# Test client failure (occupy port 10086)
./project.sh stop all
python -m http.server 10086 & # Occupy client port
sleep 1
./project.sh start all
# Expected: Client reports "❌" with log snippet. Server starts successfully. Consolidated summary lists client as failed. Script exits with non-zero.
kill %1 # Clean up dummy server

# Test server failure (occupy port 3000)
./project.sh stop all
python -m http.server 3000 & # Occupy server port
sleep 1
./project.sh start all
# Expected: Server reports "❌" with log snippet. Client starts successfully. Consolidated summary lists server as failed. Script exits with non-zero.
kill %1 # Clean up dummy server

# Test worker failure (simulate script error)
./project.sh stop all
# Temporarily modify packages/server/package.json to make worker fail
# (e.g., change "worker": "ts-node-dev..." to "worker": "exit 1")
# For this test, we assume the check_service_status will catch a non-running PID
./project.sh start:mvp
# Expected: Worker reports "❌" with log snippet. Other services may start. Consolidated summary lists worker as failed. Script exits with non-zero.
# Remember to revert the worker script modification.
```

### Final Checklist
- [x] All "Must Have" present in `project.sh` functionality.
- [x] All "Must NOT Have" absent from `project.sh`.
- [x] Manual verification tests pass as described above.
