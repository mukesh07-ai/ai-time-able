import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from flask import Flask, request, jsonify
from flask_cors import CORS
from solver import TimetableSolver
from conflict_extractor import ConflictExtractor
import traceback

app = Flask(__name__)
CORS(app, origins='*')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "PS4 Timetable Solver (OR-Tools CP-SAT)"})

@app.route('/solve', methods=['POST'])
def solve():
    try:
        config = request.get_json()
        if not config:
            return jsonify({"error": "No config provided"}), 400

        solver = TimetableSolver(config)
        result = solver.solve()
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "status": "ERROR"}), 500

if __name__ == '__main__':
    print("[PS4 Solver] Starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
