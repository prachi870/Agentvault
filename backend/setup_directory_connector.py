#!/usr/bin/env python3
"""
Quick setup script for ESAKIP Directory Connector
Creates a connector, syncs sample documents, and tests querying.
"""
import requests
import json
from time import sleep

BASE_URL = "http://localhost:8000/api/v1"

def get_token(username="admin@corp.test", password="Passw0rd!x"):
    """Login and get JWT token"""
    print(f"\n🔐 Logging in as {username}...")
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": username,
        "password": password
    })
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("✅ Login successful!")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def create_connector(token):
    """Create a directory connector for sample_docs"""
    print("\n📁 Creating directory connector...")
    response = requests.post(
        f"{BASE_URL}/connectors",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Sample Documents",
            "kind": "directory",
            "source_type": "drive",
            "config": {
                "path": "sample_docs",
                "recursive": True
            },
            "default_classification": "internal",
            "default_allowed_roles": ["employee", "manager", "admin"]
        }
    )
    
    if response.status_code == 201:
        connector = response.json()
        print(f"✅ Connector created: {connector['name']} (ID: {connector['id']})")
        return connector["id"]
    elif response.status_code == 409:
        print("⚠️  Connector already exists, fetching existing...")
        # List connectors and find ours
        response = requests.get(
            f"{BASE_URL}/connectors",
            headers={"Authorization": f"Bearer {token}"}
        )
        for conn in response.json():
            if conn["name"] == "Sample Documents":
                print(f"✅ Found existing connector: {conn['id']}")
                return conn["id"]
    else:
        print(f"❌ Failed to create connector: {response.status_code}")
        print(response.text)
        return None

def sync_connector(token, connector_id):
    """Trigger connector sync"""
    print(f"\n🔄 Syncing connector {connector_id}...")
    response = requests.post(
        f"{BASE_URL}/connectors/{connector_id}/sync",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        result = response.json()
        stats = result.get("stats", {})
        print(f"✅ Sync completed!")
        print(f"   - Created: {stats.get('created', 0)}")
        print(f"   - Updated: {stats.get('updated', 0)}")
        print(f"   - Unchanged: {stats.get('unchanged', 0)}")
        print(f"   - Failed: {stats.get('failed', 0)}")
        print(f"   - Removed: {stats.get('removed', 0)}")
        return True
    else:
        print(f"❌ Sync failed: {response.status_code}")
        print(response.text)
        return False

def list_documents(token):
    """List indexed documents"""
    print("\n📚 Listing indexed documents...")
    response = requests.get(
        f"{BASE_URL}/documents",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        docs = response.json()
        print(f"✅ Found {len(docs)} documents:")
        for doc in docs[:10]:  # Show first 10
            print(f"   - {doc['title']} ({doc['source_type']}, {doc['classification']})")
        if len(docs) > 10:
            print(f"   ... and {len(docs) - 10} more")
        return len(docs)
    else:
        print(f"❌ Failed to list documents: {response.status_code}")
        return 0

def test_query(token, question):
    """Test RAG query"""
    print(f"\n❓ Asking: {question}")
    response = requests.post(
        f"{BASE_URL}/query",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question": question,
            "mode": "rag"
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Answer received:")
        print(f"\n{result['answer']}\n")
        print(f"Sources: {len(result.get('sources', []))} documents")
        if result.get("sources"):
            for i, source in enumerate(result["sources"][:3], 1):
                print(f"   {i}. {source.get('title', 'Untitled')}")
        return True
    else:
        print(f"❌ Query failed: {response.status_code}")
        print(response.text)
        return False

def main():
    print("=" * 60)
    print("ESAKIP Directory Connector Setup")
    print("=" * 60)
    
    # Step 1: Login
    token = get_token()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Step 2: Create connector
    connector_id = create_connector(token)
    if not connector_id:
        print("\n❌ Cannot proceed without connector")
        return
    
    # Step 3: Sync documents
    if not sync_connector(token, connector_id):
        print("\n❌ Sync failed, but connector is created")
        return
    
    # Wait a moment for indexing
    print("\n⏳ Waiting for indexing to complete...")
    sleep(2)
    
    # Step 4: List documents
    doc_count = list_documents(token)
    
    # Step 5: Test queries
    if doc_count > 0:
        print("\n" + "=" * 60)
        print("Testing RAG Queries")
        print("=" * 60)
        
        test_query(token, "What are the security classifications in ESAKIP?")
        
        sleep(1)
        test_query(token, "What connectors are supported?")
        
        sleep(1)
        test_query(token, "What is the remote work policy?")
    
    print("\n" + "=" * 60)
    print("✅ Setup Complete!")
    print("=" * 60)
    print("\nYour connector is ready and documents are indexed.")
    print("Try more queries at: http://localhost:3000")
    print("\nOr use the API:")
    print(f'  curl -H "Authorization: Bearer {token[:20]}..." \\')
    print(f'    -X POST {BASE_URL}/query \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"question":"Your question here","mode":"rag"}\'')

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
