from rdkit import Chem
from rdkit.Chem import rdmolfiles, Descriptors
from flask import Flask, request, jsonify
import pubchempy

app = Flask(__name__)

@app.route('/get_iupac', methods=['POST'])
def get_iupac():
    molfile = request.data.decode('utf-8')
    try:
        mol = rdmolfiles.MolFromMolBlock(molfile)
        if mol is None:
            return jsonify({"error": "Invalid Molfile"}), 400
        smiles = Chem.MolToSmiles(mol)
        molecular_weight = Descriptors.MolWt(mol)
        try:
            compounds = pubchempy.get_compounds(smiles, namespace='smiles')
            iupac_name = compounds[0].iupac_name if compounds else None
        except Exception:
            iupac_name = None

        return jsonify({
            "smiles": smiles,
            "iupac_name": iupac_name,
            "molecular_weight": molecular_weight
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)