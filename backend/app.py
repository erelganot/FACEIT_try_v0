import os
import uuid
import subprocess
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
TARGET_VIDEO = "assets/target.mp4"
FFMPEG_PATH = r"C:\Users\Malabi\scoop\apps\ffmpeg\current\bin"  # עדכן לפי הצורך

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image = request.files['image']
    image.save('input.jpg')  # Save the uploaded image

    # Here, you would process the image with FaceFusion or your desired method
    # For demonstration, let's assume the output video is saved as 'static/output.mp4'

    return jsonify({'video_url': 'static/output.mp4'}) 
    
@app.route("/swap", methods=["POST"])
def swap():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image = request.files["image"]

    unique_id = str(uuid.uuid4())
    filename = f"{unique_id}_source.jpg"
    output_filename = f"{unique_id}_result.mp4"
    face_path = os.path.join(UPLOAD_FOLDER, filename)
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)

    image.save(face_path)

    # הגדרת סביבת PATH עם FFmpeg
    env = os.environ.copy()
    env["PATH"] = FFMPEG_PATH + ";" + env["PATH"]

    try:
        subprocess.run([
            "python", "facefusion.py", "run",
            "--source", os.path.abspath(face_path),
            "--target", os.path.abspath(TARGET_VIDEO),
            "--output-path", os.path.abspath(output_path)
        ], check=True, cwd="facefusion_master", env=env)

        if not os.path.exists(output_path):
            return jsonify({"error": "FaceFusion did not create output video"}), 500

        return send_file(output_path, mimetype="video/mp4")

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"FaceFusion failed: {e}"}), 500
    
    

if __name__ == "__main__":
    app.run(debug=True)
