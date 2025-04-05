import { getDefault, molDetails, recalculate } from './utils.js';


/**
 * Initializes the document and sets up event listeners.
 */
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/items';
});

var internaltable = {}
var doodlecontent = null

const htmltable = document.getElementById("molecule-table"); // Replace with your actual table ID
const properties = ['iupac_name', 'mass', 'molecular_weight', 'moles', 'equivalents', 'volume', 'density']; // Properties to build

sketcher.oldFunc = sketcher.click;
sketcher.click = function (force) {
    sketcher.oldFunc(force);
    doodleUpdate();
};

sketcher.oldFunc2 = sketcher.keydown;
sketcher.keydown = function (force) {
    sketcher.oldFunc2(force);
    doodleUpdate();
};

/**
 * Handles blur events on table cells to trigger editing.
 */
htmltable.addEventListener("blur", function (event) {
    if (event.target.matches("td[contenteditable='true']")) {
        tableUpdate(event.target);
    }
}, true);

/**
 * Handles keydown events on table cells to prevent new lines and trigger blur on Enter key.
 */
htmltable.addEventListener("keydown", function (event) {
    if (event.target.matches("td[contenteditable='true']") && event.key === "Enter") {
        event.preventDefault(); // Prevent new lines
        event.target.blur(); // Trigger blur event
    }
});

/**
 * Updates the internal table from the sketcher and recalculates values.
 */
function doodleUpdate() {
    doodleToInternal(internaltable).then(() => {
        console.log(internaltable);
        recalculate(internaltable);
        internalToClient(internaltable);
        clientToDB();
    })
}

/**
 * Handles editing of table cells.
 * @param {HTMLElement} cell - The table cell being edited.
 */
function tableUpdate(cell) {
    console.log(internaltable);
    const row = cell.parentElement; // <tr> element
    const columnIndex = cell.cellIndex; // Get column number
    // Assuming first column contains row keys
    const columnName = document.querySelector(`#molecule-table thead tr`).cells[columnIndex].innerText.trim();
    const newValue = cell.innerText.trim();
    let key = row.getAttribute("data-key");
    let property = properties[columnIndex];

    if (newValue === "") {
        internaltable[key][property].modified = false;
        internaltable[key][property].value = getDefault(columnName);
    } else {
        internaltable[key][property].value = newValue;
        internaltable[key][property].modified = true;
    }

    recalculate(internaltable);
    internalToClient(internaltable);
}

function internalToClient(internaltable) {
    const tableBody = document.querySelector("#molecule-table tbody");
    for (let [key, data] of Object.entries(internaltable)) {
        let row = tableBody.querySelector(`tr[data-key="${key}"]`);
        const formatValue = (value) => {
            if (isNaN(value) || value === null || value === undefined || value === "") {
                return "";
            }
            if (value < 1) {
                return parseFloat(value).toPrecision(3);
            } else {
                return parseFloat(value).toFixed(2);
            }
        };
        const rowContent = `
            <td contenteditable="true" class="${data.iupac_name.modified ? 'table-info' : ''}">${data.iupac_name.value}</td>
            <td contenteditable="true" class="${data.mass.modified ? 'table-info' : ''}">${formatValue(data.mass.value)}</td>
            <td>${formatValue(data.molecular_weight.value)}</td>
            <td contenteditable="true" class="${data.moles.modified ? 'table-info' : ''}">${formatValue(data.moles.value)}</td>
            <td contenteditable="true" class="${data.equivalents.modified ? 'table-info' : ''}">${formatValue(data.equivalents.value)}</td>
            <td contenteditable="true" class="${data.volume.modified ? 'table-info' : ''}">${formatValue(data.volume.value)}</td>
            <td contenteditable="true" class="${data.density.modified ? 'table-info' : ''}">${formatValue(data.density.value)}</td>
        `;

        if (row) {
            // Update row with new values
            row.innerHTML = rowContent;
        } else {
            // If row doesn't exist, create it
            row = document.createElement("tr");
            row.setAttribute("data-key", key);
            row.innerHTML = rowContent;
            tableBody.appendChild(row);
        }
    }
    // goes through the tableBody and if there is a row that is not in internaltable, deletes it
    for (let row of tableBody.children) {
        if (!Object.keys(internaltable).includes(row.getAttribute("data-key"))) {
            row.remove();
        }
    }
}


/**
 * Updates the internal table with data from the sketcher.
 * @param {Object} internaltable - The internal table containing molecule data.
 */
async function doodleToInternal(internaltable) {
    // filling promisetable with contents from server
    doodlecontent = new ChemDoodle.io.JSONInterpreter().contentTo(sketcher.molecules, sketcher.shapes);
    let promisetable = {};
    const arrayMolecules = sketcher.getMolecules();
    // first maybe lets see if there are any molecules to begin with
    if (arrayMolecules.length == 0) {
        console.log("No molecules to process");
        // Clear the internaltable without reassigning it
        for (let key in internaltable) {
            delete internaltable[key];
        }
        return;
    }
    console.log('filling table from doodle');
    const mols_ids = await doodlecontent.m.map(molecule => molecule.i);
    arrayMolecules.forEach((mol, index) => {
        let molFile = ChemDoodle.writeMOL(mol);
        let details = molDetails(molFile);
        promisetable[mols_ids[index]] = details;
    });

    // building internaltable from here, while checking for changes in internal
    const keys = Object.keys(promisetable);
    const promises = keys.map(key => promisetable[key]);
    const resolvedValues = await Promise.all(promises);

    resolvedValues.forEach((data, index) => { // for every reagent
        const key = keys[index]; // Get the corresponding reagent key (e.g., "molecule_0")
        let row = internaltable[key]; // get the row from internaltable, if exists

        if (row) {
            properties.forEach(property => { // for every property in a row
                var clientValue = row[property].value; // get client value
                // try to make clientValue float if it is a number
                if (['mass', 'moles', 'equivalents', 'volume', 'density'].includes(property)) {
                    clientValue = parseFloat(clientValue);
                }
                if (!clientValue) { // Check for empty client value first
                    internaltable[key][property].modified = false;
                    internaltable[key][property].value = getDefault(property);
                } else if (property == 'molecular_weight') { // this should be only updated, no check for client
                    internaltable[key][property].value = data[property];
                } else if (!internaltable[key][property].modified) { // if not modified, update
                    internaltable[key][property].modified = false;
                    internaltable[key][property].value = data[property] || getDefault(property);
                }
            });
        } else { // create the entry in internal
            internaltable[key] = {
                iupac_name: { value: data.iupac_name, modified: false },
                mass: { value: data.mass || getDefault('mass'), modified: false },
                molecular_weight: { value: data.molecular_weight, modified: false },
                moles: { value: data.moles || getDefault('moles'), modified: false },
                equivalents: { value: data.equivalents || getDefault('equivalents'), modified: false },
                volume: { value: data.volume || getDefault('volume'), modified: false },
                density: { value: data.density, modified: false },
            };
        }
    })
    // after all that I want to check if there is a key in internaltable that is not in mol_ids, if so, delete it
    for (let key in internaltable) {
        if (!mols_ids.includes(key)) {
            delete internaltable[key];
        }
    };
}

/**
 * Sends the client-side table updates to the database.
 */
async function clientToDB() {
    const newItem = {
        name: "First Reaction",
        description: doodlecontent
    };
    
    fetch('http://localhost:3000/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem)
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
}

