from flask import Flask, render_template, send_from_directory, request
import os

# Create Flask app with web directory as static folder
app = Flask(__name__, static_folder="web", template_folder="web", static_url_path='/static')

@app.before_request
def log_request_info():
    print(f"Request: {request.method} {request.url}")

@app.route('/')
def dashboard():
    """Serve the main dashboard page with Flask template processing"""
    return render_template('index_flask.html')

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files from web directory"""
    return send_from_directory('web', filename)

@app.route('/static/libs/mqttws31.min.js')
def mqtt_library():
    """Serve the MQTT library file"""
    return send_from_directory('web/libs', 'mqttws31.min.js')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True) 