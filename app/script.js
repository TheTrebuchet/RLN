document.addEventListener('DOMContentLoaded', () => {
	const API_URL = 'http://localhost:3000/items';
});

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

function internalToClient() {
	// the visible table is generated based on internal table
}

function schemeToInternal() {
	document.querySelector("#molecule-table tbody").innerHTML = "";
	const arrayMolecules = sketcher.getMolecules();
	arrayMolecules.forEach((mol, index) => {
		let molFile = ChemDoodle.writeMOL(mol);
		let name = fetchIUPACName(molFile);
		console.log(name)
	})
}

function clientUpdate() {
	// this should update the table after the user interacts with it
}

sketcher.oldFunc = sketcher.click;
sketcher.click = function (force) {
	sketcher.oldFunc(force);
	schemeToInternal();
}

async function fetchIUPACName(molfile) {
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
			console.log(result);
			return result
		} else {
			console.error("Error:", result.error);
		}
	} catch (error) {
		console.error("Request failed", error);
	}
};


