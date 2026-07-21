# Backup Script - MOOD Database (MongoDB)
# Run on the OLD PC before moving:
#   python backup_db.py
#
# This creates mood_db_backup/ directory with BSON data

import os
import subprocess
import sys

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mood_user:mood_password@mongo:27017/mood_db?authSource=admin")
BACKUP_DIR = "mood_db_backup_mongo"


def backup_database():
    print("Backing up MOOD database (MongoDB)...")

    try:
        result = subprocess.run(
            ["docker", "exec", "mood_mongo", "mongodump",
             "--uri", MONGO_URI,
             "--out", f"/data/{BACKUP_DIR}"],
            capture_output=True,
            text=True,
            timeout=120
        )

        # Copy backup from container to host
        copy_result = subprocess.run(
            ["docker", "cp", f"mood_mongo:/data/{BACKUP_DIR}", "."],
            capture_output=True,
            text=True,
            timeout=60
        )

        print(f"Database backup created: {BACKUP_DIR}/")
        return True

    except subprocess.TimeoutExpired:
        print("Error: Backup timed out")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    backup_database()
