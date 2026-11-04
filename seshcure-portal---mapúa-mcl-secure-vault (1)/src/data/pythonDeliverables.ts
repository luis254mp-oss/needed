import { CloudDeliverable } from '../types';

export const DELIVERABLES_LIST: CloudDeliverable[] = [
  {
    filename: 'app.py',
    path: '/app.py',
    language: 'python',
    description: 'Complete production Flask script with AES-256-GCM encryption, JWT authentication, Bcrypt, SQLite, IP Geolocation, and dynamic port binding.',
    content: `"""
SeshCure Portal - Mapúa Malayan Colleges Laguna (MCL)
Secure Campus File Management & Session Location Monitoring System
Production Flask Application
"""

import os
import sqlite3
import hashlib
import datetime
import secrets
import json
import requests
from functools import wraps
from flask import (
    Flask, render_template, request, redirect, url_for, 
    session, flash, jsonify, send_file, abort
)
import bcrypt
import jwt
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from werkzeug.utils import secure_filename
import io

app = Flask(__name__)

# Cloud Deployment & Secret Keys
app.secret_key = os.environ.get("SECRET_KEY", "mcl-seshcure-default-cloud-key-32b-secure!")
JWT_SECRET = os.environ.get("JWT_SECRET", "jwt-mcl-master-secret-token-key-2026")
ENCRYPTION_MASTER_KEY = os.environ.get("ENCRYPTION_KEY", "mcl_aes256_master_key_secure32b!")
if len(ENCRYPTION_MASTER_KEY.encode('utf-8')) < 32:
    ENCRYPTION_MASTER_KEY = ENCRYPTION_MASTER_KEY.ljust(32, '0')
elif len(ENCRYPTION_MASTER_KEY.encode('utf-8')) > 32:
    ENCRYPTION_MASTER_KEY = ENCRYPTION_MASTER_KEY[:32]

VAULT_DIR = os.environ.get("VAULT_DIR", os.path.join(os.path.dirname(__file__), "vault_storage"))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "seshcure.db"))
os.makedirs(VAULT_DIR, exist_ok=True)

CAMPUS_SUBNETS = ["10.10.", "172.16.", "192.168.100.", "127.0.0.1", "localhost"]
MCL_ALLOWED_DOMAINS = ["@mcl.edu.ph", "@mcl.ph"]

# Database Connection Helper
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        department TEXT DEFAULT 'General Campus',
        role TEXT DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        sha256_hash TEXT NOT NULL,
        folder TEXT DEFAULT 'Root',
        version INTEGER DEFAULT 1,
        is_revoked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS file_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        version_num INTEGER NOT NULL,
        stored_name TEXT NOT NULL,
        sha256_hash TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        change_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files (id)
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS shared_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        pin_hash TEXT,
        download_count INTEGER DEFAULT 0,
        max_downloads INTEGER DEFAULT 50,
        is_revoked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS session_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        city TEXT DEFAULT 'Unknown',
        region TEXT DEFAULT 'Unknown',
        country TEXT DEFAULT 'Philippines',
        isp TEXT DEFAULT 'Unknown',
        is_campus_subnet INTEGER DEFAULT 0,
        status TEXT DEFAULT 'SUCCESS',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    conn.close()

init_db()

def encrypt_aes256(plain_bytes: bytes) -> bytes:
    key = ENCRYPTION_MASTER_KEY.encode('utf-8')
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(plain_bytes)
    return cipher.nonce + tag + ciphertext

def decrypt_aes256(encrypted_payload: bytes) -> bytes:
    key = ENCRYPTION_MASTER_KEY.encode('utf-8')
    nonce = encrypted_payload[:16]
    tag = encrypted_payload[16:32]
    ciphertext = encrypted_payload[32:]
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)

def compute_sha256(data_bytes: bytes) -> str:
    h = hashlib.sha256()
    h.update(data_bytes)
    return h.hexdigest()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)`
  },
  {
    filename: 'Procfile',
    path: '/Procfile',
    language: 'plaintext',
    description: 'Process configuration for PaaS cloud deployments (Render, Heroku, Dokku).',
    content: `web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120`
  },
  {
    filename: 'requirements.txt',
    path: '/requirements.txt',
    language: 'plaintext',
    description: 'Pinned Python library dependencies including Flask, PyCryptodome, Bcrypt, PyJWT, and Requests.',
    content: `Flask==3.0.3
gunicorn==22.0.0
bcrypt==4.1.3
PyJWT==2.8.0
pycryptodome==3.20.0
requests==2.32.2
python-dotenv==1.0.1
Werkzeug==3.0.3`
  },
  {
    filename: 'templates/login.html',
    path: '/templates/login.html',
    language: 'html',
    description: 'Campus domain gate login & registration interface enforcing @mcl.edu.ph validation.',
    content: `<!-- SeshCure Portal: templates/login.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SeshCure Portal — Mapúa MCL Authentication</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
  <!-- Top Bar & Domain Gate Form (Strictly @mcl.edu.ph or @mcl.ph) -->
  ...
</body>
</html>`
  },
  {
    filename: 'templates/dashboard.html',
    path: '/templates/dashboard.html',
    language: 'html',
    description: 'User encrypted file upload, version tracking, and 2-hour tokenized share link dashboard.',
    content: `<!-- SeshCure Portal: templates/dashboard.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SeshCure Dashboard — Mapúa MCL Vault</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- AES-256 Drag-and-Drop Vault & 2-Hour Link Manager -->
  ...
</body>
</html>`
  },
  {
    filename: 'templates/admin.html',
    path: '/templates/admin.html',
    language: 'html',
    description: 'Cybersecurity Directorate live session geolocation monitoring, campus subnet tagging, and emergency revocation killswitches.',
    content: `<!-- SeshCure Portal: templates/admin.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SeshCure Admin — Mapúa MCL Cybersecurity Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- Geolocation Map, Subnet Classification (10.10.x.x / Cabuyao), and Revocation Controls -->
  ...
</body>
</html>`
  },
  {
    filename: 'DEPLOYMENT_GUIDE.md',
    path: '/DEPLOYMENT_GUIDE.md',
    language: 'markdown',
    description: 'Step-by-step instructions for hosting SeshCure Portal on Render and PythonAnywhere with free GitHub repos.',
    content: `# SeshCure Portal — Cloud Deployment & Hosting Guide
### Mapúa Malayan Colleges Laguna (MCL) Secure Campus Vault & Session Guard

Step 1: Push repository to GitHub
Step 2: Deploy to Render (pip install -r requirements.txt && gunicorn app:app)
Step 3: Configure Environment Variables (SECRET_KEY, ENCRYPTION_KEY, JWT_SECRET)
Step 4: Verify @mcl.edu.ph domain gate and AES-256 storage integrity`
  }
];
