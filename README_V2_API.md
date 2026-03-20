# Velastra V2 API Documentation

Welcome to the **Velastra Backend V2 API** comprehensive documentation. This API provides enterprise-grade endpoints for managing companies, sectors, regions, devices, and real-time sensor data with JWT-based authentication.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Base URL](#base-url)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Sector Endpoints](#sector-endpoints)
   - [Company Endpoints](#company-endpoints)
   - [Region Endpoints](#region-endpoints)
   - [Device Endpoints](#device-endpoints)
   - [Real-Time Data Endpoints](#real-time-data-endpoints)
   - [Daily Data Endpoints](#daily-data-endpoints)
   - [Monthly Data Endpoints](#monthly-data-endpoints)
   - [Shift Data Endpoints](#shift-data-endpoints)
   - [Last 10 Z-Axis Endpoints](#last-10-z-axis-endpoints)
7. [Error Handling](#error-handling)
8. [Request/Response Format](#requestresponse-format)

---

## Overview

The V2 API is built with **Express.js** and **MongoDB** (Mongoose), providing a robust and scalable platform for:

- User authentication and authorization (Admin, Manager, User roles)
- Company and sector organizational structure
- Device management and registration
- Real-time sensor data collection and storage
- Historical data retrieval (24-hour, daily, monthly, and shift-based aggregations)
- Dashboard data analytics

**Technology Stack:**

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) - 7-day expiration
- **Security:** bcrypt password hashing
- **Middleware:** CORS enabled, JSON parsing (200MB limit)
- **ORM:** Mongoose for MongoDB interactions

---

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB instance (local or cloud-based)
- Environment variables configured in `.env` file

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
JWT_SECRET=your_super_secret_jwt_key
MONGODB_URI=mongodb://localhost:27017/velastra_v2
PORT=5001
NODE_ENV=development
```

### Running the Server

```bash
npm start
```

The server will start on `http://localhost:5001`

---

## Authentication

### JWT Token

All protected endpoints require a valid JWT token in the **Authorization** header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Tokens & Expiration

- Tokens are generated during **signup** and **login**
- Token expiration: **7 days**
- Invalid or expired tokens return **401 Unauthorized**

### User Roles

- **admin** - Full system access, manage all resources
- **manager** - Manage devices and data for assigned regions
- **user** - View-only access to assigned resources

---

## Base URL

```
http://your-domain:5001/v2
```

---

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique),
  phone_no: String (required, unique, indexed),
  password: String (hashed),
  access: String (enum: "admin", "manager", "user", default: "user"),
  company: ObjectId (reference to Company),
  sector: [ObjectId] (array of references to Sector),
  createdAt: Date,
  updatedAt: Date
}
```

### Company Model

```javascript
{
  _id: ObjectId,
  company_name: String (required),
  company_mail: String,
  company_location: String,
  sector_name: String (references Sector),
  createdAt: Date,
  updatedAt: Date
}
```

### Device Model

```javascript
{
  _id: ObjectId,
  device_name: String (required, indexed),
  installation_date: Date,
  software_version: String,
  region_id: ObjectId (required, reference to Region),
  createdAt: Date,
  updatedAt: Date
}
```

### Region Model

```javascript
{
  _id: ObjectId,
  region_name: String (required),
  company_id: ObjectId (reference to Company),
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Sector Model

```javascript
{
  _id: ObjectId,
  sector_name: String (required, unique),
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

### RealtimeSensorData Model

```javascript
{
  _id: ObjectId,
  device_id: ObjectId (reference to Device),
  mounted_to: String,
  sensors: {
    latitude: Number,
    longitude: Number,
    altitude: Number,
    speed: Number,
    pressure: Number,
    pitch: Number,
    roll: Number,
    // ... dynamic sensor fields
  },
  timestamp: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST /v2/auth/signup

Create a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_no": "9876543210",
  "password": "secure_password",
  "company": "company_id",
  "sector": ["sector_id_1", "sector_id_2"]
}
```

**Response (201):**

```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "access": "user"
  }
}
```

---

#### POST /v2/auth/login

Authenticate user and receive JWT token.

**Request Body:**

```json
{
  "phone_no": "9876543210",
  "password": "secure_password"
}
```

**Response (200):**

```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "access": "user"
  }
}
```

---

#### POST /v2/auth/forgot-password

Reset user password.

**Request Body:**

```json
{
  "phone_no": "9876543210",
  "newPassword": "new_secure_password",
  "confirmPassword": "new_secure_password"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### Sector Endpoints

#### POST /v2/sector/CreateSector

Create a new sector.

**Request Body:**

```json
{
  "sector_name": "Information Technology"
}
```

**Response (201):**

```json
{
  "success": true,
  "sector": {
    "_id": "sector_id",
    "sector_name": "Information Technology",
    "createdAt": "2026-03-10T10:30:00Z"
  }
}
```

---

#### GET /v2/sector/getSectors

Retrieve all sectors.

**Query Parameters:** None

**Response (200):**

```json
{
  "success": true,
  "sectors": [
    {
      "_id": "sector_id_1",
      "sector_name": "Information Technology"
    },
    {
      "_id": "sector_id_2",
      "sector_name": "Manufacturing"
    }
  ]
}
```

---

### Company Endpoints

#### POST /v2/company/createCompany

Create a new company.

**Request Body:**

```json
{
  "company_name": "Tech Corp",
  "company_mail": "info@techcorp.com",
  "company_location": "New York",
  "sector_name": "Information Technology"
}
```

**Response (201):**

```json
{
  "success": true,
  "company": {
    "_id": "company_id",
    "company_name": "Tech Corp",
    "company_mail": "info@techcorp.com",
    "company_location": "New York",
    "sector_name": "Information Technology"
  }
}
```

---

#### GET /v2/company/getCompaniesBySector

Retrieve companies filtered by sector.

**Query Parameters:**

- `sector` (required) - Sector name or ID

**Example:** `GET /v2/company/getCompaniesBySector?sector=Information%20Technology`

**Response (200):**

```json
{
  "success": true,
  "companies": [
    {
      "_id": "company_id_1",
      "company_name": "Tech Corp",
      "sector_name": "Information Technology"
    }
  ]
}
```

---

### Region Endpoints

#### POST /v2/regions/createRegion

Create a new region.

**Request Body:**

```json
{
  "region_name": "North East",
  "company_id": "company_id",
  "description": "North Eastern region offices"
}
```

**Response (201):**

```json
{
  "success": true,
  "region": {
    "_id": "region_id",
    "region_name": "North East",
    "company_id": "company_id"
  }
}
```

---

#### GET /v2/regions/getRegionsByCompanyId

Retrieve regions for a specific company.

**Query Parameters:**

- `companyId` (required) - Company ID

**Example:** `GET /v2/regions/getRegionsByCompanyId?companyId=64a1b2c3d4e5f6g7h8i9j0k1`

**Response (200):**

```json
{
  "success": true,
  "regions": [
    {
      "_id": "region_id_1",
      "region_name": "North East",
      "company_id": "company_id"
    },
    {
      "_id": "region_id_2",
      "region_name": "South West",
      "company_id": "company_id"
    }
  ]
}
```

---

### Device Endpoints

#### POST /v2/device/createDevice

Register a new device.

**Request Body:**

```json
{
  "device_name": "D1",
  "region_name": "North East",
  "installation_date": "2026-03-02T11:30:00Z",
  "software_version": "v1.1.0"
}
```

**Response (201):**

```json
{
  "success": true,
  "device": {
    "_id": "device_id",
    "device_name": "D1",
    "region_id": "region_id",
    "installation_date": "2026-03-02T11:30:00Z",
    "software_version": "v1.1.0"
  }
}
```

---

#### GET /v2/device/fetchAllDevices

Retrieve all registered devices.

**Response (200):**

```json
{
  "success": true,
  "devices": [
    {
      "_id": "device_id_1",
      "device_name": "D1",
      "region_id": "region_id_1",
      "software_version": "v1.1.0"
    },
    {
      "_id": "device_id_2",
      "device_name": "D2",
      "region_id": "region_id_1",
      "software_version": "v1.2.0"
    }
  ]
}
```

---

### Real-Time Data Endpoints

#### POST /v2/data/insert

Insert real-time sensor data.

**Request Body:**

```json
{
  "device_id": "69a9348240ca32af3d6ab83d",
  "mounted_to": "D1",
  "sensors": {
    "latitude": 42.9618,
    "longitude": 97.7364,
    "altitude": 1009,
    "speed": 20.4,
    "pressure": 0,
    "pitch": -72.6,
    "roll": -0.19
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "_id": "data_entry_id",
    "device_id": "device_id",
    "sensors": { ... },
    "timestamp": "2026-03-10T10:30:00Z"
  }
}
```

---

#### GET /v2/data/fetchDashboardDataBy

Fetch dashboard data filtered by company and region.

**Query Parameters:**

- `companyID` (required) - Company ID
- `region` (required) - Region name

**Example:** `GET /v2/data/fetchDashboardDataBy?companyID=64a1b2c3d4e5f6g7h8i9j0k1&region=North`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "data_id",
      "device_id": "device_id",
      "mounted_to": "D1",
      "sensors": { ... },
      "timestamp": "2026-03-10T10:30:00Z"
    }
  ]
}
```

---

### Daily Data Endpoints

#### GET /v2/dailyData

Fetch last 24 hours sensor data for a specific device.

**Query Parameters:**

- `region_id` (required) - Region ID
- `device_id` (required) - Device ID

**Example:** `GET /v2/dailyData?region_id=64a1b2c3d4e5f6g7h8i9j0k1&device_id=64a1b2c3d4e5f6g7h8i9j0k2`

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "data_id",
      "device_id": "device_id",
      "sensors": { ... },
      "timestamp": "2026-03-10T09:00:00Z"
    }
  ],
  "count": 24
}
```

---

#### GET /v2/dailyData/allDevices

Fetch last 24 hours sensor data for all devices.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "data_id",
      "device_id": "device_id_1",
      "sensors": { ... },
      "timestamp": "2026-03-10T09:00:00Z"
    },
    {
      "_id": "data_id",
      "device_id": "device_id_2",
      "sensors": { ... },
      "timestamp": "2026-03-10T09:30:00Z"
    }
  ],
  "count": 48
}
```

---

### Monthly Data Endpoints

#### GET /v2/monthlyData

Fetch monthly aggregated sensor data for a specific device.

**Query Parameters:**

- `device_id` (required) - Device ID
- `region_id` (required) - Region ID

**Example:** `GET /v2/monthlyData?device_id=64a1b2c3d4e5f6g7h8i9j0k1&region_id=64a1b2c3d4e5f6g7h8i9j0k2`

**Response (200):**

```json
{
  "success": true,
  "monthly_data": {
    "device_id": "device_id",
    "month": "March 2026",
    "total_readings": 1095,
    "average_speed": 18.5,
    "max_altitude": 1250,
    "min_pressure": 0
  }
}
```

---

#### GET /v2/monthlyData/allDevices

Fetch monthly aggregated sensor data for all devices.

**Query Parameters:**

- `region_id` (required) - Region ID

**Example:** `GET /v2/monthlyData/allDevices?region_id=64a1b2c3d4e5f6g7h8i9j0k1`

**Response (200):**

```json
{
  "success": true,
  "monthly_data": [
    {
      "device_id": "device_id_1",
      "month": "March 2026",
      "total_readings": 1095
    },
    {
      "device_id": "device_id_2",
      "month": "March 2026",
      "total_readings": 980
    }
  ]
}
```

---

### Shift Data Endpoints

#### GET /v2/shiftData

Fetch shift-based sensor data for a specific device.

**Query Parameters:**

- `device_id` (required) - Device ID
- `shift` (required) - Shift identifier (e.g., "morning", "afternoon", "night")
- `region_id` (required) - Region ID

**Example:** `GET /v2/shiftData?device_id=64a1b2c3d4e5f6g7h8i9j0k1&shift=morning&region_id=64a1b2c3d4e5f6g7h8i9j0k2`

**Response (200):**

```json
{
  "success": true,
  "shift_data": {
    "device_id": "device_id",
    "shift": "morning",
    "start_time": "2026-03-10T06:00:00Z",
    "end_time": "2026-03-10T14:00:00Z",
    "total_readings": 48,
    "data": [
      {
        "_id": "data_id",
        "sensors": { ... },
        "timestamp": "2026-03-10T06:30:00Z"
      }
    ]
  }
}
```

---

#### GET /v2/shiftData/allDevices

Fetch shift-based sensor data for all devices in a region.

**Query Parameters:**

- `shift` (required) - Shift identifier
- `region_id` (required) - Region ID

**Example:** `GET /v2/shiftData/allDevices?shift=morning&region_id=64a1b2c3d4e5f6g7h8i9j0k1`

**Response (200):**

```json
{
  "success": true,
  "shift_data": [
    {
      "device_id": "device_id_1",
      "shift": "morning",
      "total_readings": 48,
      "data": [ ... ]
    },
    {
      "device_id": "device_id_2",
      "shift": "morning",
      "total_readings": 52,
      "data": [ ... ]
    }
  ]
}
```

---

### Last 10 Z-Axis Endpoints

#### GET /v2/getLast10ZAxis

Retrieve the last 10 Z-axis values from the most recent sensor reading.

**Query Parameters:** None (Optional: device_id for specific device filtering)

**Response (200):**

```json
{
  "success": true,
  "z_axis_data": [
    { "roll": -0.19, "timestamp": "2026-03-10T10:30:00Z" },
    { "roll": -0.18, "timestamp": "2026-03-10T10:29:00Z" },
    { "roll": -0.2, "timestamp": "2026-03-10T10:28:00Z" },
    { "roll": -0.19, "timestamp": "2026-03-10T10:27:00Z" },
    { "roll": -0.17, "timestamp": "2026-03-10T10:26:00Z" },
    { "roll": -0.18, "timestamp": "2026-03-10T10:25:00Z" },
    { "roll": -0.19, "timestamp": "2026-03-10T10:24:00Z" },
    { "roll": -0.2, "timestamp": "2026-03-10T10:23:00Z" },
    { "roll": -0.18, "timestamp": "2026-03-10T10:22:00Z" },
    { "roll": -0.19, "timestamp": "2026-03-10T10:21:00Z" }
  ]
}
```

---

## Error Handling

### Standard Error Responses

**400 Bad Request**

```json
{
  "success": false,
  "message": "Invalid request parameters",
  "error_code": "INVALID_REQUEST"
}
```

**401 Unauthorized**

```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error_code": "UNAUTHORIZED"
}
```

**403 Forbidden**

```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error_code": "FORBIDDEN"
}
```

**404 Not Found**

```json
{
  "success": false,
  "message": "Resource not found",
  "error_code": "NOT_FOUND"
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "message": "Internal server error",
  "error_code": "SERVER_ERROR"
}
```

### Common Error Codes

| Code             | Status | Description                                  |
| ---------------- | ------ | -------------------------------------------- |
| INVALID_REQUEST  | 400    | Malformed request or missing required fields |
| UNAUTHORIZED     | 401    | Invalid/missing/expired JWT token            |
| FORBIDDEN        | 403    | User lacks permission for this action        |
| NOT_FOUND        | 404    | Requested resource doesn't exist             |
| DUPLICATE        | 409    | Resource already exists (duplicate entry)    |
| VALIDATION_ERROR | 422    | Data validation failed                       |
| SERVER_ERROR     | 500    | Internal server error                        |
| DB_ERROR         | 503    | Database connection or operation failed      |

---

## Request/Response Format

### Request Headers

All requests (except auth endpoints) should include:

```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Response Format

All responses follow a consistent structure:

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "error_code": "ERROR_CODE",
  "details": {}
}
```

### Pagination

For endpoints returning large datasets, pagination is supported:

**Query Parameters:**

- `page` (default: 1) - Page number
- `limit` (default: 20) - Records per page
- `sort` (default: -createdAt) - Sort field

**Example:** `GET /v2/data?page=2&limit=50&sort=-timestamp`

**Response:**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 1500,
    "pages": 30
  }
}
```

---

## Rate Limiting

- **Rate Limit:** 100 requests per 15 minutes per user
- **Header:** `X-RateLimit-Remaining` shows remaining requests

---

## Webhook Support (Coming Soon)

Real-time event notifications for device updates and sensor anomalies.

---

## Support & Troubleshooting

### Common Issues

**Issue:** Token expired

- **Solution:** Re-login to get a new token

**Issue:** 404 on device endpoint

- **Solution:** Verify device_id exists and region_id is correct

**Issue:** Sensor data not inserted

- **Solution:** Ensure all required sensor fields are included in the request

---

## Version History

- **v2.0** (Current) - MongoDB integration, JWT auth, comprehensive sensor data management
- **v1.0** - Initial API with MySQL database

---

## Contact & Support

For issues, questions, or feature requests, contact the development team at support@velastra.com

````

All endpoint paths shown below are relative to this base URL.

---

## API Endpoints

### Authentication Endpoints

#### 1. Sign Up

**Endpoint:** `POST /auth/signup`

Create a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_no": "9876543210",
  "password": "1234",
  "company": "Tech Corp",
  "sector": "IT"
}
````

**Response (Success):**

```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "9876543210"
  }
}
```

**Notes:**

- Password must be exactly 4 digits (PIN format)
- Company must exist in the database
- Email should be unique

---

#### 2. Login

**Endpoint:** `POST /auth/login`

Authenticate a user and receive a JWT token.

**Request Body:**

```json
{
  "phone_no": "9876543210",
  "password": "1234"
}
```

**Response (Success):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_no": "9876543210",
    "company": "Tech Corp",
    "regions": []
  }
}
```

---

#### 3. Forgot Password

**Endpoint:** `POST /auth/forgot-password`

Reset user password via phone number verification.

**Request Body:**

```json
{
  "phone_no": "9876543210",
  "newPassword": "5678",
  "confirmPassword": "5678"
}
```

**Response (Success):**

```json
{
  "message": "Password updated successfully"
}
```

---

### Sector Endpoints

#### 1. Create Sector

**Endpoint:** `POST /sector/CreateSector`

Create a new sector in the system.

**Request Body:**

```json
{
  "sector_name": "Manufacturing"
}
```

**Response (Success):**

```json
{
  "message": "Sector created successfully",
  "sector": {
    "_id": "507f1f77bcf86cd799439011",
    "sector_name": "Manufacturing"
  }
}
```

---

#### 2. Get All Sectors

**Endpoint:** `GET /sector/getSectors`

Retrieve all available sectors.

**Response (Success):**

```json
{
  "message": "Sectors retrieved successfully",
  "sectors": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sector_name": "IT"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "sector_name": "Manufacturing"
    }
  ]
}
```

---

### Company Endpoints

#### 1. Create Company

**Endpoint:** `POST /company/createCompany`

Create a new company.

**Request Body:**

```json
{
  "company_name": "Tech Corp",
  "company_mail": "info@techcorp.com",
  "company_location": "New York",
  "sector_name": "IT"
}
```

**Response (Success):**

```json
{
  "message": "Company created successfully",
  "company": {
    "_id": "507f1f77bcf86cd799439011",
    "company_name": "Tech Corp",
    "company_mail": "info@techcorp.com",
    "company_location": "New York",
    "sector_name": "IT"
  }
}
```

---

#### 2. Get Companies by Sector

**Endpoint:** `GET /company/getCompaniesBySector`

Retrieve all companies under a specific sector.

**Query Parameters:**

- `sector` (required): Sector name

**Example:** `GET /company/getCompaniesBySector?sector=IT`

**Response (Success):**

```json
{
  "message": "Companies retrieved successfully",
  "companies": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "company_name": "Tech Corp",
      "company_mail": "info@techcorp.com",
      "company_location": "New York"
    }
  ]
}
```

---

### Region Endpoints

#### 1. Create Region

**Endpoint:** `POST /regions/createRegion`

Create a new region.

**Request Body:**

```json
{
  "region_name": "North America",
  "company_id": "507f1f77bcf86cd799439011"
}
```

**Response (Success):**

```json
{
  "message": "Region created successfully",
  "region": {
    "_id": "507f1f77bcf86cd799439012",
    "region_name": "North America",
    "company_id": "507f1f77bcf86cd799439011"
  }
}
```

---

#### 2. Get Regions by Company ID

**Endpoint:** `GET /regions/getRegionsByCompanyId`

Retrieve all regions for a specific company.

**Query Parameters:**

- `companyId` (required): Company ID

**Example:** `GET /regions/getRegionsByCompanyId?companyId=507f1f77bcf86cd799439011`

**Response (Success):**

```json
{
  "message": "Regions retrieved successfully",
  "regions": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "region_name": "North America",
      "company_id": "507f1f77bcf86cd799439011"
    }
  ]
}
```

---

### Device Endpoints

#### 1. Create Device

**Endpoint:** `POST /device/createDevice`

Register a new IoT device.

**Request Body:**

```json
{
  "device_name": "D1",
  "region_name": "North America",
  "installation_date": "2026-03-02T11:30:00Z",
  "software_version": "v1.1.0"
}
```

**Response (Success):**

```json
{
  "message": "Device created successfully",
  "device": {
    "_id": "507f1f77bcf86cd799439013",
    "device_name": "D1",
    "region_name": "North America",
    "installation_date": "2026-03-02T11:30:00Z",
    "software_version": "v1.1.0",
    "status": "active"
  }
}
```

---

#### 2. Fetch All Devices

**Endpoint:** `GET /device/fetchAllDevices`

Retrieve all registered devices.

**Response (Success):**

```json
{
  "message": "Devices retrieved successfully",
  "devices": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "device_name": "D1",
      "region_name": "North America",
      "installation_date": "2026-03-02T11:30:00Z",
      "software_version": "v1.1.0",
      "status": "active"
    }
  ]
}
```

---

### Real-Time Data Endpoints

#### 1. Insert Real-Time Sensor Data

**Endpoint:** `POST /data/insert`

Submit sensor readings from a device in real-time.

**Request Body:**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "mounted_to": "D1",
  "sensors": {
    "latitude": 42.9618,
    "longitude": 97.7364,
    "altitude": 1009,
    "speed": 20.4,
    "pressure": 0,
    "pitch": -72.6,
    "roll": -0.19
  }
}
```

**Response (Success):**

```json
{
  "message": "Real-time data inserted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "device_id": "507f1f77bcf86cd799439013",
    "mounted_to": "D1",
    "sensors": {
      "latitude": 42.9618,
      "longitude": 97.7364,
      "altitude": 1009,
      "speed": 20.4,
      "pressure": 0,
      "pitch": -72.6,
      "roll": -0.19
    },
    "timestamp": "2026-03-09T10:30:00Z"
  }
}
```

**Notes:**

- Sensor fields are dynamic and can include various types of readings
- Timestamp is automatically generated on the server
- All numeric values should be properly formatted

---

#### 2. Fetch Dashboard Data

**Endpoint:** `GET /data/fetchDashboardDataBy`

Retrieve the latest sensor data for dashboard visualization.

**Query Parameters:**

- `companyId` (required): Company ID
- `region` (required): Region name

**Example:** `GET /data/fetchDashboardDataBy?companyId=507f1f77bcf86cd799439011&region=North`

**Response (Success):**

```json
{
  "message": "Dashboard data retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "device_id": "507f1f77bcf86cd799439013",
      "mounted_to": "D1",
      "sensors": {
        "latitude": 42.9618,
        "longitude": 97.7364,
        "altitude": 1009,
        "speed": 20.4,
        "pressure": 0,
        "pitch": -72.6,
        "roll": -0.19
      },
      "timestamp": "2026-03-09T10:30:00Z"
    }
  ]
}
```

---

### Daily Data Endpoints

#### 1. Get Device Daily Data

**Endpoint:** `GET /dailyData`

Fetch last 24 hours of sensor data for a specific device.

**Query Parameters:**

- `region_id` (required): Region ID
- `device_id` (required): Device ID

**Example:** `GET /dailyData?region_id=507f1f77bcf86cd799439012&device_id=507f1f77bcf86cd799439013`

**Response (Success):**

```json
{
  "message": "Daily data retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "device_id": "507f1f77bcf86cd799439013",
      "mounted_to": "D1",
      "sensors": {
        "latitude": 42.9618,
        "longitude": 97.7364,
        "altitude": 1009,
        "speed": 20.4,
        "pressure": 0,
        "pitch": -72.6,
        "roll": -0.19
      },
      "timestamp": "2026-03-09T10:30:00Z"
    }
  ]
}
```

---

#### 2. Get All Devices Daily Data

**Endpoint:** `GET /dailyData/allDevices`

Fetch last 24 hours of sensor data for all devices.

**Response (Success):**

```json
{
  "message": "Daily data for all devices retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "device_id": "507f1f77bcf86cd799439013",
      "mounted_to": "D1",
      "sensors": {
        "latitude": 42.9618,
        "longitude": 97.7364,
        "altitude": 1009,
        "speed": 20.4,
        "pressure": 0,
        "pitch": -72.6,
        "roll": -0.19
      },
      "timestamp": "2026-03-09T10:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "device_id": "507f1f77bcf86cd799439014",
      "mounted_to": "D2",
      "sensors": {
        "latitude": 41.8822,
        "longitude": 87.62975,
        "altitude": 181,
        "speed": 15.2,
        "pressure": 1013,
        "pitch": -45.2,
        "roll": 0.5
      },
      "timestamp": "2026-03-09T11:45:00Z"
    }
  ]
}
```

---

## Error Handling

The API uses standard HTTP status codes:

| Status Code | Meaning               | Description                                           |
| ----------- | --------------------- | ----------------------------------------------------- |
| 200         | OK                    | Request successful                                    |
| 400         | Bad Request           | Invalid request parameters or missing required fields |
| 401         | Unauthorized          | Invalid credentials or expired token                  |
| 403         | Forbidden             | User lacks permission to access the resource          |
| 404         | Not Found             | Resource does not exist                               |
| 500         | Internal Server Error | Server-side error                                     |

### Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error message (if available)"
}
```

### Common Error Responses

**Missing Required Field:**

```json
{
  "message": "Phone number and password are required"
}
```

**Invalid Credentials:**

```json
{
  "message": "Invalid credentials"
}
```

**Company Not Found:**

```json
{
  "message": "Company is invalid"
}
```

**Server Error:**

```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## Response Format

All API responses follow a consistent JSON structure:

**Success Response:**

```json
{
  "message": "Operation successful",
  "data": {
    /* response data */
  }
}
```

**Error Response:**

```json
{
  "message": "Error description",
  "error": "Detailed error (optional)"
}
```

---

## Best Practices

1. **Always include authentication headers** for protected endpoints
2. **Validate input data** before sending requests
3. **Handle rate limiting** gracefully
4. **Store JWT tokens securely** on the client
5. **Implement token refresh** before expiry (7 days)
6. **Use HTTPS** in production environments
7. **Log all API calls** for debugging purposes
8. **Monitor for errors** and implement proper error handling

---

## Support

For issues, bugs, or feature requests, please contact the development team or create an issue in the project repository.

---

**Version:** 2.0  
**Last Updated:** March 2026  
**API Host:** http://localhost:5001
