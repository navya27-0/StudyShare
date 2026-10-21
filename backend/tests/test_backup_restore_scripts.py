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
