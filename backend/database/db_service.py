"""
PostgreSQL Database Service
Handles database connections and operations
"""
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import json

class DatabaseService:
    def __init__(self):
        self.connection_pool = None
        
    def initialize(self, config):
        """Initialize database connection pool"""
        try:
            self.connection_pool = psycopg2.pool.SimpleConnectionPool(
                1,  # Min connections
                20,  # Max connections
                host=config.get('host', 'localhost'),
                port=config.get('port', 5432),
                database=config.get('database', 'crackx'),
                user=config.get('user', 'postgres'),
                password=config.get('password', 'password')
            )
            print("✅ Database connection pool created successfully")
            return True
        except Exception as e:
            print(f"❌ Error creating connection pool: {str(e)}")
            return False
    
    def get_connection(self):
        """Get a connection from the pool"""
        return self.connection_pool.getconn()
    
    def return_connection(self, conn):
        """Return connection to the pool"""
        self.connection_pool.putconn(conn)
    
    def execute_query(self, query, params=None, fetch_one=False, fetch_all=True):
        """Execute a query and return results"""
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute(query, params or ())
            
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            else:
                result = None
            
            conn.commit()
            cursor.close()
            return result
            
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"Database error: {str(e)}")
            raise
        finally:
            if conn:
                self.return_connection(conn)
    
    # ==========================================
    # USERS
    # ==========================================
    
    def create_user(self, username, email, password_hash, full_name, role, assigned_zone=None):
        """Create a new user"""
        query = """
            INSERT INTO users (username, email, password_hash, full_name, role, assigned_zone)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, username, email, role, assigned_zone, created_at
        """
        return self.execute_query(
            query,
            (username, email, password_hash, full_name, role, assigned_zone),
            fetch_one=True
        )
    
    def get_user_by_username(self, username):
        """Get user by username"""
        query = "SELECT * FROM users WHERE username = %s AND is_active = TRUE"
        return self.execute_query(query, (username,), fetch_one=True)
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        query = "SELECT * FROM users WHERE id = %s"
        return self.execute_query(query, (user_id,), fetch_one=True)
    
    def update_last_login(self, user_id):
        """Update user's last login timestamp"""
        query = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s"
        self.execute_query(query, (user_id,), fetch_all=False)
    
    # ==========================================
    # REPORTS
    # ==========================================
    
    def create_report(self, report_data):
        """Create a new report"""
        query = """
            INSERT INTO reports (
                citizen_id, zone, latitude, longitude, address,
                damage_type, severity, description, status,
                photo_uri, ai_detection
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb
            )
            RETURNING *
        """
        return self.execute_query(
            query,
            (
                report_data.get('citizen_id'),
                report_data.get('zone'),
                report_data.get('latitude'),
                report_data.get('longitude'),
                report_data.get('address'),
                report_data.get('damage_type'),
                report_data.get('severity'),
                report_data.get('description'),
                report_data.get('status', 'pending'),
                report_data.get('photo_uri'),
                json.dumps(report_data.get('ai_detection', {}))
            ),
            fetch_one=True
        )
    
    def get_reports(self, zone=None, status=None, limit=100):
        """Get reports with optional filters"""
        query = "SELECT * FROM reports WHERE 1=1"
        params = []
        
        if zone:
            query += " AND zone = %s"
            params.append(zone)
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        return self.execute_query(query, tuple(params))
    
    def get_report_by_id(self, report_id):
        """Get a specific report"""
        query = "SELECT * FROM reports WHERE id = %s"
        return self.execute_query(query, (report_id,), fetch_one=True)
    
    def update_report(self, report_id, update_data):
        """Update a report"""
        # Build dynamic update query
        fields = []
        params = []
        
        for key, value in update_data.items():
            if key == 'ai_detection':
                fields.append(f"{key} = %s::jsonb")
                params.append(json.dumps(value))
            else:
                fields.append(f"{key} = %s")
                params.append(value)
        
        params.append(report_id)
        
        query = f"""
            UPDATE reports 
            SET {', '.join(fields)}
            WHERE id = %s
            RETURNING *
        """
        
        return self.execute_query(query, tuple(params), fetch_one=True)
    
    def update_report_status(self, report_id, status):
        """Update report status"""
        query = """
            UPDATE reports 
            SET status = %s,
                repair_completed_at = CASE WHEN %s = 'completed' THEN CURRENT_TIMESTAMP ELSE repair_completed_at END,
                repair_started_at = CASE WHEN %s = 'in-progress' AND repair_started_at IS NULL THEN CURRENT_TIMESTAMP ELSE repair_started_at END
            WHERE id = %s
            RETURNING *
        """
        return self.execute_query(query, (status, status, status, report_id), fetch_one=True)
    
    # ==========================================
    # AI DETECTIONS
    # ==========================================
    
    def create_ai_detection(self, report_id, detection_data):
        """Create AI detection record"""
        query = """
            INSERT INTO ai_detections (
                report_id, damage_type, confidence, class_id, class_name,
                bbox_x, bbox_y, bbox_width, bbox_height,
                model_version, inference_time_ms
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        bbox = detection_data.get('boundingBox', {})
        return self.execute_query(
            query,
            (
                report_id,
                detection_data.get('damageType'),
                detection_data.get('confidence'),
                detection_data.get('class'),
                detection_data.get('className'),
                bbox.get('x'),
                bbox.get('y'),
                bbox.get('width'),
                bbox.get('height'),
                detection_data.get('modelVersion', 'YOLOv8'),
                detection_data.get('inferenceTime', 0)
            ),
            fetch_one=True
        )
    
    # ==========================================
    # ANALYTICS
    # ==========================================
    
    def get_analytics(self, zone=None):
        """Get analytics data"""
        if zone:
            query = """
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
                    COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
                    COUNT(*) FILTER (WHERE severity = 'low') as low_severity
                FROM reports
                WHERE zone = %s
            """
            result = self.execute_query(query, (zone,), fetch_one=True)
        else:
            # All zones
            query = """
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
                    COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
                    COUNT(*) FILTER (WHERE severity = 'low') as low_severity
                FROM reports
            """
            result = self.execute_query(query, fetch_one=True)
            
            # Get zone breakdown
            zone_query = """
                SELECT zone, COUNT(*) as count
                FROM reports
                GROUP BY zone
            """
            zones = self.execute_query(zone_query)
            
            result['zones'] = {z['zone']: z['count'] for z in zones}
        
        return result
    
    def save_daily_analytics(self, zone, rhi_score, rhi_grade, metrics):
        """Save daily analytics snapshot"""
        query = """
            INSERT INTO analytics (
                zone, date, rhi_score, rhi_grade,
                total_reports, pending_reports, in_progress_reports, completed_reports,
                high_severity, medium_severity, low_severity
            ) VALUES (
                %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (zone, date) 
            DO UPDATE SET
                rhi_score = EXCLUDED.rhi_score,
                rhi_grade = EXCLUDED.rhi_grade,
                total_reports = EXCLUDED.total_reports,
                pending_reports = EXCLUDED.pending_reports,
                in_progress_reports = EXCLUDED.in_progress_reports,
                completed_reports = EXCLUDED.completed_reports,
                high_severity = EXCLUDED.high_severity,
                medium_severity = EXCLUDED.medium_severity,
                low_severity = EXCLUDED.low_severity
        """
        self.execute_query(
            query,
            (
                zone, rhi_score, rhi_grade,
                metrics.get('total', 0),
                metrics.get('pending', 0),
                metrics.get('in_progress', 0),
                metrics.get('completed', 0),
                metrics.get('high_severity', 0),
                metrics.get('medium_severity', 0),
                metrics.get('low_severity', 0)
            ),
            fetch_all=False
        )
    
    # ==========================================
    # NOTIFICATIONS
    # ==========================================
    
    def create_notification(self, user_id, report_id, title, message, notification_type):
        """Create a notification"""
        query = """
            INSERT INTO notifications (user_id, report_id, title, message, type)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """
        return self.execute_query(
            query,
            (user_id, report_id, title, message, notification_type),
            fetch_one=True
        )
    
    def get_user_notifications(self, user_id, unread_only=False, limit=50):
        """Get notifications for a user"""
        query = "SELECT * FROM notifications WHERE user_id = %s"
        params = [user_id]
        
        if unread_only:
            query += " AND is_read = FALSE"
        
        query += " ORDER BY sent_at DESC LIMIT %s"
        params.append(limit)
        
        return self.execute_query(query, tuple(params))
    
    def mark_notification_read(self, notification_id):
        """Mark notification as read"""
        query = """
            UPDATE notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """
        self.execute_query(query, (notification_id,), fetch_all=False)
    
    # ==========================================
    # WORK ORDERS
    # ==========================================
    
    def create_work_order(self, report_id, title, description):
        """Create a work order"""
        # Generate order number
        order_number = f"WO-{datetime.now().strftime('%Y%m%d')}-{report_id[:8]}"
        
        query = """
            INSERT INTO work_orders (report_id, order_number, title, description)
            VALUES (%s, %s, %s, %s)
            RETURNING *
        """
        return self.execute_query(
            query,
            (report_id, order_number, title, description),
            fetch_one=True
        )
    
    def get_work_orders(self, vendor_id=None, status=None):
        """Get work orders"""
        query = "SELECT * FROM work_orders WHERE 1=1"
        params = []
        
        if vendor_id:
            query += " AND vendor_id = %s"
            params.append(vendor_id)
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        query += " ORDER BY created_at DESC"
        
        return self.execute_query(query, tuple(params) if params else None)
    
    def close(self):
        """Close all connections"""
        if self.connection_pool:
            self.connection_pool.closeall()
            print("✅ Database connections closed")

# Global instance
db_service = DatabaseService()
