document.addEventListener('DOMContentLoaded', () => {
	const API_URL = 'http://localhost:3000/items';
});

function InternalTabletoSQL() {
	// push data from the editor table to DB along with sketcher data
}

function SQLtoInternalTable() {
	// this should run whenever its necessary to fill the table with data from DB
}

function schemetoInternalTable() {
	document.querySelector("#molecule-table tbody").innerHTML = "";

	// Get the main molecule from the sketcher
	const arrayMolecules = sketcher.getMolecules();
	// this should generate the table from the scheme, with respect to what's in the table
	arrayMolecules.forEach((mol, index) => {
		let molFile = ChemDoodle.writeMOL(mol);
		let name = fetchIUPACName(molFile);
		console.log(name)
	})
}

function viewTableUpdate() {
	// this should update the table after the user interacts with it
}

sketcher.oldFunc = sketcher.click;
sketcher.click = function (force) {
	sketcher.oldFunc(force);
	schemetoInternalTable();
}

async function fetchIUPACName(molfile) {
	try {
		const response = await fetch('/get_iupac', {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain',  // Send as plain text
			},
			body: molfile, // Sending Molfile as a plain string
		});

		const rawText = await response.text();  // Log the raw response before parsing
		console.log("Raw Response:", rawText);

		const result = JSON.parse(rawText);  // Manually parse JSON


		if (response.ok) {
			console.log("Name:", result.iupac_name);
			console.log("MW:", result.molecular_weight);
			console.log("smiles:", result.smiles);
		} else {
			console.error("Error:", result.error);
		}
	} catch (error) {
		console.error("Request failed", error);
	}
};


