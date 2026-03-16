import sqlite3

# 连接到 SQLite 数据库
conn = sqlite3.connect('demo.sqlite3')
cursor = conn.cursor()

# 查询 user 表中的用户名和密码哈希
cursor.execute("SELECT username, password_hash FROM user;")
rows = cursor.fetchall()

print("User table content:")
for row in rows:
    username, password_hash = row
    print(f"Username: {username}, Password hash: {password_hash}")
    # 检查密码哈希是否是 bcrypt 格式（以 $2b$ 开头）
    if password_hash.startswith('$2b$'):
        print("  ✅ Password is hashed with bcrypt")
    else:
        print("  ⚠️  Password is stored in plain text")

# 关闭连接
conn.close()
