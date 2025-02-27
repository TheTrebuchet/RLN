document.addEventListener('DOMContentLoaded', () => {
	const API_URL = 'http://localhost:3000/items';
});

var internaltable = {}

sketcher.oldFunc = sketcher.click;
sketcher.click = function (force) {
	
	sketcher.oldFunc(force);
	schemeToInternal(internaltable);
	internalToClient(internaltable);
	// clientToDB(internalTable)
}

/*
okay so i think we can figure out here two scenarios
1. the scheme gets edited
2. the table gets edited

1
in first case, the drawing is run through
we create an internal table - also based on DB [FUNCTION 1 - schemeToInternal]
then the visible table is generated based on that [FUNCTION 2 - internalToClient]

2
in the second case, what is edited is just uploaded to the DB [FUNCTION 3 - clientToDB]
we can skip reading the visible table if there was no input
so we could figure a function that moves any content from visible table to the interal one
that function will be triggered only when the table is changed

meanwhile we need a function to recalculate all the values possible to be calculated [FUNCTION 4 - clientUpdate]
*/

function clientToDB() {
	// the clientside table is read for updates and sent to DB
}

async function internalToClient(internaltable) {
    const keys = Object.keys(internaltable);
    const promises = keys.map(key => internaltable[key]);
    const resolvedValues = await Promise.all(promises);

    const tableBody = document.querySelector("#molecule-table tbody");

    resolvedValues.forEach((data, index) => {
        const key = keys[index]; // Get the corresponding reagent key (e.g., "reagent1")
        let row = tableBody.querySelector(`tr[data-key="${key}"]`);

        // Get values (use SMILES if iupac_name is None)
        const name = data.iupac_name && data.iupac_name !== "None" ? data.iupac_name : data.smiles;
        const mass = data.mass;
        const molarMass = data.molecular_weight.toFixed(2);
        const equivalents = data.equivalents;
        const density = data.density;

        if (row) {
            // If row exists, update it
            row.innerHTML = `
                <td>${name}</td>
                <td>${mass}</td>
                <td>${molarMass}</td>
                <td>${equivalents}</td>
                <td>${density}</td>
            `;
        } else {
            // If row doesn't exist, create it
            row = document.createElement("tr");
            row.setAttribute("data-key", key);
            row.innerHTML = `
                <td>${name}</td>
                <td>${mass}</td>
                <td>${molarMass}</td>
                <td>${equivalents}</td>
                <td>${density}</td>
            `;
            tableBody.appendChild(row);
        }
    });
}


function schemeToInternal(internaltable) {
	document.querySelector("#molecule-table tbody").innerHTML = "";
	const arrayMolecules = sketcher.getMolecules();
	arrayMolecules.forEach((mol, index) => {
		let molFile = ChemDoodle.writeMOL(mol);
		let details = molDetails(molFile);
		internaltable[`reagent${index}`] = details; 
	})
	console.log(internaltable)
}

function clientUpdate() {
	// this should update the table after the user interacts with it
}

async function molDetails(molfile) {
	try {
		const response = await fetch('/get_iupac', {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain',
			},
			body: molfile,
		});
		const rawText = await response.text();
		const result = JSON.parse(rawText);
		if (response.ok) {
			return result
		} else {
			console.error("Error:", result.error);
		}
	} catch (error) {
		console.error("Request failed", error);
	}
};


