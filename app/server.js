const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'user',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'app_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Create reactions table if it doesn't exist
const createTableReactionsQuery = `
  CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    doodle TEXT
  );
`;

// Create molecules table if it doesn't exist
const createTableMoleculesQuery = `
  CREATE TABLE IF NOT EXISTS molecules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    smiles TEXT
  );
`;

// Create molecule_reactions table if it doesn't exist
const createTableMoleculeReactionsQuery = `
  CREATE TABLE IF NOT EXISTS molecule_reactions (
    molecule_id INT REFERENCES molecules(id),
    reaction_id INT REFERENCES reactions(id),
    PRIMARY KEY (molecule_id, reaction_id)
  );
`;

pool.query(createTableReactionsQuery)
  .then(() => console.log('Table "reactions" is ready'))
  .catch(err => console.error('Error creating table:', err));

pool.query(createTableMoleculesQuery)
  .then(() => console.log('Table "molecules" is ready'))
  .catch(err => console.error('Error creating table:', err));

pool.query(createTableMoleculeReactionsQuery)
  .then(() => console.log('Table "molecule_reactions" is ready'))
  .catch(err => console.error('Error creating table:', err));

// Endpoint API

app.use(express.text());  // Add this to handle raw text payloads

app.post("/get_details", async (req, res) => {
  const molfile = req.body;  // Since we're sending plain text, req.body contains the string directly

  if (!molfile) {
    return res.status(400).json({ error: "No Molfile provided" });
  }

  try {
    const response = await fetch('http://rdkit-server:5000/get_iupac', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: molfile,
    });

    const data = await response.json();  // Parse JSON response from Flask

    if (response.ok) {
      return res.json(data);  // Forward the entire JSON to the website
    } else {
      return res.status(500).json({ error: data.error || "Unknown error from RDKit server" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Getting all reactions
app.get('/reactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reactions');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if an reaction exists and update it if so, otherwise insert a new reaction
app.post('/reactions/upsert', async (req, res) => {
  const { id, name, description } = req.body;

  try {
    // Check if the item exists
    const checkResult = await pool.query('SELECT * FROM reactions WHERE id = $1', [id]);

    if (checkResult.rowCount > 0) {
      // Item exists, update it
      const updateResult = await pool.query(
        'UPDATE reactions SET name = $1, description = $2 WHERE id = $3 RETURNING *',
        [name, description, id]
      );

      return res.status(200).json({ message: 'Item updated', item: updateResult.rows[0] });
    } else {
      // Item does not exist, insert a new item
      const insertResult = await pool.query(
        'INSERT INTO reactions (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );

      return res.status(201).json({ message: 'New item inserted', item: insertResult.rows[0] });
    }
  } catch (err) {
    console.error('Error upserting item:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// seach smiles in database, if it is there get the name, add relation, if its not, add the entry to molecules and add relation
app.post('/molecules/upsert', async (req, res) => {
  const { mol_name, smiles } = req.body;

  try {
    const checkResult = await pool.query('SELECT * FROM molecules WHERE smiles = $1', [smiles]);

    if (checkResult.rowCount > 0) {
      // Item exists, get its name
      const mol_name = checkResult.rows[0].name;

      return res.status(200).json({ message: 'Item exists', mol_name });
    } else {
      // Item does not exist, insert a new item, with the name
      // create the id, lowest unoccupied number
      const idResult = await pool.query('SELECT id FROM molecules');
      const idList = idResult.rows.map(row => row.id);
      let id = 1;
      while (idList.includes(id)) {
        id++;
      }
      const insertResult = await pool.query(
        'INSERT INTO molecules (id, name, smiles) VALUES ($1, $2, $3) RETURNING *',
        [id, mol_name, smiles]
      );

      const moleculeId = insertResult.rows[0].id;

      return res.status(201).json({ message: 'New item inserted', mol_name });
    }
  } catch (err) {
    console.error('Error upserting item:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});