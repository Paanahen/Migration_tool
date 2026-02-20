import json
import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify ,send_from_directory
from flask_cors import CORS
from TM1py import TM1Service
from PA12_Transfer import transfer

app = Flask(__name__,
    static_folder="../frontend/build",
    static_url_path="")
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
ENV_FILE = os.path.join(DATA_DIR, 'environments.json')
CRED_FILE = os.path.join(DATA_DIR, 'credentials.json')

os.makedirs(DATA_DIR, exist_ok=True)



def _load_all():
    if not os.path.exists(ENV_FILE):
        return {}
    with open(ENV_FILE, 'r') as f:
        return json.load(f)


def _save_all(data):
    with open(ENV_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def _load_credentials():
    if not os.path.exists(CRED_FILE):
        return {}
    with open(CRED_FILE, 'r') as f:
        return json.load(f)


def _save_credentials(data):
    with open(CRED_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# ─── Server react build ───

@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory(app.static_folder, path)


# ─── Environment CRUD ───

@app.route('/api/environments', methods=['GET'])
def get_environments():
    username = request.args.get('username', '')
    data = _load_all()
    return jsonify(data.get(username, []))


@app.route('/api/environments', methods=['POST'])
def create_environment():
    body = request.json
    username = body.pop('username', '')
    body['id'] = str(uuid.uuid4())
    body['createdAt'] = datetime.utcnow().isoformat()
    data = _load_all()
    data.setdefault(username, []).append(body)
    _save_all(data)
    return jsonify(body), 201


@app.route('/api/environments/<env_id>', methods=['PUT'])
def update_environment(env_id):
    body = request.json
    username = body.pop('username', '')
    data = _load_all()
    envs = data.get(username, [])
    for i, env in enumerate(envs):
        if env['id'] == env_id:
            body['id'] = env_id
            body['createdAt'] = env['createdAt']
            envs[i] = body
            break
    data[username] = envs
    _save_all(data)
    return jsonify(body)


@app.route('/api/environments/<env_id>', methods=['DELETE'])
def delete_environment(env_id):
    username = request.args.get('username', '')
    data = _load_all()
    envs = data.get(username, [])
    data[username] = [e for e in envs if e['id'] != env_id]
    _save_all(data)
    return jsonify({'success': True})


# ─── Existing PA endpoints (keep as-is) ───

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    data = request.json
    try:
        tm1_test = create_connection(data)
        tm1_test.dimensions.get_all_names()
        return jsonify({"success": True, "message": "Connection successful"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


def create_connection(data: dict):
    connection_type = data['type']
    if (connection_type == 'aws'):
        data_center = data['dataCenter']
        database = data['serverName']
        tenant_id = data['tenant']
        address = f'https://{data_center}.planninganalytics.saas.ibm.com/api/{tenant_id}/v0/tm1/{database}/'
        apikey = data['apiKey']
        PA_CONNECTION = {
                    "base_url": address,
                    "user": "apikey",
                    "password": apikey,
                    "async_requests_mode": True,
                    "ssl": True,
                    "verify": True
                }
    elif (connection_type == 'cloud'):
        env_name = data['environmentName']
        server = data['serverName']
        base_url = f'https://{env_name}.planning-analytics.ibmcloud.com/tm1/api/{server}'
        user = data['tm1AutomationUsername']
        password = data['tm1AutomationPassword']
        namespace = data['camNamespace']
        PA_CONNECTION = {
                'base_url': base_url,
                'user': user,
                'password': password,
                'namespace': namespace,
                'ssl': True,
                'verify': True
            }
    return TM1Service(**PA_CONNECTION)

@app.route('/api/list-objects', methods=['POST'])
def list_objects():
    data = request.json
    try:
        # Connect to TM1 using env credentials...
        tm1 = create_connection(data)
        dimensions = tm1.dimensions.get_all_names()
        cubes = tm1.cubes.get_all_names()
        processes = tm1.processes.get_all_names()

        objects = []
        for name in dimensions:
            objects.append({"name": name, "type": "dimension"})
        for name in cubes:
            objects.append({"name": name, "type": "cube"})
        for name in processes:
            objects.append({"name": name, "type": "process"})

        return jsonify(objects)
    except Exception as e:
        return jsonify({"message": str(e)}), 400

@app.route('/api/migrate', methods=['POST'])
def migrate():
    data = request.json
    #Check that credentials are good
    try:
        tm1_source = create_connection(data['source'])
        tm1_target = create_connection(data['target'])
    except Exception as e:
        return jsonify({"success": False, "error": "Invalid credentials"})
    sErrormessages = ''
    items = 0
    try:
        objects = data['objects']
        for i in objects:
            try:
                object_name = i['name']
                object_type = i['type']
                if object_type == 'dimension':
                    print(object_name, 'dimension')
                    transfer.transfer_dimension(tm1_source=tm1_source, tm1_target=tm1_target, dimension_name=object_name, include_subsets=True)
                elif object_type == 'process':
                    print(object_name, 'process')
                    transfer.transfer_process(tm1_source=tm1_source, tm1_target=tm1_target, process_name=object_name)
                elif object_type == 'cube':
                    print(object_name, 'cube')
                    transfer.transfer_cube(tm1_source=tm1_source, tm1_target=tm1_target, cube_name=object_name, include_data=False, include_views=True)
                items = items + 1
            except Exception as e:
                if sErrormessages == '':
                    sErrormessages = sErrormessages + f' {object_name} not transferred \n'
                else:
                    sErrormessages = sErrormessages + f' {object_name} not transferred \n'
        if (sErrormessages == ''):
            return jsonify({"success": True, "message": f"Migrated {items} objects successfully"})
        else:
            return jsonify({"success": True, "message": f"Migrated {items} objects successfully, Error on {sErrormessages}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})



#--- Registering to the app and saving the information to the credentials app

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json
    username, password = data["username"], data["password"]
    body = {}
    body['password'] = password
    body['id'] = str(uuid.uuid4())
    body['createdAt'] = datetime.utcnow().isoformat()
    data = _load_credentials()
    data.setdefault(username, []).append(body)
    _save_credentials(data)
    return jsonify({"success": True})


#---- Login to the app by logging in by checking that the password is correct in the credentials file

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json
    username, password = data["username"], data["password"]
    print(_load_credentials())
    try:    
        credentials = _load_credentials()[username]
        print(_load_credentials())
        clientpassword = credentials[0]['password']
    except Exception:
        return jsonify({"success": False, "error": "Invalid credentials"})
    if clientpassword == password:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "Invalid credentials"})



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
