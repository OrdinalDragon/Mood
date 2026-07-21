import re

with open("mood_db_backup.sql", "r", encoding="utf-16-le") as f:
    sql = f.read()

# Extract proper CREATE TABLE columns (only data columns, not indexes)
m = re.search(r"CREATE TABLE `events`\s*\((.*?)\) ENGINE=", sql, re.DOTALL)
if m:
    # Only match lines with actual column definitions (start with backtick, followed by type)
    cols = re.findall(r"^\s*`(\w+)`\s+(varchar|text|datetime|enum|tinyint|int|longtext)", m.group(1), re.MULTILINE)
    print(f"Events columns ({len(cols)}): {[c[0] for c in cols]}")
else:
    print("Could not find events CREATE TABLE")

m = re.search(r"CREATE TABLE `users`\s*\((.*?)\) ENGINE=", sql, re.DOTALL)
if m:
    cols = re.findall(r"^\s*`(\w+)`\s+(varchar|text|datetime|enum|tinyint|int|longtext)", m.group(1), re.MULTILINE)
    print(f"Users columns ({len(cols)}): {[c[0] for c in cols]}")
else:
    print("Could not find users CREATE TABLE")

# Count rows
ev_start = sql.find("INSERT INTO `events` VALUES")
ev_end = sql.find("INSERT INTO `users` VALUES")
ev_data = sql[ev_start:ev_end]
ev_rows = ev_data.count("),")  # each row ends with ), except last
print(f"Events rows: {ev_rows}")

us_start = sql.find("INSERT INTO `users` VALUES")
us_end = sql.find(";", us_start)
us_data = sql[us_start:us_end+1]  # include ;
us_rows = us_data.count("),")
# Check if last row ends with ;
if us_data.rstrip().endswith(";"):
    print(f"Users rows: {us_rows}")
else:
    # Adjust - last row doesn't have trailing comma
    print(f"Users rows: {us_rows + 1}")
