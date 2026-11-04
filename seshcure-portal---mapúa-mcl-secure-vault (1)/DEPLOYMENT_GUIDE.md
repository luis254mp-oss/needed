# SeshCure Portal — Cloud Deployment & Hosting Guide
### Mapúa Malayan Colleges Laguna (MCL) Secure Campus Vault & Session Guard

This guide walks you through deploying the **SeshCure Portal** to production cloud platforms (**Render** or **PythonAnywhere**) using a free GitHub repository.

---

## 1. Project Architecture Overview

- **Backend**: Python 3.10+ / Flask 3.0+
- **WSGI Server**: Gunicorn (`Procfile` configured for dynamic `$PORT`)
- **Cryptography**:
  - **AES-256-GCM** via PyCryptodome for payload encryption on disk
  - **Bcrypt** for campus password hashing
  - **PyJWT** (HMAC-SHA256) for signed session tokens
  - **SHA-256** cryptographic checksums for transmission integrity
- **Security Gates**:
  - Strict domain gate: `@mcl.edu.ph` and `@mcl.ph` allowed only. External emails rejected.
  - IP Geolocation: Real-time queries via `ip-api.com` with campus subnet tagging (`10.10.x.x`, `172.16.x.x`, Cabuyao, Laguna).
  - Tokenized share links with configurable 2-hour security expiration and optional PIN locks.

---

## 2. Pushing the Code to a Free GitHub Repository

1. **Initialize Git & Commit**:
   ```bash
   git init
   git add .
   git commit -m "Initial release of SeshCure Portal for Mapúa MCL"
   ```

2. **Create a GitHub Repository**:
   - Go to [github.com/new](https://github.com/new).
   - Set repository name: `seshcure-portal-mcl`.
   - Set visibility to **Private** (recommended for campus repositories) or Public.
   - Do not initialize with README (we already have files).

3. **Push to Remote**:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/seshcure-portal-mcl.git
   git branch -M main
   git push -u origin main
   ```

---

## 3. Deploying on Render (Free Cloud Web Service)

Render provides free hosting with automatic HTTPS and native support for Python Flask + Gunicorn.

1. **Sign Up / Log In**:
   - Visit [render.com](https://render.com) and log in with your GitHub account.

2. **Create New Web Service**:
   - Click **"New +"** → **"Web Service"**.
   - Select your GitHub repository: `seshcure-portal-mcl`.

3. **Configure Service Settings**:
   - **Name**: `seshcure-portal`
   - **Region**: Singapore or Oregon
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT` (or it will automatically read `Procfile`)
   - **Instance Type**: `Free`

4. **Set Environment Variables** in the Render Dashboard (**Environment** tab):
   | Key | Value Description |
   |---|---|
   | `SECRET_KEY` | Generate a random 32-character string (e.g., `mcl-seshcure-master-secret-2026!`) |
   | `JWT_SECRET` | Random 32+ character string for token signing |
   | `ENCRYPTION_KEY` | Exactly 32 characters for AES-256 (e.g., `mcl_aes256_master_key_secure32b!`) |
   | `PORT` | Render automatically sets this |

5. **Deploy**:
   - Click **"Create Web Service"**.
   - Render will run `pip install -r requirements.txt` and launch Gunicorn.
   - Once deployed, your URL will be live at `https://seshcure-portal.onrender.com`.

---

## 4. Alternative: Deploying on PythonAnywhere (Free Tier)

1. **Sign Up**:
   - Register a free account at [pythonanywhere.com](https://www.pythonanywhere.com).

2. **Clone the Repository**:
   - Open a **Bash Console** in PythonAnywhere:
     ```bash
     git clone https://github.com/<YOUR_GITHUB_USERNAME>/seshcure-portal-mcl.git
     cd seshcure-portal-mcl
     python3 -m venv venv
     source venv/bin/activate
     pip install -r requirements.txt
     ```

3. **Create Web App**:
   - Go to the **Web** tab → **Add a new web app**.
   - Select **Manual configuration** → **Python 3.10**.

4. **Configure WSGI File**:
   - In the **Web** tab, click on the **WSGI configuration file** link.
   - Replace the file contents with:
     ```python
     import sys
     import os

     project_home = '/home/<YOUR_USERNAME>/seshcure-portal-mcl'
     if project_home not in sys.path:
         sys.path = [project_home] + sys.path

     os.environ['SECRET_KEY'] = 'your-secret-key-here'
     os.environ['ENCRYPTION_KEY'] = 'mcl_aes256_master_key_secure32b!'
     os.environ['JWT_SECRET'] = 'your-jwt-secret-here'

     from app import app as application
     ```

5. **Set Virtualenv Path**:
   - In the **Virtualenv** section, set path: `/home/<YOUR_USERNAME>/seshcure-portal-mcl/venv`.
   - Click **Reload `<YOUR_USERNAME>.pythonanywhere.com`**.

---

## 5. Default Administrator Credentials

Upon first initialization, `app.py` automatically provisions the Mapúa MCL Cybersecurity Admin account:
- **Email**: `admin@mcl.edu.ph`
- **Password**: `MCL_SecureAdmin2026!`
- **Capabilities**: Access to `/admin` panel, live geolocation IP map, one-click session revocation, link termination, and full audit logs.

*Note: In production, change the default admin password immediately upon first login.*

---

## 6. Security Verification Testing Checklist

1. **Domain Gate Verification**:
   - Try registering with `test@gmail.com` → Rejected immediately.
   - Register with `test@mcl.edu.ph` → Successful account creation.
2. **AES-256 Storage Check**:
   - Upload `syllabus.pdf`.
   - Inspect the `vault_storage/` folder on the host: payloads are stored with `.enc` extensions, raw bytes are unreadable ciphertext.
3. **SHA-256 Integrity Verification**:
   - When downloading files, SeshCure recalculates SHA-256 and validates against the original checksum.
4. **2-Hour Expiring Link Gate**:
   - Create a shared link.
   - Open link in an incognito window: SeshCure forces immediate login before payload decryption.
