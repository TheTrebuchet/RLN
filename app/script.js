document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/items';
});

var internaltable = {}

const table = document.getElementById("molecule-table"); // Replace with your actual table ID

table.addEventListener("blur", function (event) {
    if (event.target.matches("td[contenteditable='true']")) {
        handleEdit(event.target);
    }
}, true); // Use capture mode to catch blur events properly

table.addEventListener("keydown", function (event) {
    if (event.target.matches("td[contenteditable='true']") && event.key === "Enter") {
        event.preventDefault(); // Prevent new lines
        event.target.blur(); // Trigger blur event
    }
});

function handleEdit(cell) {
    const row = cell.parentElement; // <tr>
    const table = row.parentElement; // <tbody> or <table> if no <tbody>
    const columnIndex = cell.cellIndex; // Get column number
    // Assuming first column contains row keys
    const columnName = document.querySelector(`#molecule-table thead tr`).cells[columnIndex].innerText.trim();
    console.log(row, row.getAttribute("data-key"), columnName)
    
    const newValue = cell.innerText.trim();
    if (newValue === "") {
        internaltable[row.getAttribute("data-key")][columnName].modified = false;
        internaltable[row.getAttribute("data-key")][columnName].value = getDefault(columnName);
    } else {
        internaltable[row.getAttribute("data-key")][columnName].value = newValue;
        internaltable[row.getAttribute("data-key")][columnName].modified = true;
    }

    recalculate(internaltable);
    internalToClient(internaltable);

    console.log(internaltable)
}

function getDefault(property) {
    switch (property) {
        case 'equivalents':
            return 1.0;
        case 'mass':
        case 'moles':
        case 'volume':
            return 0.0;
        default:
            return '';
    }
}

sketcher.oldFunc = sketcher.click;
sketcher.click = function (force) {
    console.log('refresh')
    sketcher.oldFunc(force);
    schemeToInternal(internaltable).then(() =>{
    recalculate(internaltable);
    internalToClient(internaltable);})
};

function clientToDB() {
    // the clientside table is read for updates and sent to DB
}

function recalculate(internaltable) { 

    let ref_mole = 0;
    for (let [key, data] of Object.entries(internaltable)) {
        if (data.moles.modified) {
            ref_mole = data.moles.value / data.equivalents.value;
            break;
        }
        else if (data.mass.modified) {
            ref_mole = data.mass.value / data.molecular_weight.value / data.equivalents.value;
            break;
        }
        else if (data.volume.modified && data.density.value) {
            ref_mole = data.volume.value * data.density.value / data.molecular_weight.value / data.equivalents.value;
            break;
        }
    }

    // check if exactly one of moles, mass, volume was modified, if so, calculate the rest
    for (let [key, data] of Object.entries(internaltable)) {
        if (!data.mass.value || !data.mass.modified) { data.mass.value = ref_mole * data.molecular_weight.value * data.equivalents.value }
        if (!data.moles.value || !data.moles.modified) { data.moles.value = ref_mole * data.equivalents.value }
        if ((!data.volume.value || !data.volume.modified) && data.density.value) { data.volume.value = ref_mole * data.molecular_weight.value * data.equivalents.value / data.density.value }
    }
}


function internalToClient(internaltable) {
    const tableBody = document.querySelector("#molecule-table tbody");

    for (let [key, data] of Object.entries(internaltable)) {
        let row = tableBody.querySelector(`tr[data-key="${key}"]`);
        const rowContent = `
            <td contenteditable="true">${data.iupac_name.value}</td>
            <td contenteditable="true">${data.mass.value}</td>
            <td>${parseFloat(data.molecular_weight.value).toFixed(2)}</td>
            <td contenteditable="true">${data.moles.value}</td>
            <td contenteditable="true">${data.equivalents.value}</td>
            <td contenteditable="true">${data.volume.value}</td>
            <td contenteditable="true">${data.density.value}</td>
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
}

async function schemeToInternal(internaltable) {
    //filling promisetable with contents from server
    let promisetable = {}
    const arrayMolecules = sketcher.getMolecules();
    arrayMolecules.forEach((mol, index) => {
        let molFile = ChemDoodle.writeMOL(mol);
        let details = molDetails(molFile);
        promisetable[`reagent${index}`] = details;
    })
    // building internaltable from here, while checking for changes in internal
    // for now the modified status will be set here,
    // but later it should be set on trigger in a different function
    const tableBody = document.querySelector("#molecule-table tbody");

    const keys = Object.keys(promisetable);
    const promises = keys.map(key => promisetable[key]);
    const resolvedValues = await Promise.all(promises);

    resolvedValues.forEach((data, index) => { // for every reagent
        const key = keys[index]; // Get the corresponding reagent key (e.g., "reagent1")
        let row = tableBody.querySelector(`tr[data-key="${key}"]`); //get the row, if exists

        const properties = ['iupac_name', 'mass', 'molecular_weight', 'moles' ,'equivalents', 'volume', 'density']; // Properties to build

        if (row) {
            properties.forEach(property => { // for every property in a row
                var clientValue = row.children[properties.indexOf(property)].innerText.trim(); //get client value
                // try to make clientValue float if it is a number
                if (['mass', 'moles', 'equivalents', 'volume', 'density'].includes(property)) {
                    clientValue = parseFloat(clientValue);
                }
                if (!clientValue) { // Check for empty client value first
                    internaltable[key][property].modified = false;
                    internaltable[key][property].value = getDefault(property);
                } else if (property == 'molecular_weight') { //this should be only updated, no check for client
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
            }
        }
    });
};

function clientUpdate() {
    // this should update the table after the user interacts with it
};

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



