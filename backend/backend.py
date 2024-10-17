import os
from pinecone import Pinecone
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from groq import Groq


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

    synopsis = {}
    for anime in response_dict["matches"]:
        synopsis[anime["metadata"]["name"]] = [anime["synopsis"]]

    client = Groq(api_key = os.environ["GROQ_API_KEY"])
    chat_completion = client.chat.completions.create(
        messages = [
            {
                "role": "user",
                "content": f"""Please just provide the name of the anime followed by the corresponding synopsis of the anime that you think is the closest match to the query: {text}, from the following dictionary: {synopsis}. Please give the answer in the following format: "Name of the anime :- Synopsis of the anime" """,
            }
        ],
        model = "llama3-70b-8192",
    )

    llm_response = chat_completion.choices[0].message.content
    llm_response = llm_response.split("\n\n")
    if len(llm_response) > 1:
        llm_response = llm_response[1]
    else:
        llm_response = llm_response[0]

    best_match = str(llm_response).split(":-")[0].strip()

    matches = {}
    for anime in response_dict["matches"]:
        if anime["metadata"]["name"] != best_match:
            matches[anime["metadata"]["name"]] = [anime["synopsis"], anime["score"], anime["metadata"]["genres"]]
        else:
            best_synopsis = [anime["synopsis"], anime["score"], anime["metadata"]["genres"]]

    best_match = {best_match: best_synopsis}
    response_dict = list({**best_match, **matches}.items())

    return jsonify(response_dict), 200

if __name__ == '__main__':
    app.run(host = '0.0.0.0', port = 5001, debug = True)
