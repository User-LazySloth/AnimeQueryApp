import os
from pinecone import Pinecone
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

def get_embedding(text):
    url = 'https://api.jina.ai/v1/embeddings'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': os.environ["JINA_API_KEY"]
    }
    data = {
        "model": "jina-embeddings-v2-base-en",
        "normalized": True,
        "embedding_type": "float",
        "input": [text]
    }
    try:        
        response = requests.post(url, headers = headers, json = data)
        return {"embedding" : response.json()['data'][0]['embedding']}, 200
    except requests.exceptions.RequestException as e:
        print(f"Error in get_embedding: {str(e)}")
        print(f"Response content: {response.text}")
        return None


@app.route('/query', methods = ['POST'])
def query():
    text = request.json.get('text')
    if not text:
        return jsonify({"error": "Text input is required"}), 400

    embedding = get_embedding(text)[0]["embedding"]
    if embedding is None:
        return jsonify({"error": "Failed to get embedding"}), 500

    pc = Pinecone(api_key = os.environ["PINECONE_API_KEY"])
    index = pc.Index('testmal')
    answer = index.query(top_k = 5, vector = embedding, include_metadata = True)
    df = pd.read_csv('../Output/Original.csv')

    response_dict = {
        "matches": [
            {
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata,
                "synopsis": df[df['Name'] == match.metadata['name']]['Sypnopsis'].values[0] if not df[df['Name'] == match.metadata['name']]['Sypnopsis'].empty else "Synopsis not available"
            } for match in answer.matches
        ],
        "namespace": answer.namespace
    }
    
    return jsonify(response_dict), 200

if __name__ == '__main__':
    app.run(host = '0.0.0.0', port = 5001, debug = True)
