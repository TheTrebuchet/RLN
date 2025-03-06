document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/items';
});

var internaltable = {}

sketcher.oldFunc = sketcher.click;
sketcher.click = function (force) {
    console.log('refresh')
    sketcher.oldFunc(force);
    schemeToInternal(internaltable).then(() =>{
    internalToClient(internaltable);})
    //clientToDB(internaltable)

    // THIS PART IS FOR TESTING
    // const tableBody = document.querySelector("#molecule-table tbody");
    // let row = document.createElement("tr");
    //         row.innerHTML = `<td>${'test'}</td>`;
    // tableBody.appendChild(row);


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


function internalToClient(internaltable) {
    const tableBody = document.querySelector("#molecule-table tbody");

    for (let [key, data] of Object.entries(internaltable)) {
        console.log(data)
        let row = tableBody.querySelector(`tr[data-key="${key}"]`);
        if (row) {
            // Update row with new values
            row.innerHTML = `
                <td contenteditable="true">${data.iupac_name.value}</td>
                <td contenteditable="true">${data.mass.value}</td>
                <td>${parseFloat(data.molecular_weight.value).toFixed(2)}</td>
                <td contenteditable="true">${data.equivalents.value}</td>
                <td contenteditable="true">${data.density.value}</td>
            `;
        } else {
            // If row doesn't exist, create it
            row = document.createElement("tr");
            row.setAttribute("data-key", key);
            row.innerHTML = `
                <td contenteditable="true">${data.iupac_name.value}</td>
                <td contenteditable="true">${data.mass.value}</td>
                <td>${data.molecular_weight.value.toFixed(2)}</td>
                <td contenteditable="true">${data.equivalents.value}</td>
                <td contenteditable="true">${data.density.value}</td>
            `;
            tableBody.appendChild(row);
        }
    };

};

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

        const properties = ['iupac_name', 'mass', 'molecular_weight', 'equivalents', 'density']; // Properties to check and update

        if (row) {
            console.log('new row')
            properties.forEach(property => { // for every property in a row
                console.log(property)
                const clientValue = row.children[properties.indexOf(property)].innerText.trim(); //get client value
                console.log(clientValue)
                if (property == 'molecular_weight') { 
                    internaltable[key][property].value = data[property];
                }
                else if (internaltable[key][property].value !== clientValue) { // if client modified it
                    internaltable[key][property].value = clientValue; //set client value and modified true
                    internaltable[key][property].modified = true;

                } else if (!internaltable[key][property].modified) { // if not modified, update
                    internaltable[key][property].modified = false
                    internaltable[key][property].value = data[property];
                } else if (!clientValue) { //THIS ONLY WORKS AFTER SECOND TIME FUNCTION RUNS?
                    internaltable[key][property].modified = false
                    internaltable[key][property].value = data[property]
                }

    })
        } else { // create the entry in internal
            internaltable[key] = {
                iupac_name: { value: data.iupac_name, modified: false },
                mass: { value: data.mass, modified: false },
                molecular_weight: { value: data.molecular_weight, modified: false },
                equivalents: { value: data.equivalents, modified: false },
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



