"""
API Configuration
Update these settings based on your deployment environment
"""

# Development (localhost)
DEV_API_URL = 'http://localhost:5000/api'
DEV_BASE_URL = 'http://localhost:5000'

# Production (replace with your server IP/domain)
PROD_API_URL = 'http://YOUR_SERVER_IP:5000/api'
PROD_BASE_URL = 'http://YOUR_SERVER_IP:5000'

# For Android emulator (use 10.0.2.2 instead of localhost)
ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:5000/api'
ANDROID_EMULATOR_BASE_URL = 'http://10.0.2.2:5000'

# For physical device on same network (use computer's local IP)
# Find your IP: Windows (ipconfig), Mac/Linux (ifconfig)
LOCAL_NETWORK_API_URL = 'http://192.168.X.X:5000/api'
LOCAL_NETWORK_BASE_URL = 'http://192.168.X.X:5000'

# Current environment
CURRENT_ENV = 'development'  # 'development' | 'production' | 'android_emulator' | 'local_network'

# Export based on environment
if CURRENT_ENV == 'development':
    API_BASE_URL = DEV_API_URL
    BASE_URL = DEV_BASE_URL
elif CURRENT_ENV == 'android_emulator':
    API_BASE_URL = ANDROID_EMULATOR_API_URL
    BASE_URL = ANDROID_EMULATOR_BASE_URL
elif CURRENT_ENV == 'local_network':
    API_BASE_URL = LOCAL_NETWORK_API_URL
    BASE_URL = LOCAL_NETWORK_BASE_URL
else:
    API_BASE_URL = PROD_API_URL
    BASE_URL = PROD_BASE_URL
