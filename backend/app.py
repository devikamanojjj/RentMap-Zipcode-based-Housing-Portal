from flask import Flask, request, jsonify
import pandas as pd
import sys
import os
import sqlite3
from contextlib import closing
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))
from roi_prediction import process_real_estate_data

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'app_data.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with closing(get_db_connection()) as conn:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS favorites (
                username TEXT NOT NULL,
                zipcode TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (username, zipcode)
            )
            '''
        )
        conn.commit()


def get_request_username():
    username = (request.headers.get('X-User') or '').strip()
    if not username:
        username = (request.args.get('user') or '').strip()
    if not username and request.is_json:
        payload = request.get_json(silent=True) or {}
        username = str(payload.get('user') or '').strip()
    return username


def get_user_favorites(username):
    with closing(get_db_connection()) as conn:
        rows = conn.execute(
            'SELECT zipcode FROM favorites WHERE username = ? ORDER BY created_at ASC',
            (username,)
        ).fetchall()
    return [row['zipcode'] for row in rows]


def to_json_safe_records(df):
    records = df.to_dict(orient='records')
    safe_records = []
    for record in records:
        safe_record = {}
        for key, value in record.items():
            if pd.isna(value):
                safe_record[key] = None
            else:
                safe_record[key] = value
        safe_records.append(safe_record)
    return safe_records


init_db()

@app.route('/api/roi', methods=['POST'])
def roi():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'Invalid or missing JSON body'}), 400

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        return jsonify({'error': 'Request body must be a JSON array of rows'}), 400
    if len(data) == 0:
        return jsonify({'agg_roi': [], 'pred_df': [], 'ranked_zipcodes': []})

    df = pd.DataFrame(data)

    if 'zipcode' not in df.columns:
        if 'rent_zipcode' in df.columns:
            df = df.rename(columns={'rent_zipcode': 'zipcode'})
        elif 'sales_zipcode' in df.columns:
            df = df.rename(columns={'sales_zipcode': 'zipcode'})

    # Rename rent_avg_price to monthly_rent if present
    if 'monthly_rent' not in df.columns and 'rent_avg_price' in df.columns:
        df = df.rename(columns={'rent_avg_price': 'monthly_rent'})

    if 'inventory' not in df.columns and 'rent_inventory' in df.columns:
        df = df.rename(columns={'rent_inventory': 'inventory'})

    required_columns = ['zipcode', 'monthly_rent', 'sales_price']
    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        return jsonify({'error': f"Missing required column(s): {', '.join(missing)}"}), 400

    try:
        agg_roi, pred_df, ranked_zipcodes = process_real_estate_data(df)
        return jsonify({
            'agg_roi': to_json_safe_records(agg_roi),
            'pred_df': to_json_safe_records(pred_df),
            'ranked_zipcodes': to_json_safe_records(ranked_zipcodes)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/favorites', methods=['GET'])
def list_favorites():
    username = get_request_username()
    if not username:
        return jsonify({'error': "Missing user identity. Pass username in 'X-User' header."}), 400
    return jsonify({'favorites': get_user_favorites(username)})


@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    username = get_request_username()
    if not username:
        return jsonify({'error': "Missing user identity. Pass username in 'X-User' header."}), 400

    payload = request.get_json(silent=True) or {}
    zipcode = str(payload.get('zipcode') or '').strip()
    if not zipcode:
        return jsonify({'error': "Missing required field: 'zipcode'"}), 400

    with closing(get_db_connection()) as conn:
        conn.execute(
            'INSERT OR IGNORE INTO favorites (username, zipcode) VALUES (?, ?)',
            (username, zipcode)
        )
        conn.commit()

    return jsonify({'favorites': get_user_favorites(username)})


@app.route('/api/favorites/<zipcode>', methods=['DELETE'])
def remove_favorite(zipcode):
    username = get_request_username()
    if not username:
        return jsonify({'error': "Missing user identity. Pass username in 'X-User' header."}), 400

    zipcode = str(zipcode or '').strip()
    if not zipcode:
        return jsonify({'error': "Missing required path param: 'zipcode'"}), 400

    with closing(get_db_connection()) as conn:
        conn.execute(
            'DELETE FROM favorites WHERE username = ? AND zipcode = ?',
            (username, zipcode)
        )
        conn.commit()

    return jsonify({'favorites': get_user_favorites(username)})

if __name__ == '__main__':
    app.run(debug=True)
