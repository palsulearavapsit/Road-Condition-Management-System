"""
Predictive Maintenance Module
Uses historical data to predict road deterioration and suggest preventive maintenance
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import json

class PredictiveMaintenanceService:
    def __init__(self):
        self.seasonal_weights = {
            'monsoon': 2.5,  # June-September: Heavy rainfall
            'post_monsoon': 1.8,  # October-November: Recent damage
            'winter': 1.0,  # December-FebruaryClear weather
            'summer': 1.2,  # March-May: Heat expansion
        }
    
    def get_season(self, date: datetime) -> str:
        """Determine season based on date"""
        month = date.month
        if 6 <= month <= 9:
            return 'monsoon'
        elif 10 <= month <= 11:
            return 'post_monsoon'
        elif month == 12 or month <= 2:
            return 'winter'
        else:
            return 'summer'
    
    def analyze_historical_patterns(self, reports: List[Dict]) -> Dict:
        """Analyze historical damage patterns"""
        if not reports:
            return {
                'avg_reports_per_month': 0,
                'peak_season': 'unknown',
                'damage_trends': {}
            }
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(reports)
        df['created_at'] = pd.to_datetime(df['created_at'])
        df['month'] = df['created_at'].dt.month
        df['season'] = df['created_at'].apply(lambda x: self.get_season(x))
        
        # Calculate monthly averages
        monthly_counts = df.groupby('month').size()
        avg_reports_per_month = monthly_counts.mean()
        
        # Identify peak season
        seasonal_counts = df.groupby('season').size()
        peak_season = seasonal_counts.idxmax()
        
        # Damage type trends
        damage_trends = df.groupby('damage_type').size().to_dict()
        
        return {
            'avg_reports_per_month': round(avg_reports_per_month, 2),
            'peak_season': peak_season,
            'damage_trends': damage_trends,
            'monthly_distribution': monthly_counts.to_dict(),
            'seasonal_distribution': seasonal_counts.to_dict()
        }
    
    def predict_future_damage(
        self,
        zone: str,
        historical_reports: List[Dict],
        prediction_days: int = 30
    ) -> Dict:
        """
        Predict road damage for next N days using time-series analysis
        """
        if not historical_reports:
            return self.get_default_prediction(zone, prediction_days)
        
        # Analyze historical patterns
        patterns = self.analyze_historical_patterns(historical_reports)
        
        # Current date and target date
        current_date = datetime.now()
        target_date = current_date + timedelta(days=prediction_days)
        target_season = self.get_season(target_date)
        
        # Calculate base prediction (avg reports per day)
        avg_daily_reports = patterns['avg_reports_per_month'] / 30
        
        # Apply seasonal weight
        seasonal_weight = self.seasonal_weights.get(target_season, 1.0)
        
        # Predict damage count
        predicted_count = int(avg_daily_reports * prediction_days * seasonal_weight)
        
        # Calculate confidence based on data availability
        confidence = min(len(historical_reports) / 100 * 100, 95)
        
        # Determine risk level
        risk_level = self.calculate_risk_level(predicted_count, prediction_days)
        
        # Recommend actions
        recommendations = self.generate_recommendations(
            zone, predicted_count, risk_level, target_season
        )
        
        return {
            'zone': zone,
            'prediction_period': f'{prediction_days} days',
            'target_date': target_date.isoformat(),
            'predicted_damage_count': predicted_count,
            'confidence': round(confidence, 2),
            'risk_level': risk_level,
            'season': target_season,
            'seasonal_factor': seasonal_weight,
            'recommendations': recommendations,
            'created_at': current_date.isoformat()
        }
    
    def calculate_risk_level(self, predicted_count: int, days: int) -> str:
        """Calculate risk level based on predicted damage"""
        daily_avg = predicted_count / days
        
        if daily_avg >= 5:
            return 'critical'
        elif daily_avg >= 3:
            return 'high'
        elif daily_avg >= 1.5:
            return 'medium'
        else:
            return 'low'
    
    def generate_recommendations(
        self,
        zone: str,
        predicted_count: int,
        risk_level: str,
        season: str
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if risk_level in ['critical', 'high']:
            recommendations.append(
                f'⚠️ Urgent: Conduct preventive inspection of high-traffic roads in {zone}'
            )
            recommendations.append(
                '🔧 Allocate additional RSO resources for this zone'
            )
            recommendations.append(
                '📋 Pre-approve emergency repair budget'
            )
        
        if season == 'monsoon':
            recommendations.append(
                '🌧️ Ensure drainage systems are clear before monsoon peaks'
            )
            recommendations.append(
                '🚧 Expedite pending repairs to prevent waterlogging damage'
            )
        
        if season == 'summer':
            recommendations.append(
                '☀️ Monitor roads for heat-induced expansion cracks'
            )
            recommendations.append(
                '💧 Consider pre-monsoon road resurfacing'
            )
        
        if predicted_count > 10:
            recommendations.append(
                f'📊 Expected {predicted_count} reports - prepare vendor contracts'
            )
        
        if not recommendations:
            recommendations.append(
                '✅ Current maintenance schedule appears adequate'
            )
        
        return recommendations
    
    def get_default_prediction(self, zone: str, days: int) -> Dict:
        """Default prediction when no historical data available"""
        return {
            'zone': zone,
            'prediction_period': f'{days} days',
            'target_date': (datetime.now() + timedelta(days=days)).isoformat(),
            'predicted_damage_count': 0,
            'confidence': 0,
            'risk_level': 'unknown',
            'season': self.get_season(datetime.now()),
            'seasonal_factor': 1.0,
            'recommendations': [
                '📊 Insufficient historical data for accurate predictions',
                '✅ Continue collecting data for at least 30 days'
            ],
            'created_at': datetime.now().isoformat()
        }
    
    def predict_zone_vulnerabilities(self, all_reports: List[Dict]) -> Dict[str, Dict]:
        """Identify which zones are most vulnerable to future damage"""
        zones = {}
        
        # Group reports by zone
        from collections import defaultdict
        zone_reports = defaultdict(list)
        
        for report in all_reports:
            zone = report.get('location', {}).get('zone', 'unknown')
            zone_reports[zone].append(report)
        
        # Analyze each zone
        for zone, reports in zone_reports.items():
            prediction = self.predict_future_damage(zone, reports, 30)
            vulnerability_score = self.calculate_vulnerability_score(reports, prediction)
            
            zones[zone] = {
                'prediction': prediction,
                'vulnerability_score': vulnerability_score,
                'total_historical_reports': len(reports),
                'priority': 'High' if vulnerability_score > 70 else 
                           'Medium' if vulnerability_score > 40 else 'Low'
            }
        
        return zones
    
    def calculate_vulnerability_score(self, reports: List[Dict], prediction: Dict) -> int:
        """
        Calculate vulnerability score (0-100)
        Based on multiple factors:
        - Historical damage frequency
        - Predicted future damage
        - Seasonal risk
        - Pending repair backlog
        """
        # Factor 1: Historical frequency (30%)
        freq_score = min(len(reports) / 50 * 30, 30)
        
        # Factor 2: Predicted damage (30%)
        predicted_score = min(prediction['predicted_damage_count'] / 20 * 30, 30)
        
        # Factor 3: Seasonal risk (20%)
        seasonal_factor = prediction['seasonal_factor']
        seasonal_score = min((seasonal_factor - 1) / 1.5 * 20, 20)
        
        # Factor 4: Pending backlog (20%)
        pending_count = len([r for r in reports if r.get('status') in ['pending', 'in-progress']])
        backlog_score = min(pending_count / 10 * 20, 20)
        
        total_score = freq_score + predicted_score + seasonal_score + backlog_score
        
        return int(min(total_score, 100))
    
    def generate_maintenance_calendar(
        self,
        zone: str,
        reports: List[Dict]
    ) -> List[Dict]:
        """Generate a preventive maintenance calendar for next 90 days"""
        calendar = []
        current_date = datetime.now()
        
        for days_ahead in [7, 14, 30, 60, 90]:
            target_date = current_date + timedelta(days=days_ahead)
            prediction = self.predict_future_damage(zone, reports, days_ahead)
            
            calendar.append({
                'date': target_date.strftime('%Y-%m-%d'),
                'days_from_now': days_ahead,
                'predicted_damage': prediction['predicted_damage_count'],
                'risk_level': prediction['risk_level'],
                'action_items': prediction['recommendations'][:2]  # Top 2 recommendations
            })
        
        return calendar

# Global instance
predictive_service = PredictiveMaintenanceService()
