import tensorflow as tf
import numpy as np
from PIL import Image
import io
import time

class RoadDamageDetector:
    def __init__(self, model_path):
        self.model_path = model_path
        self.detection_graph = tf.compat.v1.Graph()
        self.sess = None
        self._load_model()
        
        # Category mapping
        # D00 - Longitudinal Crack
        # D10 - Transverse Crack
        # D20 - Alligator Crack
        # D40 - Pothole
        self.category_map = {
            1: {'name': 'D00', 'type': 'crack', 'base_severity': 'low'},
            2: {'name': 'D10', 'type': 'crack', 'base_severity': 'low'},
            3: {'name': 'D20', 'type': 'Alligator Crack', 'base_severity': 'medium'},
            4: {'name': 'D40', 'type': 'pothole', 'base_severity': 'high'},
        }

    def _load_model(self):
        print(f"Loading model from {self.model_path}...")
        with self.detection_graph.as_default():
            od_graph_def = tf.compat.v1.GraphDef()
            with tf.io.gfile.GFile(self.model_path, 'rb') as fid:
                serialized_graph = fid.read()
                od_graph_def.ParseFromString(serialized_graph)
                tf.import_graph_def(od_graph_def, name='')
            
            self.sess = tf.compat.v1.Session(graph=self.detection_graph)
        print("Model loaded successfully!")

    def predict(self, image_data: bytes):
        try:
            image = Image.open(io.BytesIO(image_data))
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Prepare input tensor
            image_np = np.array(image)
            image_np_expanded = np.expand_dims(image_np, axis=0)

            # Define input/output tensors
            image_tensor = self.detection_graph.get_tensor_by_name('image_tensor:0')
            boxes = self.detection_graph.get_tensor_by_name('detection_boxes:0')
            scores = self.detection_graph.get_tensor_by_name('detection_scores:0')
            classes = self.detection_graph.get_tensor_by_name('detection_classes:0')
            num_detections = self.detection_graph.get_tensor_by_name('num_detections:0')

            # Run inference
            (boxes_out, scores_out, classes_out, num_detections_out) = self.sess.run(
                [boxes, scores, classes, num_detections],
                feed_dict={image_tensor: image_np_expanded}
            )

            # Process results
            return self._process_detections(
                boxes_out[0], 
                scores_out[0], 
                classes_out[0], 
                int(num_detections_out[0]),
                image.size
            )
        except Exception as e:
            print(f"Error during prediction: {e}")
            return None

    def _process_detections(self, boxes, scores, classes, num, img_size):
        width, height = img_size
        results = []
        
        # We only return the highest confidence detection for the simplified app logic,
        # or we return all? The existing app likely expects a single "detection" object 
        # based on the `ai.ts` interface: `detection: { ... }`.
        # Wait, the `ai.ts` defines `detection` as a single object.
        # "Output MUST include: ... bounding boxes ... damage type ... confidence ... severity"
        # "The existing app's severity display and logic MUST remain unchanged."
        # If the app expects a single detection, I should define how to pick the best one.
        # Usually it's the one with highest score.

        best_detection = None
        max_score = 0.0

        for i in range(num):
            score = float(scores[i])
            if score < 0.3: # Minimum threshold
                continue
            
            class_id = int(classes[i])
            if class_id not in self.category_map:
                continue

            # Normalized coordinates [ymin, xmin, ymax, xmax]
            ymin, xmin, ymax, xmax = boxes[i]
            
            # Calculate box area relative to image
            box_area = (ymax - ymin) * (xmax - xmin)
            
            category_info = self.category_map[class_id]
            damage_type = category_info['type']
            
            # Severity Logic
            severity = self._calculate_severity(category_info['base_severity'], score, box_area)

            detection = {
                "damageType": damage_type,
                "confidence": score,
                "severity": severity,
                "boundingBox": {
                    "y": float(ymin), # ymin (top)
                    "x": float(xmin), # xmin (left)
                    "height": float(ymax - ymin),
                    "width": float(xmax - xmin)
                },
                "class_id": class_id 
            }

            print(f"---> Detected Class ID: {class_id} (Type: {damage_type}), Confidence: {score:.2f}")

            if score > max_score:
                max_score = score
                best_detection = detection
        
        if best_detection:
            print(f"✅ Final Result: {best_detection['damageType']} ({best_detection['severity']}, {best_detection['confidence']:.2f})")
        else:
            print("❌ No confident detection found.")

        return best_detection

    def _calculate_severity(self, base_severity, confidence, box_area):
        # Heuristic: 
        # - High confidence + large area -> bump severity
        # - "Potholes generally indicate higher severity" -> already covered by base_severity='high' for D40
        # - "Alligator cracks are more severe" -> covered by base_severity='medium' (maybe bump to high if large)
        
        level_map = {'low': 1, 'medium': 2, 'high': 3}
        reverse_map = {1: 'low', 2: 'medium', 3: 'high'}
        
        current_level = level_map[base_severity]
        
        # Boost severity if area is large (> 5% of image)
        if box_area > 0.05:
            current_level += 1
        
        # Boost if very high confidence on a potentially severe issue?
        if confidence > 0.85 and base_severity != 'low':
             # Already high or medium, maybe bump?
             pass

        # Cap at 3
        current_level = min(current_level, 3)
        
        return reverse_map[current_level]

