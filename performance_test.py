import time
import requests

# 测试dashboard接口的性能
def test_dashboard_performance():
    # 先登录获取token
    login_url = "http://localhost:3000/api/auth/login"
    dashboard_url = "http://localhost:3000/api/data/board"
    
    # 登录参数
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # 登录获取token
    print("登录获取token...")
    try:
        login_response = requests.post(login_url, json=login_data, headers=headers, timeout=10)
        if login_response.status_code == 200:
            login_data = login_response.json()
            token = login_data.get("token")
            if token:
                print("登录成功，获取到token")
                headers["Authorization"] = f"Bearer {token}"
            else:
                print("登录成功，但未获取到token")
                return
        else:
            print(f"登录失败，状态码: {login_response.status_code}")
            print(f"响应内容: {login_response.text}")
            return
    except Exception as e:
        print(f"登录失败: {e}")
        return
    
    # 预热缓存
    print("\n预热缓存...")
    try:
        response = requests.get(dashboard_url, headers=headers, timeout=10)
        if response.status_code == 200:
            print("预热成功")
        else:
            print(f"预热失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
    except Exception as e:
        print(f"预热失败: {e}")
    
    # 测试多次请求的响应时间
    print("\n测试响应时间...")
    times = []
    for i in range(10):
        start_time = time.time()
        try:
            response = requests.get(dashboard_url, headers=headers, timeout=10)
            end_time = time.time()
            elapsed = (end_time - start_time) * 1000  # 转换为毫秒
            times.append(elapsed)
            if response.status_code == 200:
                print(f"请求 {i+1}: {elapsed:.2f}ms")
            else:
                print(f"请求 {i+1}: 失败，状态码: {response.status_code}")
                print(f"响应内容: {response.text}")
        except Exception as e:
            print(f"请求 {i+1}: 错误 - {e}")
    
    # 计算统计数据
    if times:
        average = sum(times) / len(times)
        minimum = min(times)
        maximum = max(times)
        print(f"\n统计结果:")
        print(f"平均响应时间: {average:.2f}ms")
        print(f"最小响应时间: {minimum:.2f}ms")
        print(f"最大响应时间: {maximum:.2f}ms")
    else:
        print("没有有效的响应时间数据")

if __name__ == "__main__":
    test_dashboard_performance()
