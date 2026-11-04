"""
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

# Initialize Flask App
app = Flask(__name__)

# Cloud Deployment & Secret Keys
app.secret_key = os.environ.get("SECRET_KEY", "mcl-seshcure-default-cloud-key-32b-secure!")
JWT_SECRET = os.environ.get("JWT_SECRET", "jwt-mcl-master-secret-token-key-2026")
ENCRYPTION_MASTER_KEY = os.environ.get("ENCRYPTION_KEY", "mcl_aes256_master_key_secure32b!")
# Ensure master key is exactly 32 bytes for AES-256
if len(ENCRYPTION_MASTER_KEY.encode('utf-8')) < 32:
    ENCRYPTION_MASTER_KEY = ENCRYPTION_MASTER_KEY.ljust(32, '0')
elif len(ENCRYPTION_MASTER_KEY.encode('utf-8')) > 32:
    ENCRYPTION_MASTER_KEY = ENCRYPTION_MASTER_KEY[:32]

VAULT_DIR = os.environ.get("VAULT_DIR", os.path.join(os.path.dirname(__file__), "vault_storage"))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "seshcure.db"))

os.makedirs(VAULT_DIR, exist_ok=True)

# Campus Subnet Definitions (MCL Cabuyao, Laguna)
CAMPUS_SUBNETS = ["10.10.", "172.16.", "192.168.100.", "127.0.0.1", "localhost"]
MCL_ALLOWED_DOMAINS = ["@live.mcl.edu.ph", "@mcl.edu.ph", "@mcl.ph"]

# Database Connection Helper
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
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
    )
    ''')

    # Files table
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
    )
    ''')

    # File Versions table
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
    )
    ''')

    # Shared Links table
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
    )
    ''')

    # Session & Geolocation Audit Logs table
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
    )
    ''')

    conn.commit()

    # Seed Default MCL Admin if not present
    cursor.execute("SELECT * FROM users WHERE email = 'admin@mcl.edu.ph'")
    if not cursor.fetchone():
        hashed_pw = bcrypt.hashpw("MCL_SecureAdmin2026!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute('''
        INSERT INTO users (email, password_hash, full_name, department, role)
        VALUES ('admin@mcl.edu.ph', ?, 'MCL IT Security Directorate', 'Campus Cybersecurity', 'admin')
        ''', (hashed_pw,))
        conn.commit()

    conn.close()

init_db()

# AES-256-GCM Encryption / Decryption Utilities
def encrypt_aes256(plain_bytes: bytes) -> bytes:
    """Encrypt raw file bytes with AES-256-GCM."""
    key = ENCRYPTION_MASTER_KEY.encode('utf-8')
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(plain_bytes)
    # Pack: nonce (16 bytes) + tag (16 bytes) + ciphertext
    return cipher.nonce + tag + ciphertext

def decrypt_aes256(encrypted_payload: bytes) -> bytes:
    """Decrypt payload with AES-256-GCM and verify integrity tag."""
    key = ENCRYPTION_MASTER_KEY.encode('utf-8')
    nonce = encrypted_payload[:16]
    tag = encrypted_payload[16:32]
    ciphertext = encrypted_payload[32:]
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    return cipher.decrypt_and_verify(ciphertext, tag)

def compute_sha256(data_bytes: bytes) -> str:
    """Calculate cryptographic SHA-256 checksum."""
    h = hashlib.sha256()
    h.update(data_bytes)
    return h.hexdigest()

# IP Geolocation Resolver
def resolve_ip_location(ip_addr: str):
    """Query IP geolocation or map internal campus addresses."""
    is_campus = any(ip_addr.startswith(subnet) for subnet in CAMPUS_SUBNETS)
    
    if is_campus or ip_addr in ["127.0.0.1", "::1"]:
        return {
            "city": "Cabuyao City",
            "region": "Laguna (CALABARZON)",
            "country": "Philippines",
            "isp": "Mapúa MCL Enterprise Campus Network",
            "is_campus": 1
        }
    
    try:
        resp = requests.get(f"http://ip-api.com/json/{ip_addr}?fields=status,country,regionName,city,isp", timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "success":
                return {
                    "city": data.get("city", "Unknown City"),
                    "region": data.get("regionName", "Unknown Region"),
                    "country": data.get("country", "Unknown Country"),
                    "isp": data.get("isp", "External ISP"),
                    "is_campus": 0
                }
    except Exception:
        pass

    return {
        "city": "External Client",
        "region": "Non-Campus Network",
        "country": "Philippines",
        "isp": "Public Route",
        "is_campus": 0
    }

def log_session(email, action, status="SUCCESS"):
    """Audit trail recorder."""
    # Capture real client IP behind reverse proxies (Render, Cloudflare, etc.)
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    loc = resolve_ip_location(client_ip)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
    INSERT INTO session_logs (user_email, action, ip_address, city, region, country, isp, is_campus_subnet, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        email, action, client_ip, 
        loc["city"], loc["region"], loc["country"], loc["isp"], 
        loc["is_campus"], status
    ))
    conn.commit()
    conn.close()

# JWT Helpers
def generate_jwt(user_id, email, role):
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = session.get("auth_token")
        if not token:
            flash("Please sign in with your official Mapúa MCL account.", "error")
            return redirect(url_for("login", next=request.url))
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = decoded
        except jwt.ExpiredSignatureError:
            session.clear()
            flash("Your secure session has expired. Please log in again.", "warning")
            return redirect(url_for("login"))
        except jwt.InvalidTokenError:
            session.clear()
            flash("Invalid security token. Access denied.", "error")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = session.get("auth_token")
        if not token:
            flash("Administrative authorization required.", "error")
            return redirect(url_for("login"))
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            if decoded.get("role") != "admin":
                flash("Access denied: Administrative privileges required.", "error")
                return redirect(url_for("dashboard"))
            request.user = decoded
        except Exception:
            session.clear()
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

# Routes
@app.route("/")
def index():
    if "auth_token" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        # Strict Campus Domain Gate
        if not any(email.endswith(dom) for dom in MCL_ALLOWED_DOMAINS):
            log_session(email or "unknown", "LOGIN_ATTEMPT_REJECTED_DOMAIN", "REJECTED")
            flash("Access Restricted: Only official Mapúa MCL emails (@mcl.edu.ph or @mcl.ph) are permitted.", "error")
            return render_template("login.html", email_val=email)

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()

        if user and bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
            if not user["is_active"]:
                log_session(email, "LOGIN_SUSPENDED_ACCOUNT", "DENIED")
                flash("Your account has been locked or suspended by Mapúa MCL Security.", "error")
                return render_template("login.html")

            token = generate_jwt(user["id"], user["email"], user["role"])
            session["auth_token"] = token
            session["user_email"] = user["email"]
            session["user_name"] = user["full_name"]
            session["user_role"] = user["role"]

            log_session(email, "LOGIN_SUCCESS", "SUCCESS")
            flash(f"Welcome back to SeshCure, {user['full_name']}!", "success")

            next_page = request.args.get("next")
            if next_page and next_page.startswith("/"):
                return redirect(next_page)
            return redirect(url_for("dashboard"))
        else:
            log_session(email, "LOGIN_INVALID_CREDENTIALS", "FAILED")
            flash("Invalid email or password combination. Please check your credentials.", "error")

    return render_template("login.html")

@app.route("/register", methods=["POST"])
def register():
    full_name = request.form.get("full_name", "").strip()
    email = request.form.get("email", "").strip().lower()
    department = request.form.get("department", "Mapúa Malayan Colleges Laguna")
    password = request.form.get("password", "")
    role = "faculty" if (email.startswith("prof") or email.startswith("engr") or "faculty" in email) else "student"

    if not any(email.endswith(dom) for dom in MCL_ALLOWED_DOMAINS):
        flash("Registration rejected: Only official Mapúa MCL domains (@mcl.edu.ph or @mcl.ph) are authorized.", "error")
        return redirect(url_for("login"))

    if len(password) < 8:
        flash("Password must be at least 8 characters long for end-to-end security.", "error")
        return redirect(url_for("login"))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        flash("An account with this MCL email is already registered. Please log in.", "warning")
        return redirect(url_for("login"))

    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cursor.execute('''
    INSERT INTO users (email, password_hash, full_name, department, role)
    VALUES (?, ?, ?, ?, ?)
    ''', (email, hashed_pw, full_name, department, role))
    conn.commit()
    conn.close()

    log_session(email, "USER_REGISTERED", "SUCCESS")
    flash("Account successfully created! You can now log into SeshCure Portal.", "success")
    return redirect(url_for("login"))

@app.route("/logout")
def logout():
    email = session.get("user_email", "guest")
    log_session(email, "LOGOUT", "SUCCESS")
    session.clear()
    flash("You have safely logged out of SeshCure Portal.", "info")
    return redirect(url_for("login"))

@app.route("/dashboard")
@token_required
def dashboard():
    user = request.user
    conn = get_db()
    cursor = conn.cursor()
    
    # Get user files
    cursor.execute('''
    SELECT f.*, 
        (SELECT COUNT(*) FROM file_versions v WHERE v.file_id = f.id) as version_count,
        (SELECT COUNT(*) FROM shared_links s WHERE s.file_id = f.id AND s.is_revoked = 0) as active_links
    FROM files f 
    WHERE f.user_id = ? AND f.is_revoked = 0
    ORDER BY f.created_at DESC
    ''', (user["user_id"],))
    files = cursor.fetchall()

    # User's active links
    cursor.execute('''
    SELECT s.*, f.original_name
    FROM shared_links s
    JOIN files f ON s.file_id = f.id
    WHERE s.created_by = ?
    ORDER BY s.created_at DESC
    ''', (user["user_id"],))
    shared_links = cursor.fetchall()

    conn.close()
    return render_template("dashboard.html", user=user, files=files, shared_links=shared_links)

@app.route("/upload", methods=["POST"])
@token_required
def upload_file():
    user = request.user
    if "file" not in request.files:
        flash("No file selected for encrypted upload.", "error")
        return redirect(url_for("dashboard"))

    file = request.files["file"]
    if file.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("dashboard"))

    folder = request.form.get("folder", "Root").strip() or "Root"
    change_note = request.form.get("change_note", "Initial encrypted commit").strip()
    parent_file_id = request.form.get("parent_file_id")

    raw_bytes = file.read()
    file_size = len(raw_bytes)
    sha256_hash = compute_sha256(raw_bytes)
    mime_type = file.mimetype or "application/octet-stream"
    original_filename = secure_filename(file.filename) or "secure_document"

    # AES-256 GCM Payload Encryption
    encrypted_blob = encrypt_aes256(raw_bytes)
    stored_name = f"{secrets.token_hex(16)}.enc"
    storage_path = os.path.join(VAULT_DIR, stored_name)

    with open(storage_path, "wb") as f_out:
        f_out.write(encrypted_blob)

    conn = get_db()
    cursor = conn.cursor()

    if parent_file_id:
        # File Versioning Update
        cursor.execute("SELECT * FROM files WHERE id = ? AND user_id = ?", (parent_file_id, user["user_id"]))
        existing_file = cursor.fetchone()
        if existing_file:
            new_version = existing_file["version"] + 1
            cursor.execute('''
            UPDATE files 
            SET stored_name = ?, sha256_hash = ?, file_size = ?, version = ?, created_at = CURRENT_TIMESTAMP
            WHERE id = ?
            ''', (stored_name, sha256_hash, file_size, new_version, parent_file_id))

            cursor.execute('''
            INSERT INTO file_versions (file_id, version_num, stored_name, sha256_hash, file_size, change_note)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (parent_file_id, new_version, stored_name, sha256_hash, file_size, change_note))
            conn.commit()
            log_session(user["email"], f"FILE_VERSION_UPLOAD_v{new_version}_{original_filename}", "SUCCESS")
            flash(f"New version v{new_version} of '{original_filename}' uploaded with AES-256 encryption.", "success")
            conn.close()
            return redirect(url_for("dashboard"))

    # Initial File Record
    cursor.execute('''
    INSERT INTO files (user_id, original_name, stored_name, mime_type, file_size, sha256_hash, folder, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ''', (user["user_id"], original_filename, stored_name, mime_type, file_size, sha256_hash, folder))
    new_id = cursor.lastrowid

    cursor.execute('''
    INSERT INTO file_versions (file_id, version_num, stored_name, sha256_hash, file_size, change_note)
    VALUES (?, 1, ?, ?, ?, ?)
    ''', (new_id, stored_name, sha256_hash, file_size, change_note))

    conn.commit()
    conn.close()

    log_session(user["email"], f"FILE_UPLOAD_AES256_{original_filename}", "SUCCESS")
    flash(f"'{original_filename}' successfully encrypted with AES-256-GCM and stored.", "success")
    return redirect(url_for("dashboard"))

@app.route("/download/<int:file_id>")
@token_required
def download_file(file_id):
    user = request.user
    version_num = request.args.get("version", type=int)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM files WHERE id = ? AND (user_id = ? OR ? = 'admin')", 
                   (file_id, user["user_id"], user["role"]))
    f_record = cursor.fetchone()

    if not f_record or f_record["is_revoked"]:
        conn.close()
        abort(404, description="File not found or revoked.")

    target_stored_name = f_record["stored_name"]
    expected_hash = f_record["sha256_hash"]

    if version_num:
        cursor.execute("SELECT * FROM file_versions WHERE file_id = ? AND version_num = ?", (file_id, version_num))
        ver_row = cursor.fetchone()
        if ver_row:
            target_stored_name = ver_row["stored_name"]
            expected_hash = ver_row["sha256_hash"]

    conn.close()

    file_path = os.path.join(VAULT_DIR, target_stored_name)
    if not os.path.exists(file_path):
        abort(404, description="Encrypted payload missing on disk.")

    with open(file_path, "rb") as enc_file:
        encrypted_bytes = enc_file.read()

    # AES-256 Decryption
    try:
        decrypted_bytes = decrypt_aes256(encrypted_bytes)
    except Exception as e:
        log_session(user["email"], f"AES_DECRYPT_FAIL_FILE_{file_id}", "TAMPERED")
        abort(500, description="AES-256 decryption integrity check failed. Payload may be tampered.")

    # SHA-256 Integrity Checksum Verification
    verified_hash = compute_sha256(decrypted_bytes)
    if verified_hash != expected_hash:
        log_session(user["email"], f"INTEGRITY_MISMATCH_FILE_{file_id}", "COMPROMISED")
        abort(500, description="SHA-256 Hash Verification Failed. Data transmission integrity compromised.")

    log_session(user["email"], f"FILE_DOWNLOAD_{f_record['original_name']}", "SUCCESS")

    return send_file(
        io.BytesIO(decrypted_bytes),
        mimetype=f_record["mime_type"],
        as_attachment=True,
        download_name=f_record["original_name"]
    )

@app.route("/share/<int:file_id>", methods=["POST"])
@token_required
def create_share_link(file_id):
    user = request.user
    hours_valid = int(request.form.get("expiry_hours", 2))
    pin = request.form.get("access_pin", "").strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM files WHERE id = ? AND user_id = ?", (file_id, user["user_id"]))
    f_record = cursor.fetchone()
    if not f_record:
        conn.close()
        abort(404)

    token = secrets.token_urlsafe(24)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=hours_valid)
    pin_hash = bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8') if pin else None

    cursor.execute('''
    INSERT INTO shared_links (file_id, token, created_by, expires_at, pin_hash)
    VALUES (?, ?, ?, ?, ?)
    ''', (file_id, token, user["user_id"], expires_at, pin_hash))
    conn.commit()
    conn.close()

    log_session(user["email"], f"SHARE_LINK_CREATED_EXPIRY_{hours_valid}H", "SUCCESS")
    flash(f"Secure tokenized share link generated (valid for {hours_valid} hours).", "success")
    return redirect(url_for("dashboard"))

@app.route("/s/<token>", methods=["GET", "POST"])
def access_shared_link(token):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT s.*, f.original_name, f.stored_name, f.file_size, f.mime_type, f.sha256_hash, u.email as owner_email
    FROM shared_links s
    JOIN files f ON s.file_id = f.id
    JOIN users u ON s.created_by = u.id
    WHERE s.token = ?
    ''', (token,))
    link_info = cursor.fetchone()

    if not link_info:
        conn.close()
        abort(404, description="This secure link does not exist or was deleted.")

    if link_info["is_revoked"]:
        conn.close()
        return render_template("login.html", error_msg="Access Revoked: This link was terminated by Mapúa MCL Security.")

    # Expiration check
    expiry_time = datetime.datetime.fromisoformat(link_info["expires_at"]) if isinstance(link_info["expires_at"], str) else link_info["expires_at"]
    if datetime.datetime.utcnow() > expiry_time:
        conn.close()
        return render_template("login.html", error_msg="This shared file link has expired (2-hour security window exceeded).")

    # Domain Gate & Authentication Enforcement
    user_token = session.get("auth_token")
    if not user_token:
        conn.close()
        flash("Mapúa MCL Authentication required to access protected campus file links.", "warning")
        return redirect(url_for("login", next=request.url))

    try:
        user = jwt.decode(user_token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        session.clear()
        conn.close()
        flash("Invalid campus session token. Please re-authenticate.", "error")
        return redirect(url_for("login", next=request.url))

    # If link is protected by PIN
    if link_info["pin_hash"]:
        if request.method == "POST":
            entered_pin = request.form.get("pin", "")
            if not bcrypt.checkpw(entered_pin.encode('utf-8'), link_info["pin_hash"].encode('utf-8')):
                conn.close()
                flash("Incorrect security PIN.", "error")
                return render_template("shared_access.html", link=link_info)
        else:
            conn.close()
            return render_template("shared_access.html", link=link_info)

    # Deliver Decrypted Payload with SHA-256 Integrity Verification
    file_path = os.path.join(VAULT_DIR, link_info["stored_name"])
    with open(file_path, "rb") as enc_f:
        enc_data = enc_f.read()

    try:
        plain_bytes = decrypt_aes256(enc_data)
        checksum = compute_sha256(plain_bytes)
        if checksum != link_info["sha256_hash"]:
            abort(500, description="Payload hash mismatch detected.")
    except Exception:
        abort(500, description="Encrypted payload verification error.")

    cursor.execute("UPDATE shared_links SET download_count = download_count + 1 WHERE id = ?", (link_info["id"],))
    conn.commit()
    conn.close()

    log_session(user["email"], f"SHARED_LINK_DOWNLOAD_{link_info['original_name']}", "SUCCESS")
    return send_file(
        io.BytesIO(plain_bytes),
        mimetype=link_info["mime_type"],
        as_attachment=True,
        download_name=link_info["original_name"]
    )

@app.route("/admin")
@admin_required
def admin_panel():
    conn = get_db()
    cursor = conn.cursor()
    
    # Live session and geolocation logs
    cursor.execute("SELECT * FROM session_logs ORDER BY timestamp DESC LIMIT 100")
    logs = cursor.fetchall()

    # Active shared links
    cursor.execute('''
    SELECT s.*, f.original_name, u.email as creator_email
    FROM shared_links s
    JOIN files f ON s.file_id = f.id
    JOIN users u ON s.created_by = u.id
    ORDER BY s.created_at DESC
    ''')
    links = cursor.fetchall()

    # All files
    cursor.execute('''
    SELECT f.*, u.email as owner_email
    FROM files f
    JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
    ''')
    all_files = cursor.fetchall()

    # Stats
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM files WHERE is_revoked = 0")
    total_files = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM session_logs WHERE is_campus_subnet = 1")
    campus_sessions = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM session_logs WHERE is_campus_subnet = 0")
    external_sessions = cursor.fetchone()[0]

    conn.close()

    return render_template(
        "admin.html", 
        logs=logs, 
        links=links, 
        files=all_files,
        total_users=total_users,
        total_files=total_files,
        campus_sessions=campus_sessions,
        external_sessions=external_sessions
    )

@app.route("/admin/revoke-link/<int:link_id>", methods=["POST"])
@admin_required
def revoke_link(link_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE shared_links SET is_revoked = 1 WHERE id = ?", (link_id,))
    conn.commit()
    conn.close()
    log_session(request.user["email"], f"ADMIN_REVOKED_LINK_{link_id}", "SUCCESS")
    flash(f"Shared link #{link_id} has been revoked immediately.", "info")
    return redirect(url_for("admin_panel"))

@app.route("/admin/revoke-file/<int:file_id>", methods=["POST"])
@admin_required
def revoke_file(file_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE files SET is_revoked = 1 WHERE id = ?", (file_id,))
    cursor.execute("UPDATE shared_links SET is_revoked = 1 WHERE file_id = ?", (file_id,))
    conn.commit()
    conn.close()
    log_session(request.user["email"], f"ADMIN_REVOKED_FILE_{file_id}", "WARNING")
    flash(f"File #{file_id} and all related share links have been revoked.", "warning")
    return redirect(url_for("admin_panel"))

# Dynamic Port Binding for Cloud Hosting
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
