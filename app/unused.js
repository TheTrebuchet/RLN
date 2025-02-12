async function dataFromCas(casNumber) {
    const url = `https://commonchemistry.cas.org/api/detail?cas_rn=${casNumber}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const details = {
            density: null,
            meltingPoint: null,
            boilingPoint: null,
            iupacName: null,
        };

        if (data.experimentalProperties) {
            data.experimentalProperties.forEach((property) => {
                if (property.name === "Density") {
                    details.density = property.property;
                } else if (property.name === "Melting Point") {
                    details.meltingPoint = property.property;
                } else if (property.name === "Boiling Point") {
                    details.boilingPoint = property.property;
                }
            });
        }
        // Extracting IUPAC name (if synonyms are present)
        if (data.synonyms && data.synonyms.length > 0) {
            details.iupacName = data.synonyms[0]; // Assuming the first synonym is the IUPAC name
        }

        return details;
    } catch (error) {
        console.error("Error fetching compound details:", error);
        return null;
    }
}

// MOLECULAR MASS CALCULATION

function calculateMass(molfile) {
    const atoms = parseMolfile(molfile);
    let totalMass = 0;
    let hydrogenCount = 0;

    for (const atom of atoms) {
        const { type, bonds } = atom;
        if (!atomicMasses[type]) continue; // Skip unknown elements

        totalMass += atomicMasses[type];

        if (valency[type]) {
            let missingHydrogens = Math.max(0, valency[type] - bonds);
            hydrogenCount += missingHydrogens;
        }
    }

    totalMass += hydrogenCount * atomicMasses.H; // Add hydrogen mass
    return totalMass;
}

const atomicMasses = {
    H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998,
    P: 30.974, S: 32.06, Cl: 35.45, Br: 79.904, I: 126.9
};

// Valency rules for common elements
const valency = { C: 4, N: 3, O: 2, F: 1, P: 5, S: 2, Cl: 1, Br: 1, I: 1 };

function parseMolfile(molfile) {
    const lines = molfile.split("\n");
    const atomCount = parseInt(lines[3].slice(0, 3).trim());
    const bondCount = parseInt(lines[3].slice(3, 6).trim());

    let atoms = [];
    let bonds = [];

    // Parse atoms
    for (let i = 4; i < 4 + atomCount; i++) {
        const line = lines[i].trim().split(/\s+/);
        const element = line[3];
        atoms.push({ type: element, bonds: 0 });
    }

    // Parse bonds
    for (let i = 4 + atomCount; i < 4 + atomCount + bondCount; i++) {
        const line = lines[i].trim().split(/\s+/);
        const a1 = parseInt(line[0]) - 1; // Convert to zero-based index
        const a2 = parseInt(line[1]) - 1;
        const bondType = parseInt(line[2]);

        atoms[a1].bonds += bondType;
        atoms[a2].bonds += bondType;
    }

    return atoms;
}


async function CasfromSmiles(smiles) {
    const url = `https://cactus.nci.nih.gov/chemical/structure/${smiles}/cas`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        // Split the text by newline and get the first line
        const firstLine = text.split('\n')[0];
        return firstLine;
    } catch (error) {
        console.error('Error fetching CAS:', error);
        return null;
    }
}

async function molToData(molfile) {
    // this function should be basically deprecated, we would never automatically assume cas just from structure
    try {
        // Convert the molecule to a SMILES string
        let name = await fetchIUPACName(molfile);
        return { name };
    } catch (error) {
        console.error("Error converting MOL file to SMILES:", error);
        return null;
    }
}

function molsFromSketcher() {
	// This should be pulling data from the postgresql and showing the table that is there
	document.querySelector("#molecule-table tbody").innerHTML = "";

	// Get the main molecule from the sketcher
	const arrayMolecules = sketcher.getMolecules();

	// Loop through and get details
	arrayMolecules.forEach((mol, index) => {
		let molFile = ChemDoodle.writeMOL(mol);
		console.log(molFile);
		molToData(molFile).then((result) => {
			if (result) {
				console.log("SMILES:", result.smiles, "Mass:", result.mass, "CAS:", result.cas);
				addMoleculeToTable(result.smiles, result.mass, result.cas, result.density);
			} else {
				console.log("Failed to convert MOL file to SMILES.");
			}
		})
	})
}