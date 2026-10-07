# DQBH REST & WebSocket API Specification
## Base URL: `http://localhost:5000/api/v1`

---

### Authentication Headers
Endpoints accept dual authentication:
1. **API Key Authentication** (Recommended for IoT & External Systems):
   ```http
   x-api-key: dqbh_live_9988_a1b2c3d4e5f6
   ```
2. **Bearer JWT Token** (For UI Sessions):
   ```http
   Authorization: Bearer <jwt_token>
   ```

---

### Core Service Request Lifecycle Endpoints

#### 1. List Service Requests
- **`GET /service-requests`**
- **Query Params**: `state`, `priority`, `siteId`, `technicianId`
- **Response**:
  ```json
  {
    "success": true,
    "count": 3,
    "data": [
      {
        "id": "req-srv-1001",
        "ticketNumber": "SR-2026-1001",
        "machineId": "mach-turbine-01",
        "siteId": "site-houston-01",
        "title": "High-Vibration Alert on Bearing #3",
        "priority": "EMERGENCY",
        "state": "ASSIGNED",
        "assignedTechnicianName": "Sarah Jenkins",
        "slaDueAt": "2026-10-07T12:00:00.000Z",
        "slaBreached": false
      }
    ]
  }
  ```

#### 2. Create Service Request
- **`POST /service-requests`**
- **Headers**: `Content-Type: application/json`, `x-api-key: <key>`
- **Request Body**:
  ```json
  {
    "machineId": "mach-turbine-01",
    "siteId": "site-houston-01",
    "title": "Rotor Blade High-Temp Degradation",
    "description": "Exhaust temperature thermocouple reading 680°C exceeding safe threshold.",
    "priority": "HIGH",
    "requiredSkills": ["TURBINE_LVL3", "VIBRATION_ANALYSIS"],
    "requestedPartIds": ["part-blade-01"]
  }
  ```
- **Response**: `201 Created` with full validated ticket payload.

#### 3. Auto-Dispatch Optimal Technician
- **`POST /service-requests/:id/dispatch`**
- **Response**:
  ```json
  {
    "success": true,
    "message": "Technician Sarah Jenkins (TECH-TX-09) successfully dispatched with match score 96.4/100.",
    "matchScore": {
      "score": 96.4,
      "distanceKm": 1.25,
      "skillMatchRate": 1.0,
      "workloadFactor": 1.0,
      "ratingFactor": 0.99,
      "isEligible": true
    }
  }
  ```

#### 4. Submit Work Log & Photo Proofs
- **`POST /service-requests/:id/work-log`**
- **Request Body**:
  ```json
  {
    "tasksPerformed": ["Inspected Bearing #3", "Replaced 1st stage blade", "Calibrated vibration sensor"],
    "diagnosticSummary": "Resonance eliminated. Peak vibration reduced from 8.2 mm/s to 1.1 mm/s.",
    "workDurationMinutes": 110,
    "partsReplaced": [{"partId": "part-blade-01", "partNumber": "SP-TURB-BLADE-01", "quantity": 1}],
    "photoEvidenceUrls": ["https://storage.dqbh.io/proofs/sr-1001-bearing-fixed.jpg"],
    "digitalSignatureData": "SIG_RSA_SHA256_VALIDATED_PROOF_998811"
  }
  ```

#### 5. Manager Verification & Blockchain Seal
- **`POST /service-requests/:id/verify`**
- **Request Body**:
  ```json
  {
    "approved": true,
    "notes": "Verified telemetry and photo proofs. Machine certified operational."
  }
  ```

#### 6. Simulate Technician Dropout & Re-route
- **`POST /service-requests/:id/exception`**
- **Request Body**:
  ```json
  {
    "technicianId": "tech-sarah-01",
    "reason": "Technician experienced transport breakdown on route to facility."
  }
  ```

---

### API Key Management Endpoints

#### 1. Generate New API Key
- **`POST /api-keys`**
- **Request Body**:
  ```json
  {
    "name": "Factory SCADA Gateway Alpha",
    "role": "SITE_SUPERVISOR",
    "scopes": ["iot:telemetry:write", "requests:read", "requests:write"],
    "rateLimitRpm": 300,
    "expiresInDays": 365
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "API Key generated successfully. Copy the plaintext key now; it will not be displayed again.",
    "data": {
      "id": "apk-1728280000",
      "name": "Factory SCADA Gateway Alpha",
      "plaintextKey": "dqbh_live_f8a9_182937465019283746501928",
      "keyPrefix": "dqbh_live_f8a9",
      "scopes": ["iot:telemetry:write", "requests:read", "requests:write"],
      "rateLimitRpm": 300
    }
  }
  ```

#### 2. Ingest IoT Telemetry Stream
- **`POST /integrations/iot/telemetry`**
- **Headers**: `x-api-key: <key_with_iot_scope>`
- **Request Body**:
  ```json
  {
    "machineSerialNumber": "TURB-9HA-90812",
    "sensorData": {
      "vibrationMmPerSec": 8.4,
      "temperatureCelsius": 99.2,
      "oilPressurePsi": 52.0,
      "acousticRpm": 3600,
      "powerKw": 571000
    }
  }
  ```

---

### WebSocket Hub Specification
- **Endpoint**: `ws://localhost:5000/ws`
- **Events Broadcast**:
  - `ALERT_IOT_ANOMALY`: Broadcast when sensor metrics exceed critical thresholds.
  - `AUDIT_BLOCK_SEALED`: Broadcast when a work verification is sealed on the blockchain.
  - `TECHNICIAN_LOCATION_UPDATED`: Broadcast live GPS coordinates of field personnel.
