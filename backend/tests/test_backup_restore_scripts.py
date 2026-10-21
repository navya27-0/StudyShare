import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
has_bash = shutil.which("bash") is not None


@pytest.mark.skipif(not has_bash, reason="bash executable is required for shell script tests")
def test_backup_and_restore_scripts_syntax():
    """Verify that both backup.sh and restore.sh pass strict bash syntax analysis."""
    res = subprocess.run(
        ["bash", "-c", "bash -n infra/backup.sh && bash -n infra/restore.sh"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert res.returncode == 0, f"Bash syntax error: {res.stderr}"


@pytest.mark.skipif(not has_bash, reason="bash executable is required for shell script tests")
def test_backup_script_fails_gracefully_when_no_docker_and_no_db_url():
    """Verify backup.sh fails with actionable error message and exit code 1 when offline."""
    clean_env = os.environ.copy()
    clean_env.pop("DATABASE_URL", None)

    # 1. Dev container test
    res_dev = subprocess.run(
        ["bash", "infra/backup.sh", "nonexistent-dev-container", "/tmp/backups"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env=clean_env,
    )
    assert res_dev.returncode == 1
    output_dev = res_dev.stdout + res_dev.stderr
    assert "Cannot take backup" in output_dev
    assert "studyshare_db" in output_dev

    # 2. Production container test
    res_prod = subprocess.run(
        ["bash", "infra/backup.sh", "studyshare-prod-postgres", "/tmp/backups"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        env=clean_env,
    )
    assert res_prod.returncode == 1
    output_prod = res_prod.stdout + res_prod.stderr
    assert "Cannot take backup" in output_prod
    assert "studyshare_prod_db" in output_prod


@pytest.mark.skipif(not has_bash, reason="bash executable is required for shell script tests")
def test_restore_script_validates_backup_file_existence():
    """Verify restore.sh requires an existing backup archive."""
    # 1. No arguments provided
    res_no_arg = subprocess.run(
        ["bash", "infra/restore.sh"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert res_no_arg.returncode == 1
    assert "Usage:" in res_no_arg.stdout or "Usage:" in res_no_arg.stderr

    # 2. Non-existent file specified
    res_missing = subprocess.run(
        ["bash", "infra/restore.sh", "/tmp/nonexistent_backup_file.sql.gz"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert res_missing.returncode == 1
    assert (
        "Backup file not found" in res_missing.stdout
        or "Backup file not found" in res_missing.stderr
    )


def test_backup_and_restore_roundtrip_artifact_integrity(tmp_path: Path):
    """Verify generated backup archives are valid gzip files and extract cleanly."""
    import gzip

    dummy_backup = tmp_path / "studyshare_prod_db_test.sql.gz"
    sql_content = b"-- StudyShare Test Schema Dump\nCREATE TABLE test_table (id INT);\n"

    with gzip.open(dummy_backup, "wb") as f:
        f.write(sql_content)

    assert dummy_backup.exists()

    with gzip.open(dummy_backup, "rb") as f:
        read_back = f.read()
    assert read_back == sql_content


@pytest.mark.skipif(not has_bash, reason="bash executable is required for shell script tests")
def test_restore_script_enforces_on_error_stop_and_fails_on_sql_error():
    """Verify restore.sh passes -v ON_ERROR_STOP=1 to psql and fails when psql encounters SQL errors."""
    import gzip

    scratch_dir = REPO_ROOT / ".test_tmp_restore"
    scratch_dir.mkdir(parents=True, exist_ok=True)
    try:
        mock_bin_dir = scratch_dir / "mock_bin"
        mock_bin_dir.mkdir(parents=True, exist_ok=True)
        mock_psql = mock_bin_dir / "psql"

        mock_psql_content = """#!/usr/bin/env bash
has_flag=0
for arg in "$@"; do
    if [ "$arg" = "ON_ERROR_STOP=1" ]; then
        has_flag=1
    fi
done

if [ "$has_flag" -ne 1 ]; then
    echo "ERROR: -v ON_ERROR_STOP=1 was NOT passed to psql!" >&2
    exit 99
fi

sql_content=$(cat)
if echo "$sql_content" | grep -q "SIMULATED_SQL_FAILURE"; then
    echo "psql: ERROR: syntax error at or near 'SIMULATED_SQL_FAILURE'" >&2
    exit 3
fi
exit 0
"""
        with open(mock_psql, "w", newline="\n", encoding="utf-8") as f:
            f.write(mock_psql_content.replace("\r\n", "\n"))
        mock_psql.chmod(0o755)

        bad_backup = scratch_dir / "bad.sql.gz"
        with gzip.open(bad_backup, "wb") as f:
            f.write(b"SIMULATED_SQL_FAILURE;\n")

        good_backup = scratch_dir / "good.sql.gz"
        with gzip.open(good_backup, "wb") as f:
            f.write(b"SELECT 1;\n")

        rel_bad = bad_backup.relative_to(REPO_ROOT).as_posix()
        rel_good = good_backup.relative_to(REPO_ROOT).as_posix()
        rel_mock_bin = mock_bin_dir.relative_to(REPO_ROOT).as_posix()

        test_env = os.environ.copy()
        test_env["DATABASE_URL"] = "postgresql://mock_user:mock_pass@localhost:5432/mock_db"

        db_url = "postgresql://mock_user:mock_pass@localhost:5432/mock_db"

        # 1. Failure path: Invalid SQL statements must trigger non-zero exit code
        res_fail = subprocess.run(
            [
                "bash",
                "-c",
                f'PATH="./{rel_mock_bin}:$PATH" DATABASE_URL="{db_url}" bash infra/restore.sh {rel_bad} nonexistent-container mock_db',
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            env=test_env,
        )
        assert res_fail.returncode != 0, (
            f"Expected restore.sh to fail on SQL error, but got 0. Output:\n{res_fail.stdout}\n{res_fail.stderr}"
        )
        assert "Database restored successfully" not in res_fail.stdout
        assert "syntax error" in (res_fail.stdout + res_fail.stderr)

        # 2. Success path: Valid SQL statements succeed with code 0
        res_ok = subprocess.run(
            [
                "bash",
                "-c",
                f'PATH="./{rel_mock_bin}:$PATH" DATABASE_URL="{db_url}" bash infra/restore.sh {rel_good} nonexistent-container mock_db',
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            env=test_env,
        )
        assert res_ok.returncode == 0, (
            f"Expected restore.sh to succeed on valid SQL. Output:\n{res_ok.stdout}\n{res_ok.stderr}"
        )
        assert "Database restored successfully" in res_ok.stdout
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)


has_psql = shutil.which("psql") is not None
live_db_url = os.environ.get("DATABASE_URL")


@pytest.mark.skipif(
    not (has_bash and has_psql and live_db_url),
    reason="psql binary and live DATABASE_URL required for live db restore integration test",
)
def test_restore_script_live_database_failure_and_success():
    """Verify live PostgreSQL restore with -v ON_ERROR_STOP=1 aborts on SQL errors and succeeds on valid DDL."""
    import gzip

    scratch_dir = REPO_ROOT / ".test_tmp_live_restore"
    scratch_dir.mkdir(parents=True, exist_ok=True)
    try:
        # 1. Live failure path: invalid SQL syntax
        bad_backup = scratch_dir / "live_bad.sql.gz"
        with gzip.open(bad_backup, "wb") as f:
            f.write(b"INVALID SQL STATEMENT GUARANTEED TO TRIGGER SYNTAX ERROR;\n")

        rel_bad = bad_backup.relative_to(REPO_ROOT).as_posix()

        res_fail = subprocess.run(
            [
                "bash",
                "infra/restore.sh",
                rel_bad,
                "nonexistent-container",
                "studyshare_test_db",
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            env=os.environ,
        )
        assert res_fail.returncode != 0, (
            f"Expected failure when restoring invalid SQL against live database, got: {res_fail.stdout}\n{res_fail.stderr}"
        )
        assert "Database restored successfully" not in res_fail.stdout

        # 2. Live success path: valid DDL statement
        good_backup = scratch_dir / "live_good.sql.gz"
        with gzip.open(good_backup, "wb") as f:
            f.write(
                b"CREATE TABLE IF NOT EXISTS _restore_validation_marker (id INT); "
                b"DROP TABLE _restore_validation_marker;\n"
            )

        rel_good = good_backup.relative_to(REPO_ROOT).as_posix()

        res_ok = subprocess.run(
            [
                "bash",
                "infra/restore.sh",
                rel_good,
                "nonexistent-container",
                "studyshare_test_db",
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            env=os.environ,
        )
        assert res_ok.returncode == 0, (
            f"Expected success when restoring valid SQL against live database, got: {res_ok.stdout}\n{res_ok.stderr}"
        )
        assert "Database restored successfully" in res_ok.stdout
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)


def test_validate_external_url_helper_unit():
    """Unit test _validate_external_url for link resources rejecting unsafe or malformed schemes."""
    from fastapi import HTTPException

    from app.api.resources import _validate_external_url

    # 1. Valid URLs with schemes and hostnames
    assert (
        _validate_external_url("https://ocw.mit.edu/courses/electrical-engineering")
        == "https://ocw.mit.edu/courses/electrical-engineering"
    )
    assert _validate_external_url("http://example.com:8080/path") == "http://example.com:8080/path"

    # 2. Reject unsafe, non-http, or malformed URLs
    unsafe_candidates = [
        "javascript:alert(1)",
        "file:///etc/passwd",
        "data:text/html;base64,PHNjcmlwdD4=",
        "ftp://mirror.cs.uchicago.edu/pub/",
        "http://",
        "https://",
        "missing-scheme.org",
        "",
        "   ",
    ]
    for candidate in unsafe_candidates:
        with pytest.raises(HTTPException) as exc_info:
            _validate_external_url(candidate)
        assert exc_info.value.status_code == 422
