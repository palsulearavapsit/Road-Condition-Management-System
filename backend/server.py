"""
CrackX Backend API Server
Handles report synchronization and AI inference
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native app

# Load YOLO model
MODEL_PATH = 'model/best.pt'
print(f"Loading YOLO model from: {MODEL_PATH}")
model = YOLO(MODEL_PATH)
print("✅ Model loaded successfully!")

# Storage directories
UPLOAD_FOLDER = 'backend/uploads'
REPORTS_FOLDER = 'backend/reports'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORTS_FOLDER, exist_ok=True)

# In-memory database (for demo - replace with real DB in production)
reports_db = []
zones_db = {
    'zone1': [],
    'zone4': [],
    'zone8': []
}

# Severity mapping based on confidence
def calculate_severity(confidence):
    """Calculate severity based on confidence score"""
    if confidence >= 0.8:
        return 'high'
    elif confidence >= 0.6:
        return 'medium'
    else:
        return 'low'

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': True,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/detect', methods=['POST'])
def detect_damage():
    """
    AI Detection endpoint
    Accepts image and returns YOLO detection results
    """
    try:
        # Get image from request
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image_file = request.files['image']
        
        # Read image
        image_bytes = image_file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Run YOLO inference
        results = model(img, conf=0.25)  # Confidence threshold 0.25
        
        # Process results
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates (normalized)
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                img_h, img_w = img.shape[:2]
                
                # Normalize coordinates
                x_norm = float(x1 / img_w)
                y_norm = float(y1 / img_h)
                w_norm = float((x2 - x1) / img_w)
                h_norm = float((y2 - y1) / img_h)
                
                # Get class and confidence
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                
                # Map class to damage type
                class_names = {
                    0: 'crack',
                    1: 'crack',  # Alligator Crack
                    2: 'crack',  # Longitudinal Crack
                    3: 'other',  # Other Corruption
                    4: 'pothole'
                }
                damage_type = class_names.get(cls, 'other')
                
                detection = {
                    'damageType': damage_type,
                    'confidence': round(conf, 2),
                    'severity': calculate_severity(conf),
                    'boundingBox': {
                        'x': round(x_norm, 4),
                        'y': round(y_norm, 4),
                        'width': round(w_norm, 4),
                        'height': round(h_norm, 4)
                    },
                    'class': cls,
                    'className': model.names[cls]
                }
                detections.append(detection)
        
        # Return best detection (highest confidence)
        if detections:
            best_detection = max(detections, key=lambda x: x['confidence'])
            return jsonify({
                'success': True,
                'detection': best_detection,
                'all_detections': detections,
                'count': len(detections)
            })
        else:
            # No detection found
            return jsonify({
                'success': True,
                'detection': {
                    'damageType': 'other',
                    'confidence': 0.5,
                    'severity': 'low',
                    'boundingBox': {'x': 0.25, 'y': 0.25, 'width': 0.5, 'height': 0.5}
                },
                'all_detections': [],
                'count': 0,
                'message': 'No damage detected'
            })
            
    except Exception as e:
        print(f"Error in detection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync-reports', methods=['POST'])
def sync_reports():
    """
    Sync reports from mobile app
    Accepts array of reports and stores them
    """
    try:
        data = request.json
        
        if not data or 'reports' not in data:
            return jsonify({'error': 'No reports provided'}), 400
        
        reports = data['reports']
        synced_count = 0
        failed_count = 0
        
        for report in reports:
            try:
                # Add server timestamp
                report['syncedAt'] = datetime.now().isoformat()
                report['serverStatus'] = 'synced'
                
                # Store in memory database
                reports_db.append(report)
                
                # Add to zone database
                zone = report.get('location', {}).get('zone', 'zone1')
                if zone in zones_db:
                    zones_db[zone].append(report)
                
                # Save to file
                report_file = os.path.join(REPORTS_FOLDER, f"{report['id']}.json")
                with open(report_file, 'w') as f:
                    json.dump(report, f, indent=2)
                
                synced_count += 1
            except Exception as e:
                print(f"Error syncing report {report.get('id')}: {str(e)}")
                failed_count += 1
        
        return jsonify({
            'success': True,
            'synced': synced_count,
            'failed': failed_count,
            'total': len(reports)
        })
        
    except Exception as e:
        print(f"Error in sync: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """Get all reports or filter by zone"""
    try:
        zone = request.args.get('zone')
        
        if zone and zone in zones_db:
            return jsonify({
                'success': True,
                'reports': zones_db[zone],
                'count': len(zones_db[zone]),
                'zone': zone
            })
        else:
            return jsonify({
                'success': True,
                'reports': reports_db,
                'count': len(reports_db)
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<report_id>', methods=['GET'])
def get_report(report_id):
    """Get specific report by ID"""
    try:
        report = next((r for r in reports_db if r['id'] == report_id), None)
        if report:
            return jsonify({
                'success': True,
                'report': report
            })
        else:
            return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<report_id>', methods=['PUT'])
def update_report(report_id):
    """Update report status (for RSO)"""
    try:
        data = request.json
        
        # Find and update report
        for i, report in enumerate(reports_db):
            if report['id'] == report_id:
                reports_db[i].update(data)
                reports_db[i]['updatedAt'] = datetime.now().isoformat()
                
                # Update in zone database
                zone = report.get('location', {}).get('zone')
                if zone and zone in zones_db:
                    for j, zone_report in enumerate(zones_db[zone]):
                        if zone_report['id'] == report_id:
                            zones_db[zone][j].update(data)
                            break
                
                return jsonify({
                    'success': True,
                    'report': reports_db[i]
                })
        
        return jsonify({'error': 'Report not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get system analytics"""
    try:
        total_reports = len(reports_db)
        
        # Calculate statistics
        stats = {
            'total': total_reports,
            'pending': sum(1 for r in reports_db if r.get('status') == 'pending'),
            'in_progress': sum(1 for r in reports_db if r.get('status') == 'in-progress'),
            'completed': sum(1 for r in reports_db if r.get('status') == 'completed'),
            'zones': {
                'zone1': len(zones_db['zone1']),
                'zone4': len(zones_db['zone4']),
                'zone8': len(zones_db['zone8'])
            },
            'severity': {
                'low': sum(1 for r in reports_db if r.get('aiDetection', {}).get('severity') == 'low'),
                'medium': sum(1 for r in reports_db if r.get('aiDetection', {}).get('severity') == 'medium'),
                'high': sum(1 for r in reports_db if r.get('aiDetection', {}).get('severity') == 'high')
            }
        }
        
        return jsonify({
            'success': True,
            'analytics': stats
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 CrackX Backend API Server")
    print("="*50)
    print(f"📍 Server: http://localhost:5000")
    print(f"🤖 AI Model: {MODEL_PATH}")
    print(f"📊 Endpoints:")
    print(f"   - GET  /health")
    print(f"   - POST /api/detect")
    print(f"   - POST /api/sync-reports")
    print(f"   - GET  /api/reports")
    print(f"   - GET  /api/reports/<id>")
    print(f"   - PUT  /api/reports/<id>")
    print(f"   - GET  /api/analytics")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
