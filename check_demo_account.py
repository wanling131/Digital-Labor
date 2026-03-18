import sys
sys.path.insert(0, 'server')

from sqlalchemy import text
from digital_labor.db import get_engine

engine = get_engine()
with engine.connect() as conn:
    result = conn.execute(text('SELECT id, work_no, name, mobile FROM person WHERE mobile = :m'), {'m': '13800138000'})
    print('演示账号是否存在:', result.mappings().first())
    
    # 查看前几个人员记录
    print('\n前5个人员记录:')
    result2 = conn.execute(text('SELECT id, work_no, name, mobile FROM person LIMIT 5'))
    for row in result2.mappings():
        print(dict(row))
