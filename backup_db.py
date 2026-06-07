# Backup Script - MOOD Database
# Run on the OLD PC before moving:
#   python backup_db.py
# 
# This creates mood_db_backup.sql

import os
import subprocess
import sys

DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "mood_password")

def backup_database():
    print("Backing up MOOD database...")
    
    try:
        # Run mysqldump
        result = subprocess.run(
            ["docker", "exec", "mood_db", "mysqldump", 
             "-u", "mood_user", f"-p{DB_PASSWORD}", "mood_db"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            with open("mood_db_backup.sql", "w") as f:
                f.write(result.stdout)
            
            # Count tables
            lines = result.stdout.split("\n")
            tables = sum(1 for l in lines if l.startswith("-- Table structure"))
            
            print(f"Database backup created: mood_db_backup.sql")
            print(f"Backup size: {len(result.stdout)} bytes")
            return True
        else:
            print(f"Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("Error: Backup timed out")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    backup_database()
