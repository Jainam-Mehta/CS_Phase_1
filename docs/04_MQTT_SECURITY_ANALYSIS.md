# SystmII - MQTT Security Analysis & Roadmap

**Document Version:** 1.0  
**Last Updated:** October 26, 2026  
**Tool:** Mosquitto MQTT Broker  
**Status:** ⚠️ Security gaps present (Phase 2 fixes planned)

---

## Executive Summary

**Current State:** MQTT broker is **functional but unsecured**.
- ✅ Data ingestion working
- ❌ No authentication required
- ❌ No encryption/TLS
- ❌ Open to internet (0.0.0.0/0)

**Risk Level:** MEDIUM (local development acceptable, production vulnerable)

**Recommendation:** Implement Phase 1 security fixes this week before scaling.

---

## Current MQTT Configuration

### Broker Details

```
Broker: Mosquitto 2.x
Location: Docker container (coldsense-mqtt-broker)
Port: 1883 (MQTT), 9001 (WebSocket)
Address: 0.0.0.0:1883 (listen on all interfaces)

Configuration File: /etc/mosquitto/mosquitto.conf
listener 1883
allow_anonymous true        ← NO AUTHENTICATION
protocol mqtt

listener 9001
protocol websockets
allow_anonymous true        ← NO AUTHENTICATION

persistence true
persistence_location /mosquitto/data/
```

### Active Connections

```
Gateway GW001 connects to:
├─ Broker IP: 35.200.159.76:1883
├─ Authentication: None (anonymous)
├─ Topic: cdsense/gw/GW001/MHNKIGP01/S01/R01
├─ Message format: JSONB (temperature, humidity, etc.)
└─ Frequency: Every 10-60 seconds

No username/password required ← SECURITY GAP
No TLS/SSL encryption ← SECURITY GAP
```

---

## Security Gaps Analysis

### Gap 1: No Authentication

**Current State:**
```
Gateway connects:
1. Connects to MQTT broker (0.0.0.0:1883)
2. No username/password required
3. Publishes to any topic
4. Can subscribe to any topic

Risk:
├─ Anyone on internet can publish fake data
├─ Attacker can flood MQTT broker with spam
├─ Attacker can read all sensor data
├─ No audit trail (who published what)
└─ Data integrity not guaranteed

Example Attack:
Attacker connects: telnet 35.200.159.76 1883
Publishes: cdsense/gw/FAKE_GW/MHNKIGP01/S01/R01
Payload: {Temp1: "-50", Humidity1: "200"} ← Invalid data
Impact: Dashboard shows fake readings, false alerts triggered
```

**Phase 1 Fix (Week 1):**
```
Add username/password authentication:

mosquitto.conf:
listener 1883
allow_anonymous false      ← REQUIRE AUTH
password_file /etc/mosquitto/passwd

Generate password file:
mosquitto_passwd -c /etc/mosquitto/passwd coldsense_gateway
mosquitto_passwd /etc/mosquitto/passwd gw001_user
mosquitto_passwd /etc/mosquitto/passwd gw002_user

Gateway connection:
MQTT.connect(
  host='35.200.159.76',
  port=1883,
  username='gw001_user',      ← NOW REQUIRED
  password='secure_password'   ← NOW REQUIRED
)
```

---

### Gap 2: No Encryption (TLS/SSL)

**Current State:**
```
MQTT messages sent in PLAINTEXT over network

Packet capture (wireshark):
┌──────────────────────────────────┐
│ MQTT PUBLISH                     │
├──────────────────────────────────┤
│ Topic: cdsense/gw/GW001/...      │ ← VISIBLE
│ Payload: {Temp1: "25.5", ...}    │ ← READABLE
│ Device ID: [visible]             │ ← READABLE
└──────────────────────────────────┘

Risk:
├─ Attacker on WiFi can see all data
├─ Man-in-the-middle attacks possible
├─ Data theft (sensitive location info)
├─ Network snooping (ISP, VPN provider)
└─ Compliance violation (data protection laws)
```

**Phase 2 Fix (Week 2):**
```
Add TLS 1.2/1.3 encryption:

Generate self-signed certificate:
openssl req -new -x509 -days 365 \
  -keyout server.key \
  -out server.crt \
  -nodes

mosquitto.conf:
listener 8883
protocol mqtt
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
tls_version tlsv1_2              ← REQUIRE TLS 1.2+

listener 9001
protocol websockets
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key

Gateway connection (after TLS enabled):
MQTT.connect(
  host='35.200.159.76',
  port=8883,                      ← ENCRYPTED PORT
  username='gw001_user',
  password='secure_password',
  tls_version=3,                  ← TLS 1.2
  ca_certs='/path/to/ca.crt'
)

Result: Traffic encrypted, only gateway + broker can read
```

---

### Gap 3: Open to Internet (Firewall)

**Current State:**
```
GCP Firewall Rules:
allow-mqtt  0.0.0.0/0  1883  INGRESS  ALLOW

Means: ANYONE from ANYWHERE can connect to MQTT

Current network:
Internet
  ├─ Attacker in USA
  ├─ Attacker in China
  ├─ Anyone with port scanner
  └─ All can connect to 35.200.159.76:1883

Risk:
├─ DDoS attacks (flood MQTT broker)
├─ Data exfiltration (read all topics)
├─ Service disruption (publish spam)
├─ Reputational risk (platform compromised)
└─ Compliance violation (exposed PII)
```

**Phase 1 Fix (Week 1):**
```
Restrict firewall to known gateway IPs:

Gateway locations:
├─ GW001 (Nashik site): 203.124.156.xxx ISP static IP
├─ GW002 (Borivali site): 210.102.234.xxx ISP static IP
└─ GW003 (Testing local): 192.168.1.100 (VPN)

GCP Firewall Rules (NEW):
gcloud compute firewall-rules create \
  allow-mqtt-gateway-1 \
  --allow tcp:1883 \
  --source-ranges=203.124.156.0/24 \
  --target-tags=mqtt-broker

gcloud compute firewall-rules create \
  allow-mqtt-gateway-2 \
  --allow tcp:1883 \
  --source-ranges=210.102.234.0/24 \
  --target-tags=mqtt-broker

gcloud compute firewall-rules delete allow-mqtt  ← DELETE OPEN RULE

Result: Only known gateways can connect
        Reduces attack surface by 99%
```

---

### Gap 4: No ACL (Access Control Lists)

**Current State:**
```
Any authenticated client can:
├─ Publish to ANY topic
├─ Subscribe to ANY topic
├─ Read all sensor data
└─ Interfere with other gateways

Example:
Gateway GW001 could:
├─ Publish as GW002 (impersonation)
├─ Read data from GW003 (espionage)
└─ Subscribe to admin topics

Risk:
├─ Data breach (cross-site visibility)
├─ Account takeover (publish as other gateway)
└─ Denial of service (publish junk)
```

**Phase 2 Fix (Week 2):**
```
Add Access Control Lists (ACL):

acl.conf:
# Admin - can do anything
user admin
topic readwrite #

# Gateway 1 - only own topic
user gw001_user
topic write cdsense/gw/GW001/#
topic read $SYS/#

# Gateway 2 - only own topic
user gw002_user
topic write cdsense/gw/GW002/#
topic read $SYS/#

# Backend subscriber - can read all
user backend_user
topic read cdsense/#
topic write $SYS/#

mosquitto.conf:
acl_file /etc/mosquitto/acl.conf

Result:
├─ GW001 can ONLY publish: cdsense/gw/GW001/...
├─ GW001 cannot see: cdsense/gw/GW002/...
├─ Backend can read ALL topics
└─ Each gateway isolated
```

---

### Gap 5: No Logging/Audit Trail

**Current State:**
```
No record of:
├─ Who connected
├─ When they connected
├─ What they published
├─ Who subscribed to what
└─ Failed auth attempts

If breach occurs:
├─ Cannot determine when
├─ Cannot determine who
├─ Cannot determine extent
└─ Cannot prove to compliance/court
```

**Phase 2 Fix (Week 2):**
```
Enable comprehensive logging:

mosquitto.conf:
log_dest file /var/log/mosquitto/mosquitto.log
log_type all
log_timestamp true

Logs include:
├─ Connection events
├─ Authentication (success/failure)
├─ PUBLISH messages
├─ SUBSCRIBE events
├─ Disconnection events

Example log:
1635248722 New connection from 203.124.156.50:45231
1635248722 Client gw001_user connected
1635248723 Client gw001_user PUBLISH cdsense/gw/GW001/MHNKIGP01/S01/R01
1635248723 Client gw001_user PUBLISH qos=1

Monitoring:
├─ Send logs to Cloud Logging
├─ Alert on failed auth > 5 attempts
├─ Alert on unusual topics published
└─ Audit trail for compliance
```

---

## Severity Assessment

| Gap | Severity | Impact | Phase 1 | Phase 2 |
|-----|----------|--------|---------|---------|
| No Auth | 🔴 Critical | Data theft, impersonation | Add username/password | |
| No Encryption | 🔴 Critical | Network sniffing | | Add TLS 1.2+ |
| Open Firewall | 🔴 Critical | DDoS, spam | Restrict IPs | |
| No ACL | 🟠 High | Cross-site visibility | | Add topic ACLs |
| No Logging | 🟠 High | No audit trail | | Enable logs |

---

## Phase 1: Immediate Fixes (This Week)

### 1. Add Authentication

```bash
# SSH to GCP VM
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c

# Stop broker
docker-compose stop coldsense-mqtt-broker

# Create password file
sudo mkdir -p /etc/mosquitto
sudo touch /etc/mosquitto/passwd
mosquitto_passwd -c /etc/mosquitto/passwd coldsense_gateway
mosquitto_passwd /etc/mosquitto/passwd gw001_user
mosquitto_passwd /etc/mosquitto/passwd gw002_user

# Update mosquitto.conf
docker-compose exec coldsense-mqtt-broker bash -c '
cat > /etc/mosquitto/mosquitto.conf << EOF
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
protocol mqtt

listener 9001
protocol websockets
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF
'

# Restart broker
docker-compose restart coldsense-mqtt-broker

# Verify
docker logs coldsense-mqtt-broker | grep "listening"
```

### 2. Update Firewall Rules

```bash
# SSH to GCP VM or run locally

# Get gateway IPs
GATEWAY_1_IP="203.124.156.0/24"  # Nashik
GATEWAY_2_IP="210.102.234.0/24"  # Borivali

# Create new firewall rules
gcloud compute firewall-rules create \
  allow-mqtt-nashik \
  --allow=tcp:1883 \
  --source-ranges=$GATEWAY_1_IP \
  --target-tags=mqtt-server

gcloud compute firewall-rules create \
  allow-mqtt-borivali \
  --allow=tcp:1883 \
  --source-ranges=$GATEWAY_2_IP \
  --target-tags=mqtt-server

# Tag VM
gcloud compute instances add-tags coldsense-production-vm \
  --tags=mqtt-server \
  --zone=asia-south1-c

# Delete old open rule
gcloud compute firewall-rules delete allow-mqtt --quiet

# Verify
gcloud compute firewall-rules list --filter="name~mqtt"
```

### 3. Test Updated Configuration

```bash
# Test 1: Unauthenticated connection (should fail)
mosquitto_sub -h 35.200.159.76 -p 1883 -t "cdsense/#"
# Result: Error: Connection refused (permission denied)

# Test 2: Authenticated connection (should succeed)
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user -P 'password' \
  -t "cdsense/gw/GW001/#"
# Result: Connected, waiting for messages

# Test 3: From unauthorized IP (should fail)
# If connecting from non-gateway IP:
mosquitto_sub -h 35.200.159.76 -p 1883 -t "cdsense/#"
# Result: Connection timeout (firewall blocks)
```

---

## Phase 2: Enhanced Security (Week 2)

### 1. Add TLS Encryption

```bash
# Generate self-signed certificate
openssl req -new -x509 -days 365 \
  -keyout server.key \
  -out server.crt \
  -subj "/C=IN/ST=MH/L=Mumbai/O=SystmII/CN=35.200.159.76"

# Copy to Mosquitto container
docker cp server.crt coldsense-mqtt-broker:/etc/mosquitto/certs/
docker cp server.key coldsense-mqtt-broker:/etc/mosquitto/certs/

# Update config
docker exec coldsense-mqtt-broker bash -c '
cat > /etc/mosquitto/mosquitto.conf << EOF
listener 8883
protocol mqtt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
tls_version tlsv1_2
allow_anonymous false
password_file /etc/mosquitto/passwd

listener 9001
protocol websockets
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
tls_version tlsv1_2
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF
'

# Restart with new port
docker-compose restart coldsense-mqtt-broker

# Update firewall (allow encrypted port)
gcloud compute firewall-rules create \
  allow-mqtt-tls \
  --allow=tcp:8883 \
  --source-ranges=$GATEWAY_1_IP \
  --target-tags=mqtt-server
```

### 2. Add ACL (Access Control)

```bash
# Create ACL file
docker exec coldsense-mqtt-broker bash -c '
cat > /etc/mosquitto/acl.conf << EOF
# Admin
user admin
topic readwrite #

# Gateways (can only publish to own topic)
user gw001_user
topic write cdsense/gw/GW001/#

user gw002_user
topic write cdsense/gw/GW002/#

# Backend subscriber (can read all)
user backend_user
topic read cdsense/#
EOF
'

# Update config to use ACL
docker exec coldsense-mqtt-broker bash -c '
echo "acl_file /etc/mosquitto/acl.conf" >> /etc/mosquitto/mosquitto.conf
'

docker-compose restart coldsense-mqtt-broker
```

### 3. Enable Audit Logging

```bash
# Update Mosquitto config
docker exec coldsense-mqtt-broker bash -c '
cat >> /etc/mosquitto/mosquitto.conf << EOF
log_dest file /var/log/mosquitto/mosquitto.log
log_type all
log_timestamp true
max_queued_messages 200
EOF
'

# Create log volume
docker volume create mosquitto-logs

# Restart
docker-compose restart coldsense-mqtt-broker

# View logs
docker logs coldsense-mqtt-broker | tail -50
```

---

## Compliance Considerations

### Regulations Affected

```
By deploying in India with customer data:

GDPR (if serving EU customers):
├─ Encryption required ✅ (TLS phase 2)
├─ Access controls required ✅ (ACL phase 2)
├─ Audit trail required ✅ (Logging phase 2)
└─ Data minimization ✓

Indian Data Protection (draft):
├─ Reasonable security measures
├─ Access restrictions
├─ Audit logging
└─ Breach notification

Agricultural Data:
├─ May contain business-sensitive info
├─ Location data (farm locations)
├─ Production data (yields, costs)
└─ Should be protected
```

### Recommended: Security Checklist

```
Before Phase 1 Deployment:
☐ Username/password required for all clients
☐ Firewall restricts to known gateway IPs
☐ Static IPs for all gateways (confirm with team)
☐ All gateway credentials documented
☐ Test authentication failure scenarios
☐ Test firewall blocking scenarios

Before Phase 2 Deployment:
☐ TLS 1.2+ enabled on all connections
☐ Certificate installed and working
☐ ACL rules tested (each gateway isolated)
☐ Logging enabled and monitored
☐ Alerts configured for failed auth
☐ Backup certificates stored securely

Before Production:
☐ Security audit completed (external)
☐ Penetration testing performed
☐ Incident response plan documented
☐ On-call security rotation established
☐ DDoS mitigation plan (Cloud Armor)
└─ Compliance review completed
```

---

## Monitoring & Alerting (Phase 2)

```
Metrics to Monitor:
├─ Connection attempts (failed auth)
├─ Unusual topics published
├─ Data volume per gateway (anomaly detection)
├─ Response latency
└─ Broker CPU/memory

Alerts:
├─ Failed auth attempts > 5/hour → Email admin
├─ Connection from unknown IP → Page on-call
├─ MQTT broker down → Page on-call
├─ Disk usage > 80% → Notify ops
└─ Certificate expiry < 30 days → Notify ops

Implementation:
├─ GCP Cloud Monitoring
├─ Custom alerts in mosquitto logs
├─ Slack integration for notifications
└─ Daily security reports
```

---

## Cost of Security

### Phase 1 (Week 1) - FREE
- Authentication: Built-in Mosquitto feature
- Firewall: GCP free feature
- Setup time: 2-3 hours

### Phase 2 (Week 2) - Minimal
- TLS certificate: Free (self-signed) or $5/year
- Logging: Included in Mosquitto
- Cloud Logging: First 50 GB/month free
- Setup time: 2-3 hours
- Total cost: $0-5 one-time

### Compliance Review - ~$500-1000
- External security audit (optional)
- Penetration testing (recommended)
- Compliance checklist review

---

## Recommended Implementation Timeline

```
Week 1 (Immediate):
├─ Mon: Add authentication
├─ Tue: Restrict firewall to gateway IPs
├─ Wed: Test all scenarios
├─ Thu: Document passwords (secure storage)
└─ Fri: Production deployment

Week 2:
├─ Mon-Tue: Add TLS encryption
├─ Wed: Add ACL (access control)
├─ Thu: Enable comprehensive logging
└─ Fri: Security testing + documentation

Week 3:
├─ Mon-Tue: External security audit
├─ Wed: Remediate audit findings
├─ Thu: Penetration testing
└─ Fri: Review and final sign-off
```

---

## Key Takeaways

✅ **Current state:** Broker works, but vulnerable
⚠️ **Phase 1 (required):** Authentication + firewall (3 hours)
🔒 **Phase 2 (recommended):** Encryption + ACL + logging (4 hours)
📋 **Compliance:** Ready with Phase 2

**Proceed with deployment** if Phase 1 fixes are applied immediately.
**Do NOT scale** to multiple customers without Phase 1-2 security.

---

**End of MQTT Security Analysis Document**
