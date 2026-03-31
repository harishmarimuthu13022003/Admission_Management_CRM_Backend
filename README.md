# 🎓 Admission Management CRM - Backend

Robust Node.js & Express API for managing campus admissions, master data, and RBAC security.

## 🔑 Default Admin Credentials
Use these to perform the first login and seed the master data:
```json
{
  "username": "admin",
  "password": "password123",
  "fullName": "System Admin"
}
```

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Security**: JWT Authentication, bcryptjs hashing
- **Environment**: dotenv

## 🚦 Getting Started
1. **Configure Environment**: Ensure `.env` contains:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/admission_crm
   
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Server**:
   ```bash
   npm start
   ```

## 🛡️ Role-Based Access Control (RBAC)
| Role | Access Level |
|---|---|
| **Admin** | Full system setup, user management, and audit rights. |
| **Admission Officer** | Applicant creation, seat locking, and admission confirmation. |
| **Management** | Read-only access to the Dashboard KPIs. |

## 🔗 API Documentation
- `POST /api/auth/login` - Login to get JWT
- `POST /api/master/program` - Setup Seat Matrix
- `POST /api/admission/applicant` - Create Student Application
- `POST /api/admission/allocate/:id` - Atomic Seat Allocation
- `GET /api/dashboard/summary` - Real-time statistics
