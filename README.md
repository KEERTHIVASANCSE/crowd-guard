# SENTINELVISION AI
### Intelligent Crowd Monitoring, Threat Detection & Real-Time Video Analytics Platform

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![YOLOv8 / YOLO11](https://img.shields.io/badge/YOLO-Ultralytics-00FFFF.svg)](https://docs.ultralytics.com/)
[![Docker Support](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

SentinelVision AI is a production-grade, full-stack real-time security operations center (SOC) platform. It elevates basic object detection into an enterprise surveillance, forensic video analysis, and crowd intelligence system with multi-camera streaming, strict false-positive prevention, geofenced smart zones, behavioral dynamics, an emergency response forwarding portal (Police, Fire Service, Ambulance), and a futuristic dark-mode operations dashboard.

---

## 🏛️ Multi-Model AI Architecture

```text
                               MULTI-CAMERA & VIDEO SOURCES
         [Webcam 0/1]   [Remote WebCam]   [RTSP/IP Feeds]   [Uploaded CCTV MP4s]
               │                │                 │                   │
               └────────────────┴────────┬────────┴───────────────────┘
                                         │
                         FastAPI Video Ingestion Engine
                                         │
   ┌───────────────────────┬─────────────┴─────────────┬────────────────────────┐
   ▼                       ▼                           ▼                        ▼
[MODEL A]              [MODEL B]                   [MODEL C]                [MODEL D]
General YOLOv8         Fire/Smoke Model            Weapon Detector          YOLO-Pose Keypoint
Pedestrians, Crowd,    Dedicated weights/best.pt   High-res knife & ROI     17-keypoint skeleton:
Cars, Buses, Trucks    Strict Smoke:0, Fire:1      Honest AI reporting for  - Falls (torso < 35°)
(COCO classes)         (Persons never label fire)  unweighted classes       - Fights (motion acceleration)
   │                       │                           │                        │
   ├───────────────────────┴─────────────┬─────────────┴────────────────────────┘
   │                                     │
   ▼                                     ▼
[MODEL E] Trajectory Engine       [Smart Zones & Crowd Engine]
Sudden deceleration, rapid        Point-in-polygon intrusion,
trajectory vector change,         Quadrant density (A, B, C, D),
overlapping IoU collisions        Heatmap calculation & surge tracking
   │                                     │
   └───────────────────────┬─────────────┘
                           │
                           ▼
            Alert Confirmation State Machine
     Raw Detection ──> Candidate ──> 3-Frame Confirmation
       (Rejects false positives & logs to AI Debug Panel)
                           │
                           ▼
              Automatic Evidence Capturer
            Saves JPEG Snapshots & Video Clips
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
SQLite Database & Audit Logs         WebSocket Telemetry Hub
Incidents, Video Analysis Jobs,      Broadcasting 25 FPS stream,
Smart Zones, Dismissal Rationale     bounding boxes & emergency alerts
                                             │
                                             ▼
                                  React SOC Command Center
                               (Admin, User, Police, Fire,
                                Ambulance, Forensic Video Lab)
```

---

## 🚀 Key Capabilities

### 1. Reliable Real-World Multi-Threat Detection
The AI pipeline detects 12 core threat classes through specialized sub-engines:
* **Person & Crowd Surge**: Tracks pedestrian counts, inflow/outflow, and sudden surges in quadrants A–D.
* **Vehicles & Collisions**: Vehicle tracking with velocity vector analysis and sudden deceleration collision detection.
* **Fire & Smoke**: Dedicated inference using `weights/best.pt` (`0: Smoke`, `1: Fire`). Persons, vehicles, bags, and lighting **never** trigger fire alerts.
* **Weapons (Gun, Knife, Tactical)**: High-resolution knife and blade identification. Honest status reporting for unweighted classes (`"CUSTOM MODEL: NOT TRAINED"`).
* **Fighting & Violence**: 17-keypoint skeletal motion displacement when two individuals are in close proximity ($< 75\text{px}$) with rapid mutual limb acceleration.
* **Falls & Collapse**: 17-keypoint skeletal analysis checking torso inclination ($< 35^\circ$ from horizontal) and rapid vertical hip descent.
* **Restricted Zone Intrusion**: Point-in-polygon intersection test against user-drawn polygon boundaries.

### 2. Forensic Video Analysis Lab (`/video-analysis`)
Upload offline CCTV clips (`.mp4`, `.avi`, `.mov`) for end-to-end multi-model inference:
* Real-time progress bar with frame-by-frame processing metrics.
* Side-by-side HTML5 video player with bounding boxes and skeleton overlays directly burned in.
* Instant download of `annotated_<job_id>.mp4` and `incidents_<job_id>.json`.

### 3. Human-in-the-Loop Admin Incident Review & Dismissal
* **Mandatory Review**: AI recommendations are presented to the operator, but the AI **never** automatically contacts emergency services.
* **Dismissal with Rationale**: Administrators can dismiss false positives by providing a mandatory explanation (e.g. *"Red backpack mistaken for heat source"*). This feedback is logged for active model retraining.
* **AI Natural Language Search**: Free-form search bar supporting queries like *"show critical fire alerts from CAM-01"* or *"knife incidents"*.

### 4. Remote WebCam Transmitter (`/remote`)
* Open `http://<SERVER_IP>:5173/remote` on any smartphone or secondary laptop on the network.
* Click **"ACTIVATE CAMERA STREAM"** to broadcast frames directly to **CAM-03** on the central command matrix.

---

## 🔐 Default User Accounts & RBAC

| Portal / Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **SOC Administrator** | `admin` | `admin123` | Full matrix control, video lab, smart zones, dismissal, emergency forward |
| **Security Staff** | `user` | `user123` | Live monitoring, incident viewing, crowd analytics |
| **Police Department** | `police` | `police123` | Tactical threats, weapon & fight response center |
| **Fire & Rescue Service** | `fireservice` | `fireservice123` | Hazmat, flame, and structural smoke response center |
| **Ambulance (EMS)** | `ambulance` | `ambulance123` | Medical emergencies, falls, vehicle collision response center |

---

## 🛠️ Quick Start Guide

### Prerequisites
- Python 3.10+ (or Miniconda)
- Node.js 18+ and npm

### 1. Start Backend API Server
```powershell
# From project root
& "C:\Users\KEERTHI VASAN V\miniconda3\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/system/health`

### 2. Start Frontend SOC Command Center
```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```
- Open `http://localhost:5173` in your browser.
- Login using `admin` / `admin123`.

---

## 🏋️ Custom Model Training Pipeline (`training/`)

SentinelVision AI includes a complete Ultralytics training pipeline configured for 10 threat classes:

### Dataset Configuration (`configs/data.yaml`)
```yaml
path: dataset
train: images/train
val: images/val
test: images/test

names:
  0: person
  1: car
  2: smoke
  3: fire
  4: gun
  5: knife
  6: grenade
  7: explosion
  8: fight
  9: fall
```

### 1. Prepare & Split Dataset
Splits raw annotated images and YOLO-format `.txt` labels into train (70%), validation (20%), and test (10%):
```bash
python training/prepare_dataset.py --source /path/to/raw_data --output dataset/
```

### 2. Validate Dataset
Checks bounding boxes for coordinate normalization (0.0 to 1.0) and verifies label integrity:
```bash
python training/validate_dataset.py --data configs/data.yaml
```

### 3. Train Model
Fine-tunes a base YOLO architecture on the multi-threat dataset:
```bash
python training/train.py --data configs/data.yaml --model yolov8s.pt --epochs 50 --batch 16 --imgsz 640
```

### 4. Evaluate Metrics
Generates precision, recall, mAP@0.50, and mAP@0.50:0.95 across each threat class:
```bash
python training/evaluate.py --weights runs/train/sentinel_threat_v1/weights/best.pt --data configs/data.yaml --split val
```

### 5. Export for Edge Inference
Exports trained weights to ONNX or TensorRT:
```bash
python training/export.py --weights weights/best.pt --format onnx --imgsz 640
```

---

## 🧪 Automated Testing Suite

Run the full verification suite confirming database migrations, model loading, honest reporting, and natural language search:
```powershell
& "C:\Users\KEERTHI VASAN V\miniconda3\python.exe" backend/tests/run_tests.py
```

Expected output:
```text
=== Starting SentinelVision AI Verification Tests ===
[TEST 1] Initializing Database & Verifying Roles...
✓ [TEST 1 PASSED] All roles and passwords verified successfully.
[TEST 2] Verifying Fire/Smoke Model (weights/best.pt)...
Model classes: {0: 'Smoke', 1: 'Fire'}
✓ [TEST 2 PASSED] Fire and Smoke dedicated model loaded with correct classes.
[TEST 3] Testing Strict False-Positive Filtering & Temporal Confirmation...
[TEST 4] Testing Weapon Detector & Honest Unsupported Class Reporting...
✓ [TEST 4 PASSED] Honest detection reporting verified (no fake detections for unweighted classes).
[TEST 5] Testing Incident Dismissal with Mandatory Reason...
✓ [TEST 5 PASSED] Incident dismissal and rationale persistence verified.
[TEST 6] Testing Natural Language Query Parsing...
✓ [TEST 6 PASSED] Natural language search query parser verified.
=======================================================
🎯 ALL 6 COMPREHENSIVE BACKEND TESTS PASSED SUCCESSFULLY! 🎯
=======================================================
```

---

## 📄 License
MIT License. Built for enterprise surveillance, computer-vision threat detection, and emergency operations centers.
