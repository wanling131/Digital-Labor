import sys
import os

# 添加 server 目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from digital_labor.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print('Person count:', conn.execute(text('SELECT COUNT(*) FROM person')).scalar_one())
    print('Attendance count:', conn.execute(text('SELECT COUNT(*) FROM attendance')).scalar_one())
    print('Contract count:', conn.execute(text('SELECT COUNT(*) FROM contract_instance')).scalar_one())
    print('Org count:', conn.execute(text('SELECT COUNT(*) FROM org')).scalar_one())
    print('\nRecent persons:')
    persons = conn.execute(text('SELECT id, name, created_at FROM person ORDER BY created_at DESC LIMIT 5')).mappings().all()
    for p in persons:
        print(f'  {p["name"]} - {p["created_at"]}')
    print('\nRecent attendance:')
    attendance = conn.execute(text('SELECT work_date, COUNT(*) as count FROM attendance GROUP BY work_date ORDER BY work_date DESC LIMIT 5')).mappings().all()
    for a in attendance:
        print(f'  {a["work_date"]} - {a["count"]} records')
    print('\nRecent contracts:')
    contracts = conn.execute(text('SELECT id, status, signed_at FROM contract_instance WHERE signed_at IS NOT NULL ORDER BY signed_at DESC LIMIT 5')).mappings().all()
    for c in contracts:
        print(f'  {c["status"]} - {c["signed_at"]}')
    print('\nOrgs:')
    orgs = conn.execute(text('SELECT id, name, type FROM org ORDER BY id')).mappings().all()
    for o in orgs:
        print(f'  {o["name"]} ({o["type"]})')
