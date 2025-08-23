from flask import Flask, render_template, send_from_directory
import os

# Create Flask app with web directory as static folder
app = Flask(__name__, static_folder="web", template_folder="web")

@app.route('/')
def dashboard():
    """Serve the main dashboard page with Flask template processing"""
    return render_template('index_flask.html')

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files from web directory"""
    return send_from_directory('web', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True) 