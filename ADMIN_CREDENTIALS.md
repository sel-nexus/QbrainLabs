# 🔐 Default Admin User - Quick Reference

## Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@qbrainlabs.com` |
| **Password** | `admin123` |
| **Role** | Administrator |

## ⚠️ Security Warning

**IMPORTANT:** The default password is publicly known. You MUST change it immediately after first login.

## Quick Start

### 1. First Login
```
URL: http://localhost:5173/facilitator-login
Email: admin@qbrainlabs.com
Password: admin123
```

### 2. Change Password
1. After login, go to the Admin Dashboard
2. Click the **🔑 Key icon** in the top-right header
3. Enter:
   - Current Password: `admin123`
   - New Password: (your secure password - min 8 chars)
   - Confirm: (repeat your secure password)
4. Click **"Change Password"**

### 3. Logout
- Click the **🚪 Logout icon** in the header

## Password Requirements

- ✅ Minimum 8 characters
- ✅ Must differ from current password
- ✅ Confirmation must match

## Troubleshooting

### Can't log in?
- Ensure database is initialized: `python init_db.py`
- Check server is running on port 8000
- Clear browser cache/localStorage

### Forgot new password?
```bash
cd server
rm -f hotspotmatrix.db
python init_db.py
# Admin user recreated with default password
```

## Admin Capabilities (Current)

- ✅ Create workshops
- ✅ Manage workshop settings
- ✅ View all workshops
- ✅ Change own password
- ✅ Full facilitator permissions

## Coming Soon (US11)

- 🔜 Approve/reject workshops
- 🔜 Manage other facilitators
- 🔜 View system analytics
- 🔜 Assign multiple facilitators per workshop
- 🔜 Knowledge base management
