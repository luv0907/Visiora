import firebase_admin
from firebase_admin import credentials, firestore
import sys

try:
    cred = credentials.Certificate('serviceAccountKey.json')
    app = firebase_admin.initialize_app(cred)
    db = firestore.client()
    # Try a simple read
    docs = db.collection('users').limit(1).get()
    print("SUCCESS: Connected to Firestore!")
except Exception as e:
    print(f"FAILED: {type(e).__name__} - {str(e)}")
    sys.exit(1)
