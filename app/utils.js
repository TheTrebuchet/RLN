/**
 * Returns the default value for a given property.
 * @param {string} property - The property name.
 * @returns {*} The default value for the property.
 */
export function getDefault(property) {
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

/**
 * Fetches molecule details from the server.
 * @param {string} molfile - The molecule file in MOL format.
 * @returns {Promise<Object>} The molecule details.
 */
export async function molDetails(molfile) {
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
            
        }
    } catch (error) {
        
    }
}

/**
 * Recalculates the values in the internal table based on modified properties.
 * @param {Object} internaltable - The internal table containing molecule data.
 */
export function recalculate(internaltable) {

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